// signaling-server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For production, restrict this!
    methods: ['GET', 'POST']
  }
});

// Simple in-memory room management
io.on('connection', (socket) => {
  let sessionId = null;

  socket.on('join', (data) => {
    sessionId = data.sessionId;
    socket.join(sessionId);
    socket.emit('joined', { sessionId });
  });

  socket.on('signal', (data) => {
    // Relay signaling data to everyone else in the room
    socket.to(data.sessionId).emit('signal', {
      from: data.from,
      signal: data.signal
    });
  });

  socket.on('disconnect', () => {
    if (sessionId) {
      socket.leave(sessionId);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 