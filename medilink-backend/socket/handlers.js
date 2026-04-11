'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Consultation = require('../models/Consultation');
const Message = require('../models/Message');
const { SOCKET_EVENTS, CONSULTATION_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

// userId (string) -> Set of socketIds
const connectedUsers = new Map();
// consultationId -> Set of socketIds (room members)
const consultationRooms = new Map();

const authenticateSocket = async (socket) => {
  const token = socket.handshake.query?.token || socket.handshake.auth?.token;
  if (!token) throw new Error('Authentication token required');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  if (!user || !user.isActive) throw new Error('User not found or inactive');
  return user;
};

const registerSocketHandlers = (io) => {

  // ── Auth middleware ──────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket);
      next();
    } catch (err) {
      logger.warn(`Socket auth failed [${socket.id}]: ${err.message}`);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Track user sockets
    if (!connectedUsers.has(user._id.toString())) {
      connectedUsers.set(user._id.toString(), new Set());
    }
    connectedUsers.get(user._id.toString()).add(socket.id);

    // Mark doctor online
    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: user._id }, { online: true });
      io.emit(SOCKET_EVENTS.DOCTOR_ONLINE, { doctorUserId: user._id });
    }

    // ── Join consultation room ───────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_CONSULTATION, async ({ consultationId }) => {
      try {
        const consultation = await Consultation.findById(consultationId)
          .populate('patient').populate('doctor');

        if (!consultation) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Consultation not found' });
        }

        // Access check
        const isPatient = user.role === 'patient' && consultation.patient?.userId?.equals(user._id);
        const isDoctor  = user.role === 'doctor'  && consultation.doctor?.userId?.equals(user._id);
        if (!isPatient && !isDoctor) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not authorized' });
        }

        socket.join(consultation.roomId);
        socket.consultationRoomId = consultation.roomId;
        socket.consultationId = consultationId;

        // Track room members
        if (!consultationRooms.has(consultationId)) {
          consultationRooms.set(consultationId, new Set());
        }
        consultationRooms.get(consultationId).add(socket.id);

        socket.emit('joinedConsultation', { roomId: consultation.roomId, consultationId });
        logger.debug(`${user.name} joined room ${consultation.roomId}`);
      } catch (err) {
        logger.error(`joinConsultation error: ${err.message}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join consultation' });
      }
    });

    // ── Text message ─────────────────────────────────────
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async ({ consultationId, text }) => {
      try {
        if (!text?.trim()) return;

        const consultation = await Consultation.findById(consultationId);
        if (!consultation || consultation.status !== CONSULTATION_STATUS.ACTIVE) {
          return socket.emit(SOCKET_EVENTS.ERROR, { message: 'Consultation is not active' });
        }

        const message = await Message.create({
          consultation: consultationId,
          sender: user._id,
          senderRole: user.role,
          text: text.trim(),
        });

        const populated = await message.populate('sender', 'name avatar');

        // Broadcast to room (including sender for confirmation)
        io.to(consultation.roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, populated);
        logger.debug(`Message in room ${consultation.roomId} by ${user.name}`);
      } catch (err) {
        logger.error(`sendMessage error: ${err.message}`);
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ────────────────────────────────
    socket.on(SOCKET_EVENTS.TYPING, ({ consultationId }) => {
      const room = socket.consultationRoomId;
      if (room) socket.to(room).emit(SOCKET_EVENTS.TYPING, { userId: user._id });
    });

    socket.on(SOCKET_EVENTS.STOP_TYPING, ({ consultationId }) => {
      const room = socket.consultationRoomId;
      if (room) socket.to(room).emit(SOCKET_EVENTS.STOP_TYPING, { userId: user._id });
    });

    // ── WebRTC Signalling ────────────────────────────────
    socket.on('webrtc:offer', ({ offer, consultationId }) => {
      const room = socket.consultationRoomId;
      if (!room) return;
      logger.debug(`WebRTC offer from ${user.name} in room ${room}`);
      // Send offer to everyone else in the room
      socket.to(room).emit('webrtc:offer', { offer, from: user._id });
    });

    socket.on('webrtc:answer', ({ answer, consultationId }) => {
      const room = socket.consultationRoomId;
      if (!room) return;
      logger.debug(`WebRTC answer from ${user.name}`);
      socket.to(room).emit('webrtc:answer', { answer, from: user._id });
    });

    socket.on('webrtc:ice', ({ candidate, consultationId }) => {
      const room = socket.consultationRoomId;
      if (!room) return;
      socket.to(room).emit('webrtc:ice', { candidate, from: user._id });
    });

    socket.on('webrtc:ended', ({ consultationId }) => {
      const room = socket.consultationRoomId;
      if (!room) return;
      logger.debug(`WebRTC ended by ${user.name}`);
      socket.to(room).emit('webrtc:ended', { by: user._id });
    });

    // ── Disconnect ───────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${user.name} [${socket.id}]`);

      // Clean up user tracking
      const sockets = connectedUsers.get(user._id.toString());
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedUsers.delete(user._id.toString());
          // Mark doctor offline only if truly all sockets gone
          if (user.role === 'doctor') {
            await Doctor.findOneAndUpdate({ userId: user._id }, { online: false });
            io.emit(SOCKET_EVENTS.DOCTOR_OFFLINE, { doctorUserId: user._id });
          }
        }
      }

      // Notify WebRTC peer in consultation room
      if (socket.consultationRoomId) {
        socket.to(socket.consultationRoomId).emit('webrtc:ended', { by: user._id, reason: 'disconnected' });
      }

      // Clean up room tracking
      if (socket.consultationId) {
        const room = consultationRooms.get(socket.consultationId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) consultationRooms.delete(socket.consultationId);
        }
      }
    });
  });
};

const isUserOnline = (userId) => connectedUsers.has(userId.toString());

const emitToUser = (io, userId, event, data) => {
  const sockets = connectedUsers.get(userId.toString());
  if (sockets) sockets.forEach(sid => io.to(sid).emit(event, data));
};

module.exports = { registerSocketHandlers, isUserOnline, emitToUser };
