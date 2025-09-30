// pages/room/[code].js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080'; // https://snapchaos-socket.onrender.com

export default function Room() {
  const router = useRouter();
  const { code, name = 'Player', host } = useMemo(() => {
    const q = router.query || {};
    return {
      code: q.code,
      name: typeof q.name === 'string' ? q.name : 'Player',
      host: q.host === '1',
    };
  }, [router.query]);

  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('lobby'); // 'lobby' | 'playing'
  const [status, setStatus] = useState('Waiting for players…');
  const socketRef = useRef(null);

  // --- connect & join ---
  useEffect(() => {
    if (!code) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('join_room', { code, name }, (ack) => {
        // optional ack handler from server
        // console.log('join_room ack:', ack);
      });
    };

    const onConnectError = (err) => {
      setStatus(`Socket connect error: ${err?.message || err}`);
    };

    // room updates from server
    const onPlayerList = (list) => setPlayers(list || []);
    const onGameStarted = (payload) => {
      setPhase('playing');
      setStatus('Game started! 📸 Get ready…');
      // If you already have round data coming in, you can store it here:
      // setRound(payload.round);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('player_list', onPlayerList);
    socket.on('game_started', onGameStarted);

    // helpful debug in case something is off:
    socket.onAny((event, ...args) => {
      // console.log('[socket event]', event, args);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('player_list', onPlayerList);
      socket.off('game_started', onGameStarted);
      socket.disconnect();
    };
  }, [code, name]);

  const startGame = () => {
    if (!socketRef.current || !connected) return;
    setStatus('Starting game…');
    socketRef.current.emit('start_game', { code }, (ack) => {
      // optional: if your server returns an ack, show errors here
      if (ack && ack.error) setStatus(`Could not start: ${ack.error}`);
    });
  };

  const leave = () => router.replace('/');

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="card w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Room {String(code || '').toUpperCase()}</h2>
          <button className="btn secondary" onClick={leave}>Leave</button>
        </div>

        <div className="rounded-lg bg-slate-800/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">
                Players: {players.length ? players.join(', ') : '—'}
              </div>
              <div className="text-sm text-slate-300 mt-1">
                {status}
              </div>
            </div>

            {host && phase === 'lobby' && (
              <button className="btn" onClick={startGame} disabled={!connected}>
                Start Game
              </button>
            )}
          </div>
        </div>

        {phase === 'playing' && (
          <div className="rounded-lg bg-slate-800/60 p-4">
            <p className="text-lg">
              🎉 Game is live! (You’ll wire in the real round UI next.)
            </p>
            <p className="text-sm text-slate-300 mt-2">
              If you don’t see this on all devices, the socket events aren’t reaching them — tell me and I’ll adjust the server/client event names.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}