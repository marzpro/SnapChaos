// index.js (Render socket server)
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

/**
 * In-memory room store
 *
 * rooms[CODE] = {
 *   code: "ABCD",
 *   hostId: "<socket.id>",
 *   players: [{ id, name }],
 *   phase: "lobby" | "playing"
 * }
 */
const rooms = {};
const newCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const app = express();
app.use(cors());

// health check
app.get("/", (_req, res) => res.send("SnapChaos Socket OK"));

const server = http.createServer(app);

// IMPORTANT: Restrict CORS to your Vercel URL (and localhost for dev)
const io = new Server(server, {
  cors: {
    origin: ["https://snap-chaos.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

function emitRoomUpdate(code) {
  const room = rooms[code];
  if (!room) return;
  io.to(code).emit("room_update", {
    code,
    phase: room.phase,
    // keep sending names for simplicity
    players: room.players.map((p) => p.name),
  });
}

io.on("connection", (socket) => {
  // Create a room as host
  socket.on("create_room", ({ name = "Host" } = {}, ack = () => {}) => {
    const code = newCode();
    rooms[code] = {
      code,
      hostId: socket.id,
      phase: "lobby",
      players: [],
    };
    socket.join(code);
    ack({ code });
    emitRoomUpdate(code);
  });

  // NEW: allow the arriving room page to claim host
  socket.on("claim_host", ({ code } = {}, ack = () => {}) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) return ack({ error: "Room not found" });
    room.hostId = socket.id;         // <-- re-bind host to this socket
    socket.join(code);
    emitRoomUpdate(code);
    ack({ ok: true });
  });

  // Join as player
  socket.on("join_room", ({ code, name = "Player" } = {}, ack = () => {}) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) return ack({ error: "Room not found" });

    if (!room.players.find((p) => p.id === socket.id)) {
      room.players.push({
        id: socket.id,
        name: String(name).trim() || "Player",
      });
    }

    socket.join(code);
    ack({ ok: true });
    emitRoomUpdate(code);
  });

  // Send current state on demand
  socket.on("get_room_state", ({ code } = {}) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) return;
    io.to(socket.id).emit("room_state", {
      code,
      phase: room.phase,
      players: room.players.map((p) => p.name),
    });
  });

  // Host starts game
  socket.on("start_game", ({ code } = {}, ack = () => {}) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) return ack({ error: "Room not found" });
    if (socket.id !== room.hostId) return ack({ error: "Only host can start" });
    if (room.players.length === 0)
      return ack({ error: "Need at least 1 player" });

    room.phase = "playing";
    io.to(code).emit("game_started");
    emitRoomUpdate(code);
    ack({ ok: true });
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      // If host left, destroy room
      if (room.hostId === socket.id) {
        io.to(code).emit("room_update", { code, phase: "lobby", players: [] });
        io.in(code).socketsLeave(code);
        delete rooms[code];
        continue;
      }
      // Remove player
      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);
      if (before !== room.players.length) emitRoomUpdate(code);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on :${PORT}`);
});