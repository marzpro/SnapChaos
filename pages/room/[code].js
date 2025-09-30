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
  const [players, setPlayers] = useState([]);     // raw payload
  const [phase, setPhase] = useState("lobby");
  const [lastEvent, setLastEvent] = useState("");
  const [lastError, setLastError] = useState("");

  // Safely convert whatever we got into a list of names for display
  const playerNames = useMemo(() => {
    return (players || []).map((p) =>
      typeof p === "string" ? p : (p?.name ?? "Player")
    );
  }, [players]);

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
        setPlayers(data?.players ?? []);
        setPhase(data?.phase ?? "lobby");
      };
      const onGameStarted = () => {
        if (!mounted) return;
        setLastEvent("game_started");
        setPhase("playing");
      };

      socket.on("room_update", onRoomUpdate);
      socket.on("game_started", onGameStarted);

      if (!isHost) {
        // Join as player
        socket.emit(
          "join_room",
          { code: String(code).toUpperCase(), name },
          (resp) => {
            if (resp?.error) setLastError(resp.error);
          }
        );
      } else {
        // Host asks for current state
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
    setLastError("");
    const socket = await getSocket();
    if (!socket) {
      setLastError("Not connected to server");
      return;
    }
    socket.emit(
      "start_game",
      { code: String(code).toUpperCase() },
      (resp) => {
        if (resp?.error) {
          setLastError(resp.error);        // <- show why it didn’t start
        } else {
          // server will also emit "game_started" which flips phase for everyone
          setLastEvent("start_game_ok");
        }
      }
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
          <div className="font-semibold">
            Players: {playerNames.length ? playerNames.join(", ") : "—"}
          </div>
          <div className="text-sm text-slate-300">
            {phase === "lobby" && (isHost ? "Waiting for players…" : "Waiting for host…")}
            {phase === "playing" && "Game started!"}
          </div>

          <div className="text-xs text-slate-400 mt-2">
            Socket: {process.env.NEXT_PUBLIC_SOCKET_URL} {socketOk ? "✅" : "❌"}<br/>
            role: {isHost ? "host" : "player"} • phase: {phase} • last event: {lastEvent || "—"}
            {lastError ? (
              <>
                <br />⚠️ <span className="text-red-300">{lastError}</span>
              </>
            ) : null}
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