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
  const wantsHost = useMemo(() => {
    const v = String(router.query.host || "");
    return v === "1" || v.toLowerCase() === "true";
  }, [router.query.host]);

  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("lobby");
  const [socketOk, setSocketOk] = useState(false);
  const [lastEvent, setLastEvent] = useState("-");
  const [lastError, setLastError] = useState("");
  const [amHost, setAmHost] = useState(false);
  const [socketId, setSocketId] = useState("");

  // connect + join/claim
  useEffect(() => {
    if (!code) return;
    let mounted = true;

    (async () => {
      const socket = await getSocket();
      if (!socket || !mounted) return;

      const applyRoomState = (state) => {
        if (!mounted || !state) return;

        const rawPlayers = Array.isArray(state.players) ? state.players : [];
        const normalized = rawPlayers.map((p) => {
          if (!p || typeof p !== "object") {
            const label = String(p || "Player");
            return { id: label, name: label, isHost: false };
          }
          const id = p.id || p.sid || "";
          const name = p.name || p.label || "Player";
          const isHost = Boolean(
            p.isHost ||
              (state.hostId && (state.hostId === id || state.hostId === p.sid))
          );
          return { id, name, isHost };
        });

        setPlayers(normalized);

        const phaseValue =
          state.started || state.phase === "playing" ? "playing" : "lobby";
        setPhase(phaseValue);

        if (socket.id) {
          const me = normalized.find((p) => p?.id === socket.id);
          const amHostNow =
            Boolean(me?.isHost) || state.hostId === socket.id || false;
          setAmHost(amHostNow);
        }
      };

      const joinPayload = { code, name };
      if (wantsHost) joinPayload.isHost = true;

      const handleJoinAck = (errLike, stateLike) => {
        if (process.env.NODE_ENV !== "production") {
          console.debug("join_room ack", errLike, stateLike);
        }
        if (!mounted) return;
        let err = errLike;
        let state = stateLike;

        // Some socket servers respond with a single "state" argument.
        if (!state && err && typeof err === "object" && Array.isArray(err.players)) {
          state = err;
          err = null;
        }

        if (err) {
          const message =
            typeof err === "string"
              ? err
              : err?.message || "Unable to join the room.";
          setLastError(message);
          return;
        }

        setLastError("");
        setLastEvent("join_ack");
        applyRoomState(state);
      };

      const onRoomUpdate = (state) => {
        if (!mounted) return;
        setLastEvent("room_update");
        applyRoomState(state);
        setLastError("");
      };

      const onGameStarted = () => {
        if (!mounted) return;
        setLastEvent("game_started");
        setPhase("playing");
      };

      const onConnect = () => {
        if (!mounted) return;
        setSocketOk(true);
        setSocketId(socket.id || "");
        socket.emit("join_room", joinPayload, handleJoinAck);
      };

      const onDisconnect = () => {
        if (!mounted) return;
        setSocketOk(false);
      };

      const onConnectError = (err) => {
        if (!mounted) return;
        setLastError(err?.message || "Socket connection error");
      };

      setSocketOk(socket.connected);
      setSocketId(socket.id || "");

      socket.on("room_update", onRoomUpdate);
      socket.on("game_started", onGameStarted);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onConnectError);

      if (socket.connected) {
        onConnect();
      }

      return () => {
        socket.off("room_update", onRoomUpdate);
        socket.off("game_started", onGameStarted);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
      };
    })();

    return () => {
      mounted = false;
    };
  }, [code, name, wantsHost]);

  const startGame = async () => {
    if (!amHost) {
      setLastError("Only the host can start the game.");
      return;
    }
    setLastError("");
    const socket = await getSocket();
    if (!socket) return;
    socket.emit("start_game", { code }, (err) => {
      if (err) {
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Unable to start the game.";
        setLastError(message);
        return;
      }
      setLastError("");
      setLastEvent("start_game_ok");
    });
  };

  const statusLine = amHost
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
            {players.length ? (
              players
                .map((p) => {
                  const label = p?.name || "Player";
                  return p?.isHost ? `${label} ⭐` : label;
                })
                .join(", ")
            ) : (
              <span>—</span>
            )}
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
            <div>
              me: <span className="font-mono">{socketId || "—"}</span>{" "}
              {amHost ? "(host)" : ""}
            </div>
            {lastError ? (
              <div className="text-amber-300">⚠️ {lastError}</div>
            ) : null}
          </div>
        </div>

        {amHost ? (
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
