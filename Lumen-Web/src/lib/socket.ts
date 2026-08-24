import { io, Socket } from "socket.io-client";
import { session } from "./session";
import { WS_URL } from "./config";

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;
  
  const token = session.getAccessToken();
  const wsUrl = WS_URL;

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
