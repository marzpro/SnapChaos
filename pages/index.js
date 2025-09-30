// pages/index.js
import { useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";

export default function Lobby() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();

  const createRoom = async () => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
    });
    await new Promise((res) => socket.on("connect", res));
    socket.emit("create_room", { name }, ({ code }) => {
      socket.disconnect();
      // mark this browser as host with ?host=1
      router.push(
        `/room/${code}?name=${encodeURIComponent(name || "Host")}&host=1`
      );
    });
  };

  const joinRoom = () => {
    if (!code) return;
    router.push(
      `/room/${code.toUpperCase()}?name=${encodeURIComponent(
        name || "Guest"
      )}`
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold">SnapChaos</h1>
        <p className="text-slate-300">
          Phone-first party photo game. Two modes:{" "}
          <span className="badge">Hot Potato</span> &{" "}
          <span className="badge">Prompt Showdown</span>.
        </p>
        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={createRoom}>
            Create Room
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="input flex-1"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="btn" onClick={joinRoom}>
            Join
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Open on a TV/laptop for the host screen. Players join with the room
          code on their phones.
        </p>
      </div>
    </div>
  );
}