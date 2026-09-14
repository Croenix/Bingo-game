const { getRandomProfilePicture } = require('./profilePictureManager');

/**
 * Select a random profile picture from profilePictures.json.
 * Completely removed external DiceBear avatar generator API.
 * @returns {string} Random profile picture URL from profilePictures.json
 */
function generateDefaultAvatar() {
  return getRandomProfilePicture();
}

module.exports = {
  generateDefaultAvatar,
  getRandomProfilePicture
};
