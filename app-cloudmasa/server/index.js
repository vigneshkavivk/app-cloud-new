// server/index.js
import 'dotenv/config';
import express from 'express';
import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { socketOptions } from './config/socketConfig.js';
import setupSocketRoutes from './routes/socketRoutes.js';
import { envConfig } from './config/env.config.js';
import { connectToDatabase } from './config/dbConfig.js';

// Import Terraform routes
import terraformRoutes from './routes/terraform.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = envConfig.app.port || 3000;

// ✅ HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Connect to MongoDB
await connectToDatabase();

// Register Terraform API routes
app.use('/api/terraform', terraformRoutes);

// ✅ SERVE STATIC FRONTEND (from `npm run build`)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback for SPA routing (all other GET requests → index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// ✅ SOCKET.IO — ALB-Ready Config
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: [
      'https://app.cloudmasa.com',
      'http://localhost:5173' // dev only — harmless in prod
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000, // 10s
  pingTimeout: 20000  // 20s (ALB idle timeout must be > 20s → set to 120s)
});

// Setup Socket routes
setupSocketRoutes(io);

// ✅ Connection logging (for debug)
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  console.log(`   Origin: ${socket.handshake.headers.origin}`);
  console.log(`   Auth:`, socket.handshake.auth?.token ? '✅ Token present' : '❌ No token');

  socket.on('disconnect', (reason) => {
    console.log(`🔚 ${socket.id} disconnected: ${reason}`);
  });
});

// Start server
let isServerReady = false;
server.on('listening', () => {
  if (!isServerReady) {
    isServerReady = true;
    console.log(`✅ HTTP + Socket.IO server running on port ${port}`);
    console.log(`🌐 Frontend served from: ${distPath}`);
    console.log(`📡 WSS endpoint: wss://app.cloudmasa.com/socket.io`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && !isServerReady) {
    console.log(`⚠️ Port ${port} is busy. Retrying in 1 second...`);
    setTimeout(() => {
      server.close();
      server.listen(port, '0.0.0.0');
    }, 1000);
  } else if (!isServerReady) {
    console.error('❌ Fatal server error:', err.message);
    process.exit(1);
  }
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: gracefully shut down
  // process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // process.exit(1);
});

// Start server
server.listen(port, '0.0.0.0');
