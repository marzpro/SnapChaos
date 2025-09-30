// pages/room/[code].js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';

// *** Hard-wire your socket URL so there is zero ambiguity ***
const SOCKET_URL = 'https://snapchaos-socket.onrender.com';

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
  const [lastEvent, setLastEvent] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!code) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setStatus('Connected. Joining room…');
      socket.emit('join_room', { code, name }, (ack) => {
        if (ack?.error) setStatus(`Join failed: ${ack.error}`);
      });
    };

    const onConnectError = (err) => {
      setConnected(false);
      setStatus(`Socket connect error: ${err?.message || err}`);
    };

    const onDisconnect = () => {
      setConnected(false);
      setStatus('Disconnected from socket.');
    };

    const onPlayerList = (list) => {
      setPlayers(list || []);
      setStatus(list?.length ? 'All players connected.' : 'Waiting for players…');
      setLastEvent('player_list');
    };

    const onGameStarted = () => {
      setPhase('playing');
      setStatus('Game started! 📸');
      setLastEvent('game_started');
    };

    const onRoomState = (state) => {
      // optional event if your server emits it
      if (state?.players) setPlayers(state.players);
      if (state?.phase) setPhase(state.phase);
      setLastEvent('room_state');
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('player_list', onPlayerList);
    socket.on('game_started', onGameStarted);
    socket.on('room_state', onRoomState);

    // tiny debug hook
    socket.onAny((event) => setLastEvent(event));

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('player_list', onPlayerList);
      socket.off('game_started', onGameStarted);
      socket.off('room_state', onRoomState);
      socket.disconnect();
    };
  }, [code, name]);

  const startGame = () => {
    if (!socketRef.current || !connected) return;
    setStatus('Starting game…');
    socketRef.current.emit('start_game', { code }, (ack) => {
      if (ack?.error) setStatus(`Could not start: ${ack.error}`);
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
              <div className="text-sm text-slate-300 mt-1">{status}</div>
              <div className="text-xs text-slate-400 mt-1">
                Socket: <code>{SOCKET_URL}</code> • {connected ? '✅ connected' : '❌ not connected'} • last event: <code>{lastEvent || '—'}</code>
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
            <p className="text-lg">🎉 Game is live! (Round UI comes next.)</p>
          </div>
        )}
      </div>
    </div>
  );
}