import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  // Return existing connected socket
  if (socket?.connected) return socket;

  // Destroy stale socket
  if (socket) { socket.disconnect(); socket = null; }

  socket = io(SOCKET_URL, {
    auth:  { token },
    query: { token },
    transports: ['websocket', 'polling'],
    reconnection:         true,
    reconnectionAttempts: 10,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 5000,
    timeout:              20000,
  });

  socket.on('connect',       () => console.log('[Socket] ✓ connected', socket.id));
  socket.on('connect_error', (e) => console.warn('[Socket] connect_error:', e.message));
  socket.on('disconnect',    (r) => console.log('[Socket] disconnected:', r));
  socket.on('error',         (e) => console.warn('[Socket] error:', e));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const joinConsultation = (consultationId) => {
  if (!socket?.connected || !consultationId) return;
  socket.emit('joinConsultation', { consultationId });
};

export const sendSocketMessage = (consultationId, text) => {
  if (!socket?.connected) return false;
  socket.emit('sendMessage', { consultationId, text });
  return true;
};

export const sendTyping = (consultationId, isTyping) => {
  if (!socket?.connected || !consultationId) return;
  socket.emit(isTyping ? 'typing' : 'stopTyping', { consultationId });
};

export const EVENTS = {
  RECEIVE_MESSAGE:    'receiveMessage',
  TYPING:             'typing',
  STOP_TYPING:        'stopTyping',
  JOINED:             'joinedConsultation',
  ERROR:              'error',
  DOCTOR_ONLINE:      'doctorOnline',
  DOCTOR_OFFLINE:     'doctorOffline',
  CONSULTATION_ENDED: 'consultationEnded',
};
