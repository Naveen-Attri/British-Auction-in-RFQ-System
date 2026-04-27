/**
 * socket.js — Frontend Socket.IO singleton
 * Import this anywhere in the React app to use the same connection.
 */
import { io } from 'socket.io-client';

const isProd = import.meta.env?.PROD;
const backendUrl = isProd ? window.location.origin : 'http://localhost:5000';

const socket = io(backendUrl, {
  path: isProd ? '/_/backend/socket.io' : '/socket.io',
  transports: ['polling', 'websocket'], // Allow polling fallback for Vercel serverless environments
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

export default socket;
