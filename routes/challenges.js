const express = require('express');
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
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

function escapeRegex(text) {
  return String(text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

router.use(checkDbConnection);

/**
 * GET /api/challenges/categories
 * Get distinct challenge categories from MongoDB.
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Challenge.distinct('category', { status: 'active' });
    res.json({ ok: true, categories: categories.filter(Boolean) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/challenges
 * Get list of challenges for game clients.
 * Supports filters: ?category=Standard&status=active&search=High
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, status = 'active', search } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category) {
      filter.category = String(category).trim();
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [challenges, categories] = await Promise.all([
      Challenge.find(filter).select('-__v').sort({ createdAt: -1 }).lean(),
      Challenge.distinct('category', { status: 'active' })
    ]);

    res.json({
      ok: true,
      count: challenges.length,
      categories: categories.filter(Boolean),
      challenges
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/challenges/:id
 * Get complete details of a specific challenge by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id).select('-__v').lean();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ ok: true, challenge });
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid challenge ID' });
    next(e);
  }
});

module.exports = router;
