import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;
  
  const token = localStorage.getItem("access_token");
  const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:3000";

  socket = io(wsUrl, {
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("Connected to WebSocket backend");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket backend");
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
