import { useState } from 'react';
import { useRouter } from 'next/router';
import SocketProvider from '../components/SocketProvider';

function LobbyInner() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const router = useRouter();

  const createRoom = async () => {
    await fetch('/api/socket'); // ensure server is ready
    const { io } = await import('socket.io-client');
    const socket = io({ path: '/api/socket' });
    await new Promise((r)=>socket.on('connect', r));
    socket.emit('create_room', { name }, ({ code }) => {
      socket.disconnect();
      router.push(`/room/${code}?name=${encodeURIComponent(name || 'Host')}`);
    });
  };

  const joinRoom = () => {
    if (!code) return;
    router.push(`/room/${code.toUpperCase()}?name=${encodeURIComponent(name || 'Guest')}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold">SnapChaos</h1>
        <p className="text-slate-300">Phone‑first party photo game. Two modes: <span className="badge">Hot Potato</span> & <span className="badge">Prompt Showdown</span>.</p>
        <input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={createRoom}>Create Room</button>
        </div>
        <div className="flex gap-2 items-center">
          <input className="input flex-1" placeholder="Enter code" value={code} onChange={e=>setCode(e.target.value)} />
          <button className="btn" onClick={joinRoom}>Join</button>
        </div>
        <p className="text-xs text-slate-400">Open on a TV/laptop for the host screen. Players join with the room code on their phones.</p>
      </div>
    </div>
  );
}

export default function Lobby() {
  return (
    <SocketProvider>
      <LobbyInner />
    </SocketProvider>
  );
}