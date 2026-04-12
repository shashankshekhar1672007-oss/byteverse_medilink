const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Consultation = require('../models/Consultation');
const Message = require('../models/Message');
const { SOCKET_EVENTS, CONSULTATION_STATUS } = require('../utils/constants');

// Track connected users: userId -> Set of socketIds
// Track room members:    roomId -> Map<userId, Set<socketId>>
const connectedUsers = new Map();
const roomMembers    = new Map();

const getRoomMemberSockets = (roomId, userId) => {
  if (!roomMembers.has(roomId)) {
    roomMembers.set(roomId, new Map());
  }

  const room = roomMembers.get(roomId);
  if (!room.has(userId)) {
    room.set(userId, new Set());
  }

  return room.get(userId);
};

const authenticateSocket = async (socket) => {
  const token = socket.handshake.query?.token || socket.handshake.auth?.token;
  if (!token) throw new Error('Authentication token required');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) throw new Error('User not found or inactive');
    return user;
  } catch (err) {
    throw new Error('Invalid token');
  }
};

const registerSocketHandlers = (io) => {
  // Middleware: authenticate all connections
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket);
      next();
    } catch (err) {
      console.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.name} (${user._id}) — ${socket.id}`);

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

    // ── Join consultation room ─────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_CONSULTATION, async ({ consultationId } = {}) => {
      try {
        console.debug(`${user.name} joining consultation: ${consultationId}`);
        
        const consultation = await Consultation.findById(consultationId)
          .populate('patient', 'userId')
          .populate('doctor', 'userId');

        if (!consultation) {
          console.warn(`Consultation not found: ${consultationId}`);
          return socket.emit('error', { message: 'Consultation not found' });
        }

        if (
          consultation.status !== CONSULTATION_STATUS.PENDING &&
          consultation.status !== CONSULTATION_STATUS.ACTIVE
        ) {
          return socket.emit('error', { message: 'Consultation is no longer available for calling' });
        }

        // Verify access
        const isPatient = user.role === 'patient' && 
          consultation.patient?.userId?.equals(user._id);
        const isDoctor = user.role === 'doctor' && 
          consultation.doctor?.userId?.equals(user._id);
        
        if (!isPatient && !isDoctor) {
          console.warn(`Unauthorized consultation room access attempt by ${user._id}`);
          return socket.emit('error', { message: 'Not authorized for this consultation' });
        }

        // Use roomId or fallback to consultation ID
        const roomId = consultation.roomId || consultation._id.toString();
        
        socket.join(roomId);
        socket.consultationRoomId = roomId;
        socket.consultationId = consultationId;

        // Track room occupancy
        const userId = user._id.toString();
        const memberSockets = getRoomMemberSockets(roomId, userId);
        const isFirstSocketInRoom = memberSockets.size === 0;
        memberSockets.add(socket.id);

        console.debug(`${user.name} joined room ${roomId} (${roomMembers.get(roomId).size}/2)`);
        
        // Confirm join
        socket.emit('joinedConsultation', { roomId, consultationId });

        // Notify other party
        if (isFirstSocketInRoom) {
          socket.to(roomId).emit('peerJoined', {
            userId: user._id,
            name: user.name,
            role: user.role,
          });
        }

        // Both parties ready
        if (isFirstSocketInRoom && roomMembers.get(roomId).size === 2) {
          console.debug(`Room ${roomId} ready for WebRTC call`);
          io.to(roomId).emit('readyForCall');
        }

      } catch (err) {
        console.error(`joinConsultation error: ${err.message}`);
        socket.emit('error', { message: 'Failed to join consultation' });
      }
    });

    // ── Send message (FIXED SYNTAX ERROR) ─────────────────────────────────
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async ({ consultationId, text, attachmentUrl, attachmentType, roomId } = {}) => {
      try {
        if (!text && !attachmentUrl) {
          return socket.emit('error', { message: 'Message must have text or attachment' });
        }

        const consultation = await Consultation.findById(consultationId);
        if (!consultation || consultation.status !== CONSULTATION_STATUS.ACTIVE) {
          return socket.emit('error', { message: 'Consultation is not active' });
        }

        const message = await Message.create({
          consultation: consultationId,
          sender: user._id,
          senderRole: user.role,
          text: text || undefined,  // ✅ FIXED: was `text: text || ,`
          attachmentUrl: attachmentUrl || undefined,
          attachmentType: attachmentType || undefined,
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'name avatar');

        const targetRoom = roomId || consultation.roomId || consultation._id.toString();
        io.to(targetRoom).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, populated);
        
        console.debug(`${user.name} sent message in room ${targetRoom}`);
      } catch (err) {
        console.error(`sendMessage error: ${err.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.TYPING, ({ consultationId, roomId } = {}) => {
      const room = roomId || socket.consultationRoomId;
      if (room) {
        socket.to(room).emit(SOCKET_EVENTS.TYPING, { 
          userId: user._id, 
          name: user.name 
        });
      }
    });

    socket.on(SOCKET_EVENTS.STOP_TYPING, ({ roomId } = {}) => {
      const room = roomId || socket.consultationRoomId;
      if (room) {
        socket.to(room).emit(SOCKET_EVENTS.STOP_TYPING, { userId: user._id });
      }
    });

    // ── WebRTC Signaling (ALL FIXED) ──────────────────────────────────────
    socket.on('webrtc:ice', ({ roomId: emitRoomId, candidate } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      if (room && candidate) {
        socket.to(room).emit('webrtc:ice-candidate', { candidate, from: user._id });
      }
    });

    socket.on('webrtc:offer', ({ roomId: emitRoomId, offer } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      if (room && offer) {
        socket.to(room).emit('webrtc:offer', { offer, from: user._id });
        console.debug(`WebRTC offer forwarded in room ${room}`);
      }
    });

    socket.on('webrtc:answer', ({ roomId: emitRoomId, answer } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      if (room && answer) {
        socket.to(room).emit('webrtc:answer', { answer, from: user._id });
        console.debug(`WebRTC answer forwarded in room ${room}`);
      }
    });

    const notifyCallEnded = async ({ roomId: emitRoomId, consultationId } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      const activeConsultationId = consultationId || socket.consultationId;
      const payload = {
        consultationId: activeConsultationId,
        from: user._id,
        name: user.name,
      };

      if (room) {
        socket.to(room).emit('webrtc:call-ended', payload);
      }

      if (!activeConsultationId) {
        console.debug(`Call ended signal sent to room ${room || 'unknown'} only`);
        return;
      }

      try {
        const consultation = await Consultation.findById(activeConsultationId)
          .populate('patient', 'userId')
          .populate('doctor', 'userId');

        if (!consultation) return;

        const patientUserId = consultation.patient?.userId;
        const doctorUserId = consultation.doctor?.userId;
        const isPatient = user.role === 'patient' && patientUserId?.equals(user._id);
        const isDoctor = user.role === 'doctor' && doctorUserId?.equals(user._id);
        if (!isPatient && !isDoctor) return;

        const targetUserId = isPatient ? doctorUserId : patientUserId;
        if (targetUserId) emitToUser(io, targetUserId, 'webrtc:call-ended', payload);
      } catch (err) {
        console.error(`notifyCallEnded error: ${err.message}`);
      }
    };

    socket.on('webrtc:ended', async ({ roomId: emitRoomId, consultationId } = {}) => {
      await notifyCallEnded({ roomId: emitRoomId, consultationId });
      console.debug(`Call ended signal sent (legacy event)`);
    });

    socket.on('webrtc:ice-candidate', ({ roomId: emitRoomId, candidate } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      if (room && candidate) {
        socket.to(room).emit('webrtc:ice-candidate', { candidate, from: user._id });
      }
    });

    socket.on('webrtc:call-ended', async ({ roomId: emitRoomId, consultationId } = {}) => {
      await notifyCallEnded({ roomId: emitRoomId, consultationId });
      console.debug(`Call ended signal sent`);
    });

    socket.on('webrtc:media-toggle', ({ roomId: emitRoomId, video, audio } = {}) => {
      const room = emitRoomId || socket.consultationRoomId;
      if (room) {
        socket.to(room).emit('webrtc:media-toggle', { 
          from: user._id, 
          video, 
          audio 
        });
      }
    });

    socket.on('videoCall:request', async ({ consultationId } = {}) => {
      try {
        const consultation = await Consultation.findById(consultationId)
          .populate({ path: 'patient', populate: { path: 'userId', select: 'name avatar' } })
          .populate({ path: 'doctor', populate: { path: 'userId', select: 'name avatar' } });

        if (!consultation) {
          return socket.emit('error', { message: 'Consultation not found' });
        }

        if (consultation.status !== CONSULTATION_STATUS.ACTIVE) {
          return socket.emit('error', { message: 'Consultation is not active' });
        }

        const patientUserId = consultation.patient?.userId?._id;
        const doctorUserId = consultation.doctor?.userId?._id;
        const isPatient = user.role === 'patient' && patientUserId?.equals(user._id);
        const isDoctor = user.role === 'doctor' && doctorUserId?.equals(user._id);

        if (!isPatient && !isDoctor) {
          return socket.emit('error', { message: 'Not authorized for this consultation' });
        }

        const targetUserId = isPatient ? doctorUserId : patientUserId;
        const callerName = user.name || (isPatient ? 'Patient' : 'Doctor');
        const roomId = consultation.roomId || consultation._id.toString();
        const payload = {
          consultationId: consultation._id,
          roomId,
          from: {
            userId: user._id,
            name: callerName,
            role: user.role,
          },
          patient: {
            name: consultation.patient?.userId?.name,
            avatar: consultation.patient?.userId?.avatar,
          },
          doctor: {
            name: consultation.doctor?.userId?.name,
            avatar: consultation.doctor?.userId?.avatar,
          },
          reason: consultation.reason,
          requestedAt: new Date(),
        };

        if (!targetUserId) {
          return socket.emit('error', { message: 'Call recipient not found' });
        }

        emitToUser(io, targetUserId, 'videoCall:incoming', payload);
        socket.emit('videoCall:requested', payload);
        console.debug(`Video call request sent from ${user.name} for consultation ${consultation._id}`);
      } catch (err) {
        console.error(`videoCall:request error: ${err.message}`);
        socket.emit('error', { message: 'Failed to request video call' });
      }
    });

    socket.on('videoCall:decline', async ({ consultationId } = {}) => {
      try {
        const consultation = await Consultation.findById(consultationId)
          .populate('patient', 'userId')
          .populate('doctor', 'userId');

        if (!consultation) return;

        const patientUserId = consultation.patient?.userId;
        const doctorUserId = consultation.doctor?.userId;
        const isPatient = user.role === 'patient' && patientUserId?.equals(user._id);
        const isDoctor = user.role === 'doctor' && doctorUserId?.equals(user._id);
        if (!isPatient && !isDoctor) return;

        const targetUserId = isPatient ? doctorUserId : patientUserId;
        if (!targetUserId) return;
        emitToUser(io, targetUserId, 'videoCall:declined', {
          consultationId: consultation._id,
          from: {
            userId: user._id,
            name: user.name,
            role: user.role,
          },
        });
      } catch (err) {
        console.error(`videoCall:decline error: ${err.message}`);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.debug(`${user.name} disconnected: ${reason}`);
      
      const roomId = socket.consultationRoomId;
      if (roomId && roomMembers.has(roomId)) {
        const room = roomMembers.get(roomId);
        const memberSockets = room.get(user._id.toString());

        if (memberSockets) {
          memberSockets.delete(socket.id);
        }

        if (memberSockets && memberSockets.size === 0) {
          room.delete(user._id.toString());

          // Notify room members only when the user truly leaves the room
          socket.to(roomId).emit('peerLeft', {
            consultationId: socket.consultationId,
            userId: user._id,
            name: user.name,
          });
        }

        if (room.size === 0) {
          roomMembers.delete(roomId);
          console.debug(`Room ${roomId} emptied`);
        }
      }

      // Clean up user socket tracking
      const userSockets = connectedUsers.get(user._id.toString());
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(user._id.toString());
          
          // Mark doctor offline
          if (user.role === 'doctor') {
            await Doctor.findOneAndUpdate({ userId: user._id }, { online: false });
            io.emit(SOCKET_EVENTS.DOCTOR_OFFLINE, { doctorUserId: user._id });
          }
        }
      }
    });
  });
};

const isUserOnline = (userId) => connectedUsers.has(userId.toString());

const emitToUser = (io, userId, event, data) => {
  const sockets = connectedUsers.get(userId.toString());
  if (sockets) {
    sockets.forEach((socketId) => io.to(socketId).emit(event, data));
  }
};

module.exports = { registerSocketHandlers, isUserOnline, emitToUser };
