// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';

// *** Hard-wire your socket URL so there is zero ambiguity ***
const SOCKET_URL = 'https://snapchaos-socket.onrender.com';

export default function Lobby() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [makingRoom, setMakingRoom] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const createRoom = async () => {
    setError('');
    setMakingRoom(true);
    try {
      const { io } = await import('socket.io-client');

      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        path: '/socket.io',
      });

      await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
      });

      socket.emit('create_room', { name: name || 'Host' }, (ack) => {
        if (!ack || !ack.code) {
          setError(ack?.error || 'No room code returned.');
          socket.disconnect();
          setMakingRoom(false);
          return;
        }
        const roomCode = ack.code.toUpperCase();
        socket.disconnect();
        router.push(`/room/${roomCode}?name=${encodeURIComponent(name || 'Host')}&host=1`);
      });
    } catch (e) {
      setError(`Could not connect to socket server. ${e?.message || e}`);
      setMakingRoom(false);
    }
  };

  const joinRoom = () => {
    if (!code) return;
    router.push(`/room/${code.toUpperCase()}?name=${encodeURIComponent(name || 'Player')}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold">SnapChaos</h1>
        <p className="text-slate-300">
          Phone-first party photo game. Two modes: <span className="badge">Hot Potato</span> &{' '}
          <span className="badge">Prompt Showdown</span>.
        </p>

        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button className="btn w-full" onClick={createRoom} disabled={makingRoom}>
          {makingRoom ? 'Creating…' : 'Create Room'}
        </button>

        <div className="flex gap-2 items-center">
          <input
            className="input flex-1"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn" onClick={joinRoom}>Join</button>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <div className="text-xs text-slate-400">
          Socket URL in use: <code>{SOCKET_URL}</code>
        </div>
      </div>
    </div>
  );
}