// /lib/socket.js
let socketRef = null;

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export async function getSocket() {
  if (socketRef && socketRef.connected) return socketRef;

  const { io } = await import("socket.io-client");
  // Use websocket transport and CORS-safe defaults
  socketRef = io(SOCKET_URL, {
    transports: ["websocket"],
    withCredentials: false,
  });

  return new Promise((resolve) => {
    socketRef.on("connect", () => resolve(socketRef));
    socketRef.on("connect_error", (err) => {
      console.error("Socket connect_error:", err?.message || err);
      resolve(null);
    });
  });
}

export function disconnectSocket() {
  if (socketRef) {
    socketRef.disconnect();
    socketRef = null;
  }
}