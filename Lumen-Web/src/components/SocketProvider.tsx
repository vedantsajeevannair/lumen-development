import React, { createContext, useContext, useEffect, useState } from "react";
import { initSocket, disconnectSocket } from "../lib/socket";
import { session } from "../lib/session";
import { Socket } from "socket.io-client";

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Only connect if we have a token
    const token = session.getAccessToken();
    if (token) {
      const s = initSocket();
      setSocket(s);
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
