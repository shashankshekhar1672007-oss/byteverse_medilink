import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? window.location.origin : "http://localhost:5001");

let socket = null;
let socketToken = null;
let disconnectTimer = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  if (!token) return null;

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  if (socket && socketToken === token) {
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketToken = token;

  socket = io(SOCKET_URL, {
    path: "/socket.io",
    auth: { token },
    transports: ["polling", "websocket"],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => console.log("[Socket] ✓ connected", socket.id));
  socket.on("connect_error", (e) =>
    console.warn("[Socket] connect_error:", e.message),
  );
  socket.on("disconnect", (r) => console.log("[Socket] disconnected:", r));
  socket.on("error", (e) => {
    if (e?.message === "Consultation is not active") return;
    console.warn("[Socket] error:", e);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;

  if (disconnectTimer) clearTimeout(disconnectTimer);
  disconnectTimer = window.setTimeout(() => {
    if (!socket) return;
    socket.disconnect();
    socket = null;
    socketToken = null;
    disconnectTimer = null;
  }, 250);
};

export const joinConsultation = (consultationId) => {
  if (!socket?.connected || !consultationId) return;
  socket.emit("joinConsultation", { consultationId });
};

export const sendSocketMessage = (consultationId, text) => {
  if (!socket?.connected) return false;
  socket.emit("sendMessage", { consultationId, text });
  return true;
};

export const sendTyping = (consultationId, isTyping) => {
  if (!socket?.connected || !consultationId) return;
  socket.emit(isTyping ? "typing" : "stopTyping", { consultationId });
};

export const requestVideoCall = (consultationId) => {
  if (!socket?.connected || !consultationId) return false;
  socket.emit("videoCall:request", { consultationId });
  return true;
};

export const declineVideoCall = (consultationId) => {
  if (!socket?.connected || !consultationId) return false;
  socket.emit("videoCall:decline", { consultationId });
  return true;
};

export const EVENTS = {
  RECEIVE_MESSAGE: "receiveMessage",
  TYPING: "typing",
  STOP_TYPING: "stopTyping",
  JOINED: "joinedConsultation",
  ERROR: "error",
  DOCTOR_ONLINE: "doctorOnline",
  DOCTOR_OFFLINE: "doctorOffline",
  CONSULTATION_ENDED: "consultationEnded",
  VIDEO_CALL_INCOMING: "videoCall:incoming",
  VIDEO_CALL_REQUESTED: "videoCall:requested",
  VIDEO_CALL_DECLINED: "videoCall:declined",
};
