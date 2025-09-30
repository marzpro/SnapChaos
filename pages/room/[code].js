// pages/room/[code].js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

// ---- socket singleton (client) ---------------------------------------------
let socketPromise = null;
async function getSocket() {
  if (typeof window === "undefined") return null; // SSR guard
  if (socketPromise) return socketPromise;

  socketPromise = new Promise(async (resolve) => {
    const { io } = await import("socket.io-client");

    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "https://snapchaos-socket.onrender.com";

    const socket = io(url, {
      transports: ["websocket"],
      withCredentials: false,
    });

    const onConnect = () => {
      socket.off("connect_error", onErr);
      resolve(socket);
    };
    const onErr = (err) => {
      console.warn("socket connect_error", err?.message || err);
      // still resolve so callers can proceed; they will see socket.connected=false
      resolve(socket);
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onErr);
  });

  return socketPromise;
}
// ---------------------------------------------------------------------------

export default function RoomPage() {
  const router = useRouter();
  const code = useMemo(
    () => String(router.query.code || "").toUpperCase(),
    [router.query.code]
  );
  const name = useMemo(
    () => (router.query.name ? String(router.query.name) : "Player"),
    [router.query.name]
  );
  const isHost = useMemo(() => {
    const v = String(router.query.host || "");
    return v === "1" || v.toLowerCase() === "true";
  }, [router.query.host]);

  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [socketOk, setSocketOk] = useState(false);
  const [lastEvent, setLastEvent] = useState("-");
  const [lastError, setLastError] = useState("");

  // connect + join/claim
  useEffect(() => {
    if (!code) return;
    let mounted = true;

    (async () => {
      const socket = await getSocket();
      if (!socket || !mounted) return;

      setSocketOk(socket.connected);

      const onRoomUpdate = (data) => {
        if (!mounted) return;
        setLastEvent("room_update");
        setPlayers(Array.isArray(data?.players) ? data.players : []);
        setPhase(data?.phase || "lobby");
      };
      const onGameStarted = () => {
        if (!mounted) return;
        setLastEvent("game_started");
        setPhase("playing");
      };

      socket.on("room_update", onRoomUpdate);
      socket.on("game_started", onGameStarted);

      if (isHost) {
        // Re-claim host when the host lands on the room page (socket id changed)
        socket.emit("claim_host", { code }, (resp) => {
          if (resp?.error) setLastError(resp.error);
          socket.emit("get_room_state", { code });
        });
      } else {
        // Normal player join
        socket.emit("join_room", { code, name }, (resp) => {
          if (resp?.error) setLastError(resp.error);
        });
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
    if (!socket) return;
    socket.emit("start_game", { code }, (resp) => {
      if (resp?.error) setLastError(resp.error);
      else setLastEvent("start_game_ok");
    });
  };

  const statusLine = isHost
    ? phase === "lobby"
      ? "Waiting for players..."
      : "Game in progress…"
    : phase === "lobby"
    ? "Waiting for host to start…"
    : "Game in progress…";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/70 p-5 shadow-lg ring-1 ring-white/10 text-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Room {code || "—"}</h2>
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Leave
          </a>
        </div>

        <div className="rounded-xl bg-slate-800/70 p-4 space-y-2">
          <p className="font-semibold">
            Players:{" "}
            {players.length ? players.join(", ") : <span>—</span>}
          </p>
          <p className="text-slate-300">{statusLine}</p>

          {/* tiny debug area */}
          <div className="mt-2 text-xs text-slate-400 leading-5">
            <div>
              Socket:{" "}
              {process.env.NEXT_PUBLIC_SOCKET_URL ||
                "https://snapchaos-socket.onrender.com"}{" "}
              {socketOk ? "✅" : "⚠️"}
            </div>
            <div>
              connected • last event: <span className="font-mono">{lastEvent}</span>
            </div>
            {lastError ? (
              <div className="text-amber-300">⚠️ {lastError}</div>
            ) : null}
          </div>
        </div>

        {isHost ? (
          <button
            onClick={startGame}
            disabled={phase !== "lobby" || players.length === 0}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Start Game
          </button>
        ) : (
          <div className="text-center text-sm text-slate-400">
            Waiting for host…
          </div>
        )}

        {phase === "playing" && (
          <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
            <p className="font-semibold text-emerald-100">Game started! 🎉</p>
            <p className="text-sm text-emerald-200/90">
              (This is a placeholder. We can add the actual game UI next.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}