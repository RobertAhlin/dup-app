import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'supersecret';
      const decoded = jwt.verify(token, secret);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      // Client disconnected
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

export function emitActivityUpdate(activity: any) {
  if (io) {
    io.emit('activity:new', activity);
  }
}
