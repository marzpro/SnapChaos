// pages/index.js
import { useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

export default function Lobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  const createRoom = async () => {
    try {
      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
      });
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Socket timeout")), 7000);
        socket.on("connect", () => {
          clearTimeout(t);
          resolve();
        });
        socket.on("connect_error", (e) => {
          clearTimeout(t);
          reject(e);
        });
      });

      socket.emit("create_room", { name: name || "Host" }, ({ code, error }) => {
        if (error) {
          alert(error);
          socket.disconnect();
          return;
        }
        socket.disconnect();
        router.push(`/room/${code}?name=${encodeURIComponent(name || "Host")}`);
      });
    } catch (err) {
      console.error(err);
      alert("Could not create room. Please try again.");
    }
  };

  const joinRoom = () => {
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) {
      alert("Enter a room code first.");
      return;
    }
    router.push(`/room/${trimmed}?name=${encodeURIComponent(name || "Guest")}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b1020] text-white">
      <div className="w-full max-w-md space-y-6 bg-[#121938] rounded-2xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold">SnapChaos</h1>
        <p className="text-slate-300">
          Phone-first party photo game. Two modes:{" "}
          <span className="px-2 py-1 rounded bg-blue-600/20">Hot Potato</span>{" "}
          &{" "}
          <span className="px-2 py-1 rounded bg-purple-600/20">
            Prompt Showdown
          </span>
          .
        </p>

        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 p-3 outline-none focus:border-white/30"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 p-3 font-semibold"
          onClick={createRoom}
        >
          Create Room
        </button>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-black/30 border border-white/10 p-3 outline-none focus:border-white/30"
            placeholder="Enter code (e.g. ABCD)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 font-semibold"
            onClick={joinRoom}
          >
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