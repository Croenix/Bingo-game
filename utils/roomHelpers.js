const Room = require('../models/Room');

const ROOM_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

/**
 * Calculate room expiration date (creation time + 1 hour).
 * Expiration MUST NOT be extended by player join/leave/update/polling.
 * @param {Date} [createdAt=new Date()]
 * @returns {Date}
 */
function calculateExpiresAt(createdAt = new Date()) {
  const baseTime = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return new Date(baseTime + ROOM_LIFETIME_MS);
}

/**
 * Check if a room is expired based on current timestamp.
 * @param {any} room
 * @returns {boolean}
 */
function isRoomExpired(room) {
  if (!room || !room.expiresAt) return false;
  const expiresAtMs = new Date(room.expiresAt).getTime();
  return expiresAtMs <= Date.now();
}

/**
 * Validates if room is expired. If expired, deletes it from MongoDB and notifies socket room.
 * @param {any} room
 * @param {any} [io=null]
 * @returns {Promise<boolean>} returns true if room was expired and handled, false otherwise.
 */
async function checkAndRemoveIfExpired(room, io = null) {
  if (!room) return false;

  if (isRoomExpired(room)) {
    const roomId = room.roomId;
    console.log(`[Room] Room ${roomId} has expired (expiresAt: ${room.expiresAt}). Removing from MongoDB...`);
    
    await Room.deleteOne({ roomId });

    if (io) {
      io.to(roomId).emit('room_expired', {
        roomId,
        message: 'Room lifetime expired'
      });
      io.to(roomId).emit('room_deleted', {
        roomId,
        reason: 'Room has expired'
      });
      io.in(roomId).socketsLeave(roomId);
    }
    return true;
  }

  return false;
}

/**
 * Strip private bingoCard property from a player object.
 * @param {any} player
 * @returns {any}
 */
function sanitizePlayer(player) {
  if (!player) return player;
  const pObj = typeof player.toObject === 'function' ? player.toObject() : { ...player };
  delete pObj.bingoCard;
  return pObj;
}

/**
 * Sanitize a room object for public / general broadcast or API response.
 * Strips raw password and removes bingoCard from all players in the roster.
 * @param {any} room
 * @returns {any}
 */
function sanitizeRoom(room) {
  if (!room) return null;
  const roomObj = typeof room.toObject === 'function' ? room.toObject() : JSON.parse(JSON.stringify(room));
  
  const { password, ...safeRoom } = roomObj;
  safeRoom.hasPassword = Boolean(password && password.length > 0);

  if (Array.isArray(safeRoom.players)) {
    safeRoom.players = safeRoom.players.map(p => sanitizePlayer(p));
  }

  return safeRoom;
}

module.exports = {
  ROOM_LIFETIME_MS,
  calculateExpiresAt,
  isRoomExpired,
  checkAndRemoveIfExpired,
  sanitizePlayer,
  sanitizeRoom
};
