// /pages/room/[code].js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getSocket } from "../../lib/socket";

export default function Room() {
  const router = useRouter();
  const { code } = router.query;
  const name = useMemo(
    () => (router.query.name ? String(router.query.name) : "Player"),
    [router.query.name]
  );
  const isHost = useMemo(() => router.query.host === "1", [router.query.host]);

  const [socketOk, setSocketOk] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [lastEvent, setLastEvent] = useState("");

  useEffect(() => {
    if (!code) return;

    let mounted = true;

    (async () => {
      const socket = await getSocket();
      if (!socket || !mounted) return;
      setSocketOk(true);

      const onRoomUpdate = (data) => {
        if (!mounted) return;
        setLastEvent("room_update");
        setPlayers(data.players || []);
        setPhase(data.phase || "lobby");
      };
      const onGameStarted = () => {
        if (!mounted) return;
        setLastEvent("game_started");
        setPhase("playing");
      };

      socket.on("room_update", onRoomUpdate);
      socket.on("game_started", onGameStarted);

      // Host already created the room with this SAME socket (from lobby).
      // If this is a player, join now.
      if (!isHost) {
        socket.emit(
          "join_room",
          { code: String(code).toUpperCase(), name },
          (resp) => {
            if (resp?.error) alert(resp.error);
          }
        );
      } else {
        // Ask for current room state so host sees players immediately
        socket.emit("get_room_state", { code: String(code).toUpperCase() });
      }

      return () => {
        socket.off("room_update", onRoomUpdate);
        socket.off("game_started", onGameStarted);
      };
    })();

    return () => {
      mounted = false;
    };
  }, [code, name, isHost]);

  const startGame = async () => {
    const socket = await getSocket();
    if (!socket) return alert("Not connected to server");
    socket.emit(
      "start_game",
      { code: String(code).toUpperCase() },
      (resp) => resp?.error && alert(resp.error)
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-[#0B1220] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Room {String(code || "").toUpperCase()}</h2>
          <button
            onClick={() => router.push("/")}
            className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5"
          >
            Leave
          </button>
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2">
          <div className="font-semibold">Players: {players.length ? players.join(", ") : "—"}</div>
          <div className="text-sm text-slate-300">
            {phase === "lobby" && (isHost ? "Waiting for players…" : "Waiting for host…")}
            {phase === "playing" && "Game started!"}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Socket: {process.env.NEXT_PUBLIC_SOCKET_URL} {socketOk ? "✅" : "❌"}
            <br />
            connected • last event: {lastEvent || "—"}
          </div>
        </div>

        {isHost && phase === "lobby" && (
          <button
            onClick={startGame}
            className="w-full rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}