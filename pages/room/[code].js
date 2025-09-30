// pages/room/[code].js
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";

export default function Room() {
  const router = useRouter();
  const { code } = router.query;
  const name = (router.query.name || "Player").toString();
  const isHost = router.query.host === "1";

  const [room, setRoom] = useState({ started: false, players: [] });
  const socketRef = useRef(null);

  useEffect(() => {
    if (!code) return;
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      path: "/socket.io",
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit(
        "join_room",
        { code, name, isHost },
        (_err, state) => state && setRoom(state)
      );
    });

    s.on("room_update", (state) => setRoom(state));
    s.on("game_started", () => setRoom((r) => ({ ...r, started: true })));

    return () => s.disconnect();
  }, [code, name, isHost]);

  const startGame = () => {
    socketRef.current?.emit("start_game", { code }, (err) => {
      if (err) alert(err.message || "Only the host can start the game.");
    });
  };

  return (
    <div className="min-h-screen p-4">
      <div className="card max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-semibold">Room {code}</h2>
        <div className="flex justify-between items-center">
          <div>Players: {room.players.map((p) => p.name).join(", ") || "-"}</div>
          {isHost && !room.started && (
            <button className="btn" onClick={startGame}>
              Start Game
            </button>
          )}
        </div>

        {!room.started ? (
          <p className="text-slate-300">
            {isHost ? "Waiting for players..." : "Waiting for host to start..."}
          </p>
        ) : (
          <p className="text-green-400">Game started! 🎉</p>
        )}
      </div>
    </div>
  );
}