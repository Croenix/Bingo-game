const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { generateUniqueUserId } = require('../utils/userIdGenerator');
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
 * Create or update user profile with name, gmailId, and deviceId.
 * Automatically generates a unique userId (BGO-XXXXXXXX) and default DiceBear Clay avatar for new users.
 */
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const gmailId = String(req.body.gmailId || '').trim().toLowerCase();
    const deviceId = String(req.body.deviceId || '').trim();
    const profileImageUrl = req.body.profileImageUrl !== undefined ? String(req.body.profileImageUrl).trim() : undefined;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(gmailId)) {
      return res.status(400).json({ error: 'gmailId must be a valid Gmail address' });
    }

    let user = await User.findOne({ gmailId });

    if (user) {
      // Existing user update: retain existing profileImageUrl unless a non-empty new URL is explicitly provided
      user.name = name;
      if (deviceId) user.deviceId = deviceId;
      if (profileImageUrl && profileImageUrl.length > 0) {
        user.profileImageUrl = profileImageUrl;
      } else if (!user.profileImageUrl) {
        user.profileImageUrl = generateDefaultAvatar(user.userId);
      }

      // Backfill userId for legacy user if missing
      if (!user.userId) {
        user.userId = await generateUniqueUserId(User);
      }

      await user.save();
    } else {
      // New user creation with collision retry loop
      let saved = false;
      let attempts = 0;
      while (!saved && attempts < 5) {
        attempts++;
        try {
          const newUserId = await generateUniqueUserId(User);
          const defaultAvatar = profileImageUrl || generateDefaultAvatar(newUserId);
          user = new User({
            userId: newUserId,
            name,
            gmailId,
            deviceId,
            profileImageUrl: defaultAvatar,
            coins: 0,
            gems: 0
          });
          await user.save();
          saved = true;
        } catch (saveErr) {
          if (saveErr.code === 11000 && saveErr.keyPattern && saveErr.keyPattern.userId) {
            continue;
          }
          throw saveErr;
        }
      }
    }

    const safeUser = user.toObject();
    delete safeUser.__v;

    res.json({ message: 'User saved', user: safeUser });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Gmail ID or User ID already exists' });
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
 * PATCH /api/users/id/:userId
 * Update user profile (name, profileImageUrl) by unique User ID.
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
 * Search user by query param (e.g. /api/users?userId=BGO-12345678 or /api/users?deviceId=device_123 or /api/users?gmailId=user@gmail.com)
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId, deviceId, gmailId } = req.query;

    const filter = {};
    if (userId) filter.userId = String(userId).trim().toUpperCase();
    if (deviceId) filter.deviceId = String(deviceId).trim();
    if (gmailId) filter.gmailId = String(gmailId).trim().toLowerCase();

    if (Object.keys(filter).length === 0) {
      return res.status(400).json({
        error: 'Please provide query parameters userId, deviceId or gmailId to search users (e.g., /api/users?userId=BGO-XXXXXXXX)'
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
