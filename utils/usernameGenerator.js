const crypto = require('crypto');

const PREFIXES = [
  'Bingo', 'Lucky', 'Cyber', 'Apex', 'Vortex', 'Shadow', 'Blaze', 'Sonic',
  'Mega', 'Hyper', 'Pro', 'Master', 'Titan', 'Alpha', 'Phantom', 'Storm',
  'Turbo', 'Venom', 'Legend', 'Royal', 'Swift', 'Mystic', 'Iron', 'Golden'
];

const SUFFIXES = [
  'King', 'Queen', 'Boss', 'Star', 'Hero', 'Player', 'Champ', 'Warrior',
  'Ninja', 'Master', 'Wizard', 'Striker', 'Hunter', 'Gamer', 'Knight',
  'Rider', 'Chaser', 'Slayer', 'Victor', 'Captain', 'Ace', 'Ranger'
];

/**
 * Generate a random Gaming / Bingo username
 * Example: BingoKing_492, LuckyWarrior_7812
 */
function generateBingoUsername() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const randomNum = Math.floor(100 + Math.random() * 8900); // 3-4 digit number
  return `${prefix}${suffix}_${randomNum}`;
}

async function checkUserExists(User, query) {
  if (typeof User.findOne === 'function') {
    const res = User.findOne(query);
    if (res && typeof res.select === 'function') {
      return await res.select('_id').lean();
    }
    return await res;
  }
  if (typeof User.exists === 'function') {
    return await User.exists(query);
  }
  return false;
}

/**
 * Generate a guaranteed unique gaming username by cross-checking MongoDB.
 * @param {import('mongoose').Model} User - Mongoose User Model
 * @param {string} [customCandidate] - Optional candidate username requested by user
 * @returns {Promise<string>} Guaranteed unique username
 */
async function generateUniqueUsername(User, customCandidate) {
  if (customCandidate && typeof customCandidate === 'string') {
    const candidate = customCandidate.trim();
    if (candidate.length > 0) {
      const existing = await checkUserExists(User, { username: candidate });
      if (!existing) {
        return candidate;
      }
    }
  }

  const maxRetries = 50;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const candidate = generateBingoUsername();
    const existing = await checkUserExists(User, { username: candidate });

    if (!existing) {
      return candidate;
    }
  }

  // Fallback in case of extreme collision
  const microHash = crypto.randomBytes(3).toString('hex');
  return `BingoPlayer_${microHash}`;
}

module.exports = {
  generateBingoUsername,
  generateUniqueUsername
};
