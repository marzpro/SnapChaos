// /pages/index.js
import { useState } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../lib/socket";

export default function Lobby() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    setBusy(true);
    const socket = await getSocket();
    if (!socket) {
      alert("Could not connect to the game server.");
      setBusy(false);
      return;
    }
    socket.emit("create_room", { name: name || "Host" }, ({ code }) => {
      // IMPORTANT: do NOT disconnect; keep the same socket id for the host
      router.push(`/room/${code}?name=${encodeURIComponent(name || "Host")}&host=1`);
    });
  };

  const joinRoom = async () => {
    if (!code) return;
    router.push(`/room/${code.toUpperCase()}?name=${encodeURIComponent(name || "Player")}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-[#0B1220] border border-white/10 p-6 space-y-5">
        <h1 className="text-3xl font-bold">SnapChaos</h1>
        <p className="text-slate-300">
          Phone-first party photo game. Two modes:{" "}
          <span className="px-2 py-0.5 rounded bg-white/10">Hot Potato</span> &{" "}
          <span className="px-2 py-0.5 rounded bg-white/10">Prompt Showdown</span>.
        </p>

        <input
          className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 outline-none"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          className="w-full rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold"
          disabled={busy}
          onClick={createRoom}
        >
          {busy ? "Creating…" : "Create Room"}
        </button>

        <div className="flex gap-2 items-center">
          <input
            className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 outline-none"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold"
            onClick={joinRoom}
          >
            Join
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Open on a TV/laptop for the host screen. Players join with the room code on their phones.
        </p>
      </div>
    </div>
  );
}