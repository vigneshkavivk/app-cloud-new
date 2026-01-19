// server/index.js
import 'dotenv/config';
import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { socketOptions } from './config/socketConfig.js';
import setupSocketRoutes from './routes/socketRoutes.js';
import { envConfig } from './config/env.config.js';
import { connectToDatabase } from './config/dbConfig.js';

// Import Terraform routes
import terraformRoutes from './routes/terraform.js';

const port = envConfig.app.port || 3000;

// Connect to MongoDB
await connectToDatabase();

// Register Terraform API routes
app.use('/api/terraform', terraformRoutes);

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, socketOptions);

// Setup Socket routes
setupSocketRoutes(io);

// Optional: Broadcast recent activity (if used)
// import { recentActivities } from './app.js';
// setInterval(() => {
//   if (recentActivities.length > 0) {
//     const latest = recentActivities[0];
//     io.emit('recent-activity', latest);
//   }
// }, 60000);

let isServerReady = false;

server.on('listening', () => {
  if (!isServerReady) {
    isServerReady = true;
    console.log(`✅ Server is now running on port ${port}`);
    console.log(`📡 WebSocket server ready`);
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
