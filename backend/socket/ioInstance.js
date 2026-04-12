// Singleton to share the Socket.IO instance across modules
let _io = null;

module.exports = {
  set: (io) => { _io = io; },
  get: () => _io,
  // Allow require('../socket/ioInstance') to return io directly for emitToUser calls
  emit: (...args) => _io?.emit(...args),
  to: (...args) => _io?.to(...args),
};
