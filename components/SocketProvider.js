// components/SocketProvider.js
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketCtx = createContext(null);
export const useSocket = () => useContext(SocketCtx);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";

export default function SocketProvider({ children }) {
  const socketRef = useRef(null);

  useEffect(() => {
    // IMPORTANT: connect to Render URL, not /api/socket
    const s = io(SOCKET_URL, {
      transports: ["websocket"], // more reliable on Vercel/Render
      path: "/socket.io",        // default path on the server
      withCredentials: false,
    });
    socketRef.current = s;
    return () => s.disconnect();
  }, []);

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketCtx.Provider>
  );
}