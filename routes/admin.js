const express = require('express');
const jwt = require('jsonwebtoken');
const os = require('os');
const mongoose = require('mongoose');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { requireAdmin } = require('../middleware/adminAuth');
const { generateUniqueUserId } = require('../utils/userIdGenerator');
const { generateDefaultAvatar } = require('../utils/avatarGenerator');
const {
  getProfilePictures,
  addProfilePicture,
  deleteProfilePicture,
  uploadToImgBB
} = require('../utils/profilePictureManager');
const { updateEnvVariable } = require('../utils/envManager');
const router = express.Router();

// Admin Login
router.post('/login', (req, res) => {
  require('dotenv').config();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  const expectedEmail = String(process.env.ADMIN_EMAIL || 'admin@admin').trim().toLowerCase();
  const expectedPassword = String(process.env.ADMIN_PASSWORD || 'achu').trim();

  if (email !== expectedEmail || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { role: 'admin', email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '8h' }
  );
  res.json({ message: 'Admin login successful', token });
});

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Live MongoDB Telemetry & Status Endpoint
router.get('/db-status', requireAdmin, async (req, res, next) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const state = dbStateMap[mongoose.connection.readyState] || 'unknown';

    if (!isConnected) {
      return res.json({
        isConnected: false,
        state,
        dbName: mongoose.connection.name || 'bingo_game',
        host: mongoose.connection.host || 'N/A',
        pingMs: null,
        stats: null,
        collectionsList: [],
        timestamp: new Date().toISOString()
      });
    }

    const startTime = performance.now();
    let dbStats = null;
    let collectionsList = [];
    let pingMs = null;

    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        pingMs = Math.round(performance.now() - startTime);
        dbStats = await mongoose.connection.db.stats();

        const cols = await mongoose.connection.db.listCollections().toArray();
        collectionsList = await Promise.all(
          cols.map(async c => {
            try {
              const count = await mongoose.connection.db.collection(c.name).countDocuments();
              return { name: c.name, count };
            } catch {
              return { name: c.name, count: 0 };
            }
          })
        );
      }
    } catch (err) {
      console.error('MongoDB telemetry fetch note:', err.message);
    }

    res.json({
      isConnected: true,
      state,
      dbName: mongoose.connection.name || 'bingo_game',
      host: mongoose.connection.host || 'MongoDB Atlas',
      pingMs,
      stats: dbStats
        ? {
            collections: dbStats.collections || collectionsList.length,
            documents: dbStats.objects || 0,
            dataSizeFormatted: formatBytes(dbStats.dataSize || 0),
            storageSizeFormatted: formatBytes(dbStats.storageSize || 0),
            indexes: dbStats.indexes || 0,
            indexSizeFormatted: formatBytes(dbStats.indexSize || 0)
          }
        : null,
      collectionsList,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// Admin Stats
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, todayUsers, totalChallenges] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ createdAt: { $gte: startOfToday } }).catch(() => 0),
      Challenge.countDocuments().catch(() => 0)
    ]);

    const dbStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    res.json({
      totalUsers,
      todayUsers,
      totalChallenges,
      database: dbStateMap[mongoose.connection.readyState] || 'unknown',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    next(e);
  }
});

// Admin System Info & Options
router.get('/system', requireAdmin, async (req, res, next) => {
  try {
    const memory = process.memoryUsage();
    res.json({
      server: {
        port: process.env.PORT || 3000,
        nodeVersion: process.version,
        platform: process.platform,
        arch: os.arch(),
        cpuCores: os.cpus().length,
        systemUptime: os.uptime(),
        processUptime: process.uptime(),
        corsOrigin: process.env.CORS_ORIGIN || '*'
      },
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memory.external / 1024 / 1024)} MB`
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        hasMongoUri: Boolean(process.env.MONGODB_URI),
        hasAdminCredentials: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
      },
      dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      routes: [
        { path: '/api/health', method: 'GET', auth: 'Public', desc: 'Server & DB Health check' },
        { path: '/api/users', method: 'POST', auth: 'Public', desc: 'Create or update user profile' },
        { path: '/api/users/id/:userId', method: 'GET', auth: 'Public', desc: 'Fetch user profile by application userId' },
        { path: '/api/users/id/:userId', method: 'PATCH', auth: 'Public', desc: 'Update user name & profileImageUrl by application userId' },
        { path: '/api/users/device/:deviceId', method: 'GET', auth: 'Public', desc: 'Search and fetch user by deviceId' },
        { path: '/api/users/gmail/:gmailId', method: 'GET', auth: 'Public', desc: 'Search and fetch user by gmailId' },
        { path: '/api/users?userId=ID', method: 'GET', auth: 'Public', desc: 'Search user profile by userId, deviceId or gmailId query' },
        { path: '/api/challenges', method: 'GET', auth: 'Public', desc: 'Active challenges for game client' },
        { path: '/api/admin/login', method: 'POST', auth: 'Public', desc: 'Admin login for JWT' },
        { path: '/api/admin/stats', method: 'GET', auth: 'Admin Bearer', desc: 'Overview statistics' },
        { path: '/api/admin/system', method: 'GET', auth: 'Admin Bearer', desc: 'Server options & diagnostics' },
        { path: '/api/admin/users', method: 'GET', auth: 'Admin Bearer', desc: 'List & search users' },
        { path: '/api/admin/users', method: 'POST', auth: 'Admin Bearer', desc: 'Create new user with coins & gems' },
        { path: '/api/admin/users/:id', method: 'GET', auth: 'Admin Bearer', desc: 'Get user by ID' },
        { path: '/api/admin/users/:id', method: 'PATCH', auth: 'Admin Bearer', desc: 'Update user name, gmail, coins & gems' },
        { path: '/api/admin/users/:id', method: 'DELETE', auth: 'Admin Bearer', desc: 'Delete user' },
        { path: '/api/admin/challenges', method: 'GET', auth: 'Admin Bearer', desc: 'List all game challenges' },
        { path: '/api/admin/challenges', method: 'POST', auth: 'Admin Bearer', desc: 'Create new challenge' },
        { path: '/api/admin/challenges/:id', method: 'GET', auth: 'Admin Bearer', desc: 'Get challenge details' },
        { path: '/api/admin/challenges/:id', method: 'PATCH', auth: 'Admin Bearer', desc: 'Update challenge' },
        { path: '/api/admin/challenges/:id', method: 'DELETE', auth: 'Admin Bearer', desc: 'Delete challenge' },
        { path: '/api/rooms', method: 'POST', auth: 'Public', desc: 'Create dynamic room with capacity limit & optional password' },
        { path: '/api/rooms', method: 'GET', auth: 'Public', desc: 'List available active rooms' },
        { path: '/api/rooms/:roomId', method: 'GET', auth: 'Public', desc: 'Fetch room details & player list' },
        { path: '/api/rooms/:roomId/join', method: 'POST', auth: 'Public', desc: 'Join room with capacity & password enforcement' },
        { path: '/api/rooms/:roomId/leave', method: 'POST', auth: 'Public', desc: 'Leave room (auto deletes room from MongoDB if creator exits)' },
        { path: '/api/rooms/:roomId/vivox-token', method: 'POST', auth: 'Public', desc: 'Generate Vivox voice token' },
        { path: '/api/rooms/:roomId/end', method: 'POST', auth: 'Public', desc: 'End game and delete room' },
        { path: '/api/rooms/:roomId', method: 'DELETE', auth: 'Public', desc: 'Remove room permanently from MongoDB' }
      ]
    });
  } catch (e) {
    next(e);
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Admin Create User (with Coins, Gems & Device ID)
router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const gmailId = String(req.body.gmailId || '').trim().toLowerCase();
    const deviceId = String(req.body.deviceId || '').trim();
    const coins = Math.max(Number(req.body.coins) || 0, 0);
    const gems = Math.max(Number(req.body.gems) || 0, 0);

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(gmailId)) {
      return res.status(400).json({ error: 'gmailId must be a valid Gmail address' });
    }

    const existing = await User.findOne({ gmailId });
    if (existing) {
      return res.status(409).json({ error: 'User with this Gmail ID already exists' });
    }

    const userId = await generateUniqueUserId(User);
    const profileImageUrl = String(req.body.profileImageUrl || '').trim() || generateDefaultAvatar(userId);
    const user = await User.create({ userId, name, gmailId, deviceId, profileImageUrl, coins, gems });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Gmail ID already exists' });
    next(e);
  }
});

// List Users
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || '').trim();
    const filter = search
      ? {
          $or: [
            { userId: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { gmailId: { $regex: search, $options: 'i' } },
            { deviceId: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    const [users, total] = await Promise.all([
      User.find(filter).select('-__v').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter)
    ]);
    res.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) {
    next(e);
  }
});

// Get User by ID
router.get('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid user ID' });
    next(e);
  }
});

// Update User (including Coins, Gems & Device ID)
router.patch('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const update = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      update.name = name;
    }
    if (req.body.gmailId !== undefined) {
      const gmailId = String(req.body.gmailId).trim().toLowerCase();
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(gmailId)) {
        return res.status(400).json({ error: 'gmailId must be a valid Gmail address' });
      }
      update.gmailId = gmailId;
    }
    if (req.body.deviceId !== undefined) {
      update.deviceId = String(req.body.deviceId).trim();
    }
    if (req.body.coins !== undefined) {
      update.coins = Math.max(Number(req.body.coins) || 0, 0);
    }
    if (req.body.gems !== undefined) {
      update.gems = Math.max(Number(req.body.gems) || 0, 0);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully', user });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Gmail ID already exists' });
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid user ID' });
    next(e);
  }
});

// Delete User
router.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid user ID' });
    next(e);
  }
});

// ==================== CHALLENGES MANAGEMENT ROUTES ====================

// List All Challenges
router.get('/challenges', requireAdmin, async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    const challenges = await Challenge.find(filter).sort({ createdAt: -1 });
    res.json({ challenges });
  } catch (e) {
    next(e);
  }
});

// Get Challenge by ID
router.get('/challenges/:id', requireAdmin, async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ challenge });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid challenge ID' });
    next(e);
  }
});

// Create Challenge
router.post('/challenges', requireAdmin, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'Standard').trim();
    const coverImage = String(req.body.coverImage || '').trim();
    const color1 = String(req.body.color1 || '#6366f1').trim();
    const color2 = String(req.body.color2 || '#a855f7').trim();
    const entryCoin = Math.max(Number(req.body.entryCoin) || 0, 0);
    const entryCurrencyType = req.body.entryCurrencyType === 'gems' ? 'gems' : 'coins';
    const rewardCoin = Math.max(Number(req.body.rewardCoin) || 0, 0);
    const rewardCurrencyType = req.body.rewardCurrencyType === 'gems' ? 'gems' : 'coins';
    const maxPlayers = Math.max(Number(req.body.maxPlayers) || 2, 2);
    const status = req.body.status === 'inactive' ? 'inactive' : 'active';

    if (!title) return res.status(400).json({ error: 'Challenge title is required' });

    const challenge = await Challenge.create({
      title,
      category,
      coverImage,
      color1,
      color2,
      entryCoin,
      entryCurrencyType,
      rewardCoin,
      rewardCurrencyType,
      maxPlayers,
      status
    });

    res.status(201).json({ message: 'Challenge created successfully', challenge });
  } catch (e) {
    next(e);
  }
});

// Update Challenge
router.patch('/challenges/:id', requireAdmin, async (req, res, next) => {
  try {
    const update = {};
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ error: 'title cannot be empty' });
      update.title = title;
    }
    if (req.body.category !== undefined) update.category = String(req.body.category).trim() || 'Standard';
    if (req.body.coverImage !== undefined) update.coverImage = String(req.body.coverImage).trim();
    if (req.body.color1 !== undefined) update.color1 = String(req.body.color1).trim();
    if (req.body.color2 !== undefined) update.color2 = String(req.body.color2).trim();
    if (req.body.entryCoin !== undefined) update.entryCoin = Math.max(Number(req.body.entryCoin) || 0, 0);
    if (req.body.entryCurrencyType !== undefined) update.entryCurrencyType = req.body.entryCurrencyType === 'gems' ? 'gems' : 'coins';
    if (req.body.rewardCoin !== undefined) update.rewardCoin = Math.max(Number(req.body.rewardCoin) || 0, 0);
    if (req.body.rewardCurrencyType !== undefined) update.rewardCurrencyType = req.body.rewardCurrencyType === 'gems' ? 'gems' : 'coins';
    if (req.body.maxPlayers !== undefined) update.maxPlayers = Math.max(Number(req.body.maxPlayers) || 2, 2);
    if (req.body.status !== undefined) update.status = req.body.status === 'inactive' ? 'inactive' : 'active';

    const challenge = await Challenge.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ message: 'Challenge updated successfully', challenge });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid challenge ID' });
    next(e);
  }
});

// Delete Challenge
router.delete('/challenges/:id', requireAdmin, async (req, res, next) => {
  try {
    const challenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ message: 'Challenge deleted' });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid challenge ID' });
    next(e);
  }
});

// ==================== PROFILE PICTURE MANAGEMENT ROUTES ====================

// List all profile pictures
router.get('/profile-pictures', requireAdmin, (req, res, next) => {
  try {
    const pictures = getProfilePictures();
    res.json({ ok: true, pictures, total: pictures.length });
  } catch (e) {
    next(e);
  }
});

// Add direct image URL to profilePictures.json
router.post('/profile-pictures', requireAdmin, (req, res, next) => {
  try {
    const url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Image URL is required' });
    const pictures = addProfilePicture(url);
    res.json({ ok: true, message: 'Profile picture URL added successfully', pictures, total: pictures.length });
  } catch (e) {
    next(e);
  }
});

// Upload image to ImgBB and append URL to profilePictures.json
router.post('/profile-pictures/upload-imgbb', requireAdmin, async (req, res, next) => {
  try {
    const image = req.body.image;
    const apiKey = req.body.apiKey;
    if (!image) return res.status(400).json({ error: 'Image data is required' });
    const uploadedUrl = await uploadToImgBB(image, apiKey);
    const pictures = getProfilePictures();
    res.json({ ok: true, message: 'Image uploaded to ImgBB successfully', url: uploadedUrl, pictures, total: pictures.length });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to upload image to ImgBB' });
  }
});

// Delete profile picture URL from profilePictures.json
router.delete('/profile-pictures', requireAdmin, (req, res, next) => {
  try {
    const url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Image URL is required' });
    const pictures = deleteProfilePicture(url);
    res.json({ ok: true, message: 'Profile picture removed successfully', pictures, total: pictures.length });
  } catch (e) {
    next(e);
  }
});

// Fetch current server ImgBB API Key
router.get('/imgbb-key', requireAdmin, (req, res, next) => {
  try {
    const apiKey = String(process.env.IMGBB_API_KEY || '').trim();
    res.json({ ok: true, apiKey, hasKey: Boolean(apiKey) });
  } catch (e) {
    next(e);
  }
});

// Save and persist server ImgBB API Key in .env file
router.post('/imgbb-key', requireAdmin, (req, res, next) => {
  try {
    const apiKey = String(req.body.apiKey || '').trim();
    updateEnvVariable('IMGBB_API_KEY', apiKey);
    res.json({ ok: true, message: 'Server ImgBB API Key updated and saved to .env', apiKey, hasKey: Boolean(apiKey) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to update ImgBB API Key' });
  }
});

module.exports = router;
