// server.js – SnapChaos Socket Server (Render)
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

/**
 * Allow sockets only from your frontend (Vercel) and local dev.
 * (Render URL is included harmlessly.)
 */
const FRONTEND_ORIGINS = [
  "https://snap-chaos.vercel.app",
  "http://localhost:3000",
  "https://snapchaos-socket.onrender.com"
];

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGINS,
    methods: ["GET", "POST"],
  },
  // path: "/socket.io" // default; keep as-is
});

// -------- Tiny in-memory room store --------
const rooms = new Map(); // code -> { started, hostId, players: Map(socketId -> {id,name,isHost}) }

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getPublicState(room) {
  return {
    started: !!room.started,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id, name: p.name, isHost: !!p.isHost
    })),
  };
}

// --------------- Socket logic ---------------
io.on("connection", (socket) => {
  console.log("✅ connected:", socket.id);

  socket.on("create_room", ({ name }, ack) => {
    const code = makeCode();
    rooms.set(code, { started: false, hostId: null, players: new Map() });
    ack?.({ code });
  });

  socket.on("join_room", (payload, ack) => {
    let { code, name, isHost } = payload || {};
    code = (code || "").toUpperCase();
    name = name || "Player";

    if (!rooms.has(code)) {
      rooms.set(code, { started: false, hostId: null, players: new Map() });
    }
    const room = rooms.get(code);

    socket.join(code);

    // set host if requested and none set yet
    if (isHost && !room.hostId) room.hostId = socket.id;

    room.players.set(socket.id, {
      id: socket.id,
      name,
      isHost: socket.id === room.hostId,
    });

    // reply to the joiner with current state
    ack?.(null, getPublicState(room));
    // notify everyone in the room
    io.to(code).emit("room_update", getPublicState(room));
  });

  socket.on("start_game", ({ code }, ack) => {
    code = (code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return ack?.({ message: "Room not found" });

    if (socket.id !== room.hostId) {
      return ack?.({ message: "Only host can start" });
    }

    room.started = true;
    io.to(code).emit("game_started");
    io.to(code).emit("room_update", getPublicState(room));
    ack?.(null, { ok: true });
  });

  socket.on("leave_room", ({ code }) => {
    code = (code || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    socket.leave(code);
    room.players.delete(socket.id);

    if (socket.id === room.hostId) {
      room.hostId = null;
      const first = room.players.values().next().value;
      if (first) {
        room.hostId = first.id;
        first.isHost = true;
      }
    }
    io.to(code).emit("room_update", getPublicState(room));
  });

  socket.on("disconnect", () => {
    for (const [code, room] of rooms) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (socket.id === room.hostId) {
          room.hostId = null;
          const first = room.players.values().next().value;
          if (first) {
            room.hostId = first.id;
            first.isHost = true;
          }
        }
        io.to(code).emit("room_update", getPublicState(room));
      }
    }
  });
});

// simple health check
app.get("/", (_req, res) => res.send("SnapChaos socket server ✅"));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("🚀 Socket server listening on", PORT);
  console.log("CORS origins:", FRONTEND_ORIGINS);
});