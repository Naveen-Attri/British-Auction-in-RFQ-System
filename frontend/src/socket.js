/**
 * socket.js — Frontend Socket.IO singleton
 * Import this anywhere in the React app to use the same connection.
 */
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

export default socket;
