// pages/index.js
import { useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "https://snapchaos-socket.onrender.com";

export default function Lobby() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    try {
      setBusy(true);
      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
      });
      await new Promise((res, rej) => {
        socket.on("connect", res);
        socket.on("connect_error", rej);
      });

      socket.emit(
        "create_room",
        { name: name || "Host" },
        ({ code: roomCode, error }) => {
          if (error) {
            alert(error);
            socket.disconnect();
            setBusy(false);
            return;
          }
          socket.disconnect();
          router.push(`/room/${roomCode}?name=${encodeURIComponent(name || "Host")}`);
        }
      );
    } catch (e) {
      console.error(e);
      alert("Could not connect to the game server.");
      setBusy(false);
    }
  };

  const joinRoom = () => {
    const c = (code || "").trim().toUpperCase();
    if (!c) return alert("Enter a room code");
    router.push(`/room/${c}?name=${encodeURIComponent(name || "Player")}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f172a] p-6 shadow">
        <h1 className="text-3xl font-bold text-white">SnapChaos</h1>
        <p className="mt-2 text-slate-300">
          Phone-first party photo game. Two modes:{" "}
          <span className="px-2 py-0.5 rounded bg-slate-800">Hot Potato</span> &{" "}
          <span className="px-2 py-0.5 rounded bg-slate-800">Prompt Showdown</span>.
        </p>

        <input
          className="mt-6 w-full rounded-lg bg-slate-800 text-white px-3 py-2 outline-none"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          className="mt-4 w-full rounded-lg bg-blue-600 text-white py-2 font-medium disabled:opacity-60"
          onClick={createRoom}
          disabled={busy}
        >
          {busy ? "Creating…" : "Create Room"}
        </button>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-lg bg-slate-800 text-white px-3 py-2 outline-none"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium"
            onClick={joinRoom}
          >
            Join
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Host on a TV/laptop. Players join with the room code on their phones.
        </p>
      </div>
    </div>
  );
}