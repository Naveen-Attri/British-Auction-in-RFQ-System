/**
 * socket.js — Singleton Socket.IO instance
 * All backend modules import getIO() to emit events.
 */
const { Server } = require('socket.io');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // Client joins a specific RFQ room to receive its events
    socket.on('join:rfq', (rfqId) => {
      socket.join(`rfq:${rfqId}`);
      // Broadcast updated viewer count to all in room
      const count = getRoomSize(`rfq:${rfqId}`);
      io.to(`rfq:${rfqId}`).emit('room:viewers', { rfqId, count });
    });

    socket.on('leave:rfq', (rfqId) => {
      socket.leave(`rfq:${rfqId}`);
      const count = getRoomSize(`rfq:${rfqId}`);
      io.to(`rfq:${rfqId}`).emit('room:viewers', { rfqId, count });
    });

    socket.on('disconnecting', () => {
      // When socket drops, update all rooms it was in
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          const count = Math.max(0, getRoomSize(room) - 1);
          io.to(room).emit('room:viewers', {
            rfqId: room.replace('rfq:', ''),
            count,
          });
        }
      }
    });
  });

  return io;
}

function getRoomSize(room) {
  const r = io?.sockets.adapter.rooms.get(room);
  return r ? r.size : 0;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call init() first');
  return io;
}

module.exports = { init, getIO, getRoomSize };
