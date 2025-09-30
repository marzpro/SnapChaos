import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SocketProvider, { useSocket } from '../../components/SocketProvider';
import CameraInput from '../../components/CameraInput';

function RoomInner() {
  const { socket, ready } = useSocket();
  const router = useRouter();
  const { code } = router.query;
  const [me, setMe] = useState({ name: '', sid: '' });
  const [room, setRoom] = useState(null);
  const [phase, setPhase] = useState('lobby'); // lobby | playing | reveal
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState('showdown'); // 'hot' | 'showdown'
  const [prompt, setPrompt] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [tally, setTally] = useState({});
  const [winners, setWinners] = useState([]);
  const [scores, setScores] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ready || !code) return;
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || 'Guest';
    setMe((m)=>({ ...m, name }));
    socket.emit('join_room', { code, name }, (res) => {
      setRoom(res.room);
      setMe((m)=>({ ...m, sid: socket.id }));
    });

    socket.on('room_update', setRoom);
    socket.on('round_started', ({ round, mode, prompt, deadline }) => {
      setRound(round); setMode(mode); setPrompt(prompt); setDeadline(deadline);
      setPhase('playing'); setSubmissions([]); setChosen(null); setTally({}); setWinners([]);
    });
    socket.on('submission_update', ({ count }) => {});
    socket.on('round_results', ({ prompt, submissions, votes, winners, scores }) => {
      setPrompt(prompt); setSubmissions(shuffle(submissions)); setTally(votes); setWinners(winners); setScores(scores); setPhase('reveal');
    });

    return () => {
      socket.off('room_update');
      socket.off('round_started');
      socket.off('submission_update');
      socket.off('round_results');
    };
  }, [ready, code]);

  const isHost = room && room.hostId === me.sid;
  const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setTick((t)=>t+1), 250);
    return () => clearInterval(id);
  }, [deadline]);

  const startRound = (m) => {
    socket.emit('start_round', { code, mode: m, durationSec: m === 'hot' ? 20 : 30 });
  };

  const submitPhoto = (dataURL) => {
    socket.emit('submit_photo', { code, dataURL });
  };

  const voteBest = (sid) => {
    setChosen(sid);
    socket.emit('vote_best', { code, targetSid: sid });
  };

  const flagLazy = (sid) => {
    socket.emit('flag_lazy', { code, targetSid: sid });
  };

  const endRound = () => {
    socket.emit('end_round', { code });
  };

  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Room {code}</div>
        <div className="text-sm opacity-80">You: {me.name}{isHost && ' (Host)'} · Players: {room?.players?.length || 0}</div>
      </div>

      {phase === 'lobby' && (
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Lobby</h2>
          <PlayerList room={room} me={me} />
          {isHost && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn" onClick={()=>startRound('hot')}>Start Hot Potato</button>
              <button className="btn" onClick={()=>startRound('showdown')}>Start Prompt Showdown</button>
            </div>
          )}
          {!isHost && <p className="text-slate-400">Waiting for host to start…</p>}
        </div>
      )}

      {phase === 'playing' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="badge">Round {round} · {mode === 'hot' ? 'Hot Potato' : 'Prompt Showdown'}</div>
              <div className="badge">⏳ {remaining}s</div>
            </div>
            <h2 className="text-xl font-semibold">Prompt</h2>
            <p className="text-lg">{prompt}</p>
            <CameraInput onCapture={submitPhoto} />
            {isHost && (
              <button className="btn w-full" onClick={endRound}>End Round (Host)</button>
            )}
          </div>
          <div className="card space-y-3">
            <h3 className="font-semibold">How to score (Showdown):</h3>
            <ul className="list-disc pl-6 text-sm text-slate-300 space-y-1">
              <li>Submit on time: +1</li>
              <li>Win best photo vote: +2</li>
              <li>No submission: −2</li>
              <li>Lazy shot rejected by majority: −2</li>
            </ul>
            <PlayerList room={room} me={me} compact />
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="badge">Reveal · {prompt}</div>
              {isHost && <button className="btn" onClick={()=>startRound(mode)}>Next Round</button>}
            </div>
          </div>
          <SubmissionGrid submissions={submissions} chosen={chosen} voteBest={voteBest} flagLazy={flagLazy} />
          <div className="card">
            <h3 className="font-semibold mb-2">Scores</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {scores.map((p)=> (
                <div key={p.sid} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
                  <span>{p.name}</span>
                  <span className="font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionGrid({ submissions, chosen, voteBest, flagLazy }){
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
      {submissions.map((s) => (
        <div key={s.sid} className={`card space-y-2 ${chosen===s.sid ? 'ring-2 ring-brand-500' : ''}`}>
          <img src={s.dataURL} alt="submission" className="w-full h-48 object-cover rounded-lg"/>
          <div className="flex gap-2">
            <button className="btn flex-1" onClick={()=>voteBest(s.sid)}>Vote Best</button>
            <button className="btn flex-1 bg-red-600 hover:bg-red-500" onClick={()=>flagLazy(s.sid)}>Reject Lazy</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerList({ room }) {
  if (!room) return null;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {room.players?.map((p)=> (
          <div key={p.sid} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
            <span className="truncate">{p.name}</span>
            <span className="text-slate-300">{p.score ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shuffle(arr){ return arr.slice().sort(()=>Math.random()-0.5); }

export default function Room() {
  return (
    <SocketProvider>
      <RoomInner />
    </SocketProvider>
  );
}