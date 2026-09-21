const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { generateUniqueUserId } = require('../utils/userIdGenerator');
const { generateUniqueUsername } = require('../utils/usernameGenerator');
const { generateDefaultAvatar } = require('../utils/avatarGenerator');
const router = express.Router();

function checkDbConnection(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      ok: false,
      error: 'Database is currently disconnected. Please try again in a few moments.'
    });
  }
  next();
}

router.use(checkDbConnection);

/**
 * POST /api/users
 * Create or update user profile with name, username, gmailId, and deviceId.
 * Automatically grants 1000 default coins and generates a unique Bingo gaming username for new accounts.
 */
router.post('/', async (req, res, next) => {
  try {
    let gmailId = String(req.body.gmailId || '').trim().toLowerCase();
    const deviceId = String(req.body.deviceId || '').trim();
    const inputName = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
    const requestedUsername = req.body.username !== undefined ? String(req.body.username).trim() : undefined;
    const profileImageUrl = req.body.profileImageUrl !== undefined ? String(req.body.profileImageUrl).trim() : undefined;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // 1. Device-first lookup: Ensure each physical device gets its own unique account
    let user = await User.findOne({ deviceId });

    if (!user && gmailId) {
      // 2. Check if gmailId is already bound to another device or is generic
      const existingGmailUser = await User.findOne({ gmailId });
      if (existingGmailUser) {
        if (existingGmailUser.deviceId === deviceId) {
          user = existingGmailUser;
        } else {
          // gmailId is bound to a different device or is generic (e.g. player@gmail.com)
          // Generate a unique device-specific gmailId for this new device account
          const cleanDevId = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || Date.now();
          gmailId = `player_${cleanDevId}@gmail.com`;
        }
      }
    }

    if (!gmailId || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(gmailId)) {
      const cleanDevId = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || Date.now();
      gmailId = `player_${cleanDevId}@gmail.com`;
    }

    if (user) {
      // Existing user: Preserve existing username and name permanently unless explicitly updated
      user.deviceId = deviceId;

      if (inputName !== undefined && inputName.length > 0 && inputName.toLowerCase() !== 'player') {
        user.name = inputName;
      }

      if (profileImageUrl && profileImageUrl.length > 0) {
        user.profileImageUrl = profileImageUrl;
      } else if (!user.profileImageUrl) {
        user.profileImageUrl = generateDefaultAvatar(user.userId);
      }

      // Backfill userId if missing
      if (!user.userId) {
        user.userId = await generateUniqueUserId(User);
      }

      // Backfill username if missing
      if (!user.username || user.username.toLowerCase() === 'player') {
        user.username = await generateUniqueUsername(User, user.name || 'Player');
      } else if (requestedUsername !== undefined && requestedUsername.length > 0 && requestedUsername !== user.username) {
        const usernameTaken = await User.findOne({ username: requestedUsername, _id: { $ne: user._id } });
        if (usernameTaken) {
          return res.status(409).json({ error: 'Username is already taken by another user' });
        }
        user.username = requestedUsername;
      }

      // Backfill name if missing
      if (!user.name || user.name.toLowerCase() === 'player') {
        user.name = user.username;
      }

      await user.save();
    } else {
      // New user creation with collision retry loop
      let saved = false;
      let attempts = 0;

      const rawName = (inputName || req.body.username || '').trim();
      const isGenericOrMissing = !rawName || rawName.toLowerCase() === 'player';

      while (!saved && attempts < 5) {
        attempts++;
        try {
          const newUserId = await generateUniqueUserId(User);

          let finalName;
          let candidateUsername;

          if (isGenericOrMissing) {
            const randomPlayerName = await generateUniqueUsername(User);
            finalName = randomPlayerName;
            candidateUsername = randomPlayerName;
          } else {
            finalName = rawName;
            candidateUsername = rawName;
          }

          const newUsername = await generateUniqueUsername(User, candidateUsername);
          const defaultAvatar = profileImageUrl || generateDefaultAvatar(newUserId);
          const initialCoins = req.body.coins !== undefined ? Math.max(Number(req.body.coins) || 0, 0) : 1000;

          user = new User({
            userId: newUserId,
            username: newUsername,
            name: finalName,
            gmailId,
            deviceId,
            profileImageUrl: defaultAvatar,
            coins: initialCoins,
            gems: 0
          });
          await user.save();
          saved = true;
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern) {
            if (saveErr.keyPattern.gmailId) {
              const cleanDevId = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
              gmailId = `player_${cleanDevId}_${Date.now()}@gmail.com`;
              continue;
            }
            if (saveErr.keyPattern.userId || saveErr.keyPattern.username) {
              continue; // Retry with a newly generated username/userId
            }
          }
          throw saveErr;
        }
      }
    }

    const safeUser = user.toObject();
    delete safeUser.__v;

    res.json({ message: 'User saved', user: safeUser });
  } catch (e) {
    if (e.code === 11000) {
      if (e.keyPattern && e.keyPattern.deviceId) {
        return res.status(409).json({ error: 'Device ID is already registered to another account' });
      }
      if (e.keyPattern && e.keyPattern.username) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      return res.status(409).json({ error: 'Gmail ID, User ID, Username, or Device ID already exists' });
    }
    next(e);
  }
});

/**
 * GET /api/users/id/:userId
 * Fetch complete user profile by unique User ID (e.g. BGO-7F4K92M1).
 */
router.get('/id/:userId', async (req, res, next) => {
  try {
    const userId = String(req.params.userId || '').trim().toUpperCase();
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'userId is required' });
    }

    const user = await User.findOne({ userId }).select('-__v').lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users/username/:username
 * Fetch complete user profile by gaming username (case-sensitive check).
 */
router.get('/username/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ ok: false, message: 'username is required' });
    }

    const user = await User.findOne({ username }).select('-__v').lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/users/id/:userId
 * Update user profile (name, username, profileImageUrl) by unique User ID.
 * Protects userId, _id, coins, gems, and gmailId from unauthorized changes.
 */
router.patch('/id/:userId', async (req, res, next) => {
  try {
    const userId = String(req.params.userId || '').trim().toUpperCase();
    if (!userId) {
      return res.status(400).json({ ok: false, message: 'userId is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    if (req.body.username !== undefined) {
      const newUsername = String(req.body.username).trim();
      if (!newUsername) {
        return res.status(400).json({ ok: false, message: 'username cannot be empty' });
      }
      if (newUsername !== user.username) {
        const usernameTaken = await User.findOne({ username: newUsername, _id: { $ne: user._id } });
        if (usernameTaken) {
          return res.status(409).json({ ok: false, message: 'Username is already taken' });
        }
        user.username = newUsername;
      }
    }

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) {
        return res.status(400).json({ ok: false, message: 'name cannot be empty' });
      }
      user.name = name;
    }

    if (req.body.profileImageUrl !== undefined) {
      const profileImageUrl = String(req.body.profileImageUrl).trim();
      if (profileImageUrl.length > 2048) {
        return res.status(400).json({ ok: false, message: 'profileImageUrl is too long' });
      }
      user.profileImageUrl = profileImageUrl;
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.__v;

    res.json({
      ok: true,
      message: 'User profile updated',
      user: safeUser
    });
  } catch (e) {
    if (e.code === 11000 && e.keyPattern && e.keyPattern.username) {
      return res.status(409).json({ ok: false, message: 'Username is already taken' });
    }
    next(e);
  }
});

/**
 * GET /api/users/device/:deviceId
 * Search and fetch user profile details by deviceId.
 */
router.get('/device/:deviceId', async (req, res, next) => {
  try {
    const deviceId = String(req.params.deviceId || '').trim();
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await User.findOne({ deviceId }).select('-__v').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found for this deviceId' });
    }

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users/gmail/:gmailId
 * Search and fetch user profile details by gmailId.
 */
router.get('/gmail/:gmailId', async (req, res, next) => {
  try {
    const gmailId = String(req.params.gmailId || '').trim().toLowerCase();
    if (!gmailId) {
      return res.status(400).json({ error: 'gmailId is required' });
    }

    const user = await User.findOne({ gmailId }).select('-__v').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found for this gmailId' });
    }

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users
 * Search user by query param (e.g. /api/users?userId=BGO-12345678 or /api/users?username=BingoKing_492 or /api/users?deviceId=device_123 or /api/users?gmailId=user@gmail.com)
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId, username, name, deviceId, gmailId } = req.query;

    const filter = {};
    if (userId) filter.userId = String(userId).trim().toUpperCase();
    if (username) filter.username = String(username).trim();
    if (name) filter.name = String(name).trim();
    if (deviceId) filter.deviceId = String(deviceId).trim();
    if (gmailId) filter.gmailId = String(gmailId).trim().toLowerCase();

    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        error: 'Please provide query parameters userId, username, name, deviceId or gmailId to search users (e.g., /api/users?name=John)'
      });
    }

    const user = await User.findOne(filter).select('-__v').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found matching search criteria' });
    }

    res.json({ ok: true, user });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
