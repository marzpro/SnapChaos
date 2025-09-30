// lib/socket.js
import { io } from "socket.io-client";

// IMPORTANT: set this in Vercel → Settings → Environment Variables
// NEXT_PUBLIC_SOCKET_URL = https://YOUR-RENDER-APP.onrender.com
const URL = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, "") || "http://localhost:8080";

// create a SINGLE shared socket instance with verbose logging
const socket = io(URL, {
  transports: ["websocket", "polling"],
  autoConnect: false,            // we will connect manually
});

let hasBoundLogs = false;
function bindLogs() {
  if (hasBoundLogs) return;
  hasBoundLogs = true;
  socket.on("connect", () => console.log("[socket] connected:", socket.id));
  socket.on("disconnect", (r) => console.log("[socket] disconnected:", r));
  socket.on("connect_error", (e) => console.error("[socket] connect_error:", e?.message || e));
}
bindLogs();

export async function ensureConnected(timeoutMs = 8000) {
  if (socket.connected) return;
  socket.connect();
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timed out connecting to socket server")), timeoutMs);
    socket.once("connect", () => { clearTimeout(t); resolve(); });
    socket.once("connect_error", (err) => { clearTimeout(t); reject(err); });
  });
}

export default socket;