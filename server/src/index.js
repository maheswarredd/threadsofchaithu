import validateConfig from './config/env.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import supportRoutes from './routes/support.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import { ensureAdminAndSeed } from './services/adminService.js';

// Validate required environment variables
let config;
try {
  config = validateConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// Cross-Origin Resource Sharing
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or matched origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for preview/hosting environments
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, message: { message: 'Too many requests. Please try again later.' } });
const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, message: { message: 'Order limit exceeded. Please wait a few minutes.' } });

// Mount API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderLimiter, orderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Public Payment Configuration for Frontend Checkout
app.get('/api/config/payment', (_req, res) => {
  res.json({
    upiId: config.upiId,
    upiName: config.upiName,
    codEnabled: true,
    upiEnabled: true,
    freeShippingThreshold: 1499,
    standardShippingFee: 99
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Threads of Chaithu Boutique API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handling Middleware
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `An account or record with this ${field} already exists.` });
  }

  // CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier format.' });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error occurred. Please try again.'
  });
});

// Database connection & Server bootstrap
async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB connected successfully to database:', mongoose.connection.name);

    // Auto-ensure administrator defined in .env and seed initial catalogue
    await ensureAdminAndSeed();

    const port = Number(config.port) || 5000;
    const server = app.listen(port, () => {
      console.log(`🚀 Threads of Chaithu API server listening on port ${port}`);
      console.log(`🌐 Client allowed origin: ${config.clientUrl}`);
    });

    // Friendly handling for listen errors (e.g. port already in use)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} is already in use - another copy of this server (or another app) is still running.`);
        console.error('   Fix it with ONE of these:');
        console.error('   1) Close the other terminal that is running "npm start" / "npm run dev" (Ctrl+C), then run again.');
        console.error('   2) Free the port on Windows (PowerShell):');
        console.error(`        Get-NetTCPConnection -LocalPort ${port} | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`);
        console.error('      or in Command Prompt:');
        console.error(`        for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`);
        console.error(`   3) Or use a different port: set PORT=5001 in server/.env (and VITE_API_URL=http://localhost:5001/api in client/.env)\n`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      mongoose.connection.close().finally(() => process.exit(1));
    });

    // Graceful shutdown so the port is released immediately on Ctrl+C / restart
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down...`);
      server.close(() => {
        mongoose.connection.close().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 5000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('\n❌ Server startup failed:');
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
