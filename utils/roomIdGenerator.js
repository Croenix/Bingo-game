const Room = require('../models/Room');

/**
 * Generate a unique 6-character uppercase room ID with collision retries.
 * @param {number} [maxAttempts=10]
 * @returns {Promise<string>} Unique room ID
 */
async function generateUniqueRoomId(RoomModel = Room, maxAttempts = 10) {
  const model = (RoomModel && typeof RoomModel.exists === 'function') ? RoomModel : Room;
  const attempts = (typeof RoomModel === 'number') ? RoomModel : maxAttempts;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await model.exists({ roomId: candidate });
    if (!existing) {
      return candidate;
    }
  }
  // Fallback timestamp suffix if max attempts reached
  return (Math.random().toString(36).substring(2, 6) + Date.now().toString(36).slice(-2)).toUpperCase();
}

module.exports = {
  generateUniqueRoomId
};
