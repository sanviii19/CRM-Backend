// src/config/socket.js
// Socket.io instance — exported as a singleton so any module can emit events.

let io = null;

/**
 * Initialize the Socket.io instance (called once from server.js).
 * @param {import('socket.io').Server} socketServer
 */
function initSocket(socketServer) {
  io = socketServer;

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Client joins a campaign room to receive live metric updates
    socket.on('join-campaign', (campaignId) => {
      socket.join(`campaign-${campaignId}`);
      console.log(`[Socket] ${socket.id} joined campaign room: ${campaignId}`);
    });

    socket.on('leave-campaign', (campaignId) => {
      socket.leave(`campaign-${campaignId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Get the initialized Socket.io instance.
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };
