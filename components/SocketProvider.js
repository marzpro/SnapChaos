import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketCtx = createContext(null);
export const useSocket = () => useContext(SocketCtx);

export default function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const socket = io({ path: '/api/socket' });
    socketRef.current = socket;
    socket.on('connect', () => setReady(true));
    return () => socket.disconnect();
  }, []);

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current, ready }}>
      {children}
    </SocketCtx.Provider>
  );
}