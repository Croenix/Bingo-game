require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');

const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const challengeRoutes = require('./routes/challenges');
const roomRoutes = require('./routes/rooms');
const vivoxRoutes = require('./routes/vivox');
const agoraRoutes = require('./routes/agora');
const registerRoomHandlers = require('./sockets/roomHandler');
const migrateLegacyUsers = require('./utils/migrateUsers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.set('trust proxy', 1);
app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    service: 'bingo-user-server',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socket: io ? 'initialized' : 'inactive',
    uptime: process.uptime()
  });
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/vivox', vivoxRoutes);
app.use('/api/agora', agoraRoutes);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Socket.io Connection listener
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
});

const PORT = Number(process.env.PORT || 3000);

async function start() {
  if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is missing in .env');

  server.listen(PORT, () => console.log(`Bingo Server running on http://localhost:${PORT}`));

  if (!process.env.MONGODB_URI) {
    console.error('MongoDB connection warning: MONGODB_URI is missing in .env');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
    await migrateLegacyUsers();
  } catch (e) {
    console.error('MongoDB connection failed (Server continues running):', e.message);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('Initializing local MongoMemoryServer fallback...');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('MongoDB local in-memory database connected successfully');
      await migrateLegacyUsers();
    } catch (fallbackErr) {
      console.error('Fallback DB connection skipped:', fallbackErr.message);
    }
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server gracefully...');
  try {
    await mongoose.connection.close();
  } catch (err) {
    // Ignore db close error on exit
  }
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

module.exports = { app, server, io };
