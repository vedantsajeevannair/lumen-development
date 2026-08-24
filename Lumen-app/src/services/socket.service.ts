import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/AuthStore";
import { queryClient, apiClient } from "./api.client";
import { env } from "../config/env";

class SocketService {
  private socket: Socket | null = null;
  private backendUrl = env.socketUrl;

  constructor() {
    // Listen for auth state changes to keep the socket's token up to date
    useAuthStore.subscribe((state, prevState) => {
      const newToken = state.session?.access_token;
      const oldToken = prevState.session?.access_token;

      if (newToken && newToken !== oldToken && this.socket) {
        this.socket.io.opts.extraHeaders = {
          ...(this.socket.io.opts.extraHeaders || {}),
          Authorization: `Bearer ${newToken}`,
        };

        // If the socket was disconnected, try reconnecting now that we have a fresh token
        if (this.socket.disconnected) {
          this.socket.connect();
        }
      }
    });
  }

  connect() {
    const session = useAuthStore.getState().session;
    if (!session?.access_token) return;

    if (this.socket?.connected) return;

    // If we already have a socket instance but it's disconnected, just reconnect
    if (this.socket) {
      this.socket.connect();
      return;
    }

    this.socket = io(this.backendUrl, {
      transports: ["websocket"], // Force WebSocket transport in React Native to prevent long-polling timeouts
      extraHeaders: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    this.socket.on("connect", () => {
      console.log("Socket.io connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket.io disconnected, reason:", reason);
      if (reason === "io server disconnect") {
        // The server forcibly disconnected us, likely due to an expired token.
        // Trigger a token refresh by calling a protected endpoint.
        apiClient.get("/auth/me").catch(() => {});
      }
    });

    this.socket.on("connect_error", (error) => {
      console.warn("Socket.io connection error:", error.message);
    });

    // Global listener for department/admin
    this.socket.on("complaint_status_changed", (update) => {
      queryClient.invalidateQueries({ queryKey: ["admin_complaints"] });
      queryClient.invalidateQueries({ queryKey: ["department_complaints"] });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      // Don't nullify the socket so we can reconnect later with updated headers
    }
  }

  joinComplaint(complaintId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("join_complaint", complaintId);

    // Listen for specific complaint updates
    this.socket.on(`complaint_${complaintId}_update`, (update) => {
      queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
      queryClient.invalidateQueries({ queryKey: ["citizen_complaints"] });
    });

    this.socket.on(`complaint_${complaintId}_timeline`, (timeline) => {
      queryClient.invalidateQueries({ queryKey: ["complaint_timeline", complaintId] });
    });
  }

  leaveComplaint(complaintId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("leave_complaint", complaintId);
    this.socket.off(`complaint_${complaintId}_update`);
    this.socket.off(`complaint_${complaintId}_timeline`);
  }
}

export const socketService = new SocketService();
