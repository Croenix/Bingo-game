const crypto = require('crypto');

/**
 * Generate a random DiceBear Critters avatar URL with the 'boldPop' preset.
 * @param {string} [seed] - Optional seed (e.g. userId, email, or random string)
 * @returns {string} DiceBear avatar URL
 */
function generateDefaultAvatar(seed) {
  const avatarSeed = seed || crypto.randomBytes(6).toString('hex');
  return `https://api.dicebear.com/9.x/critters/svg?seed=${encodeURIComponent(avatarSeed)}&preset=boldPop`;
}

module.exports = {
  generateDefaultAvatar
};
