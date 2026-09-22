const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { generateUniqueRoomId } = require('../utils/roomIdGenerator');
const { getVivoxUserUri, getVivoxChannelUri, generateVivoxToken } = require('../utils/vivox');
const { generateUniqueBingoCard } = require('../utils/bingoCardGenerator');
const { calculateExpiresAt, isRoomExpired, checkAndRemoveIfExpired, sanitizeRoom, sanitizePlayer } = require('../utils/roomHelpers');

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
 * POST /api/rooms
 * Create a new room with custom ID option, password, public/private setting, 1-hour expiration, and initial Bingo card.
 * Body: { creatorId, creatorName, name, capacity, roomId, customRoomId, password, isPublic }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      creatorId,
      creatorName,
      name = 'Bingo Room',
      capacity = 4,
      roomId: inputRoomId,
      customRoomId,
      password = '',
      isPublic,
      gameType: inputGameType = 'bingo',
      boardSize: inputBoardSize = 5
    } = req.body;

    const gameType = ['bingo', 'sos'].includes(String(inputGameType).toLowerCase()) ? String(inputGameType).toLowerCase() : 'bingo';
    const boardSize = [3, 5].includes(Number(inputBoardSize)) ? Number(inputBoardSize) : 5;

    if (!creatorId || !creatorName) {
      return res.status(400).json({ error: 'creatorId and creatorName are required' });
    }

    const roomName = String(name || '').trim();
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Enforce case-sensitive room name uniqueness
    const existingNameRoom = await Room.findOne({ name: roomName });
    if (existingNameRoom) {
      if (await checkAndRemoveIfExpired(existingNameRoom, req.app.get('io'))) {
        // Previously existing room with this name has expired and was removed
      } else {
        return res.status(409).json({ error: `Room with name '${roomName}' already exists` });
      }
    }

    const formattedCreatorId = String(creatorId).trim().toUpperCase();

    // Retrieve registered user profile if available to prevent name spoofing
    const userProfile = await User.findOne({ userId: formattedCreatorId });
    const trustedCreatorName = userProfile ? userProfile.name : String(creatorName).trim();
    const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(req.body.profileImageUrl || '').trim();

    let finalRoomId = String(customRoomId || inputRoomId || '').toUpperCase().trim();

    if (finalRoomId) {
      const existingRoom = await Room.findOne({ roomId: finalRoomId });
      if (existingRoom) {
        if (await checkAndRemoveIfExpired(existingRoom, req.app.get('io'))) {
          // Previously existing room has expired and was removed
        } else {
          return res.status(400).json({ error: `Room ID '${finalRoomId}' already exists` });
        }
      }
    } else {
      finalRoomId = await generateUniqueRoomId(Room);
    }

    const trimPassword = String(password).trim();
    // If isPublic isn't explicitly passed, room is public if password is empty
    const roomIsPublic = isPublic !== undefined ? Boolean(isPublic) : (trimPassword.length === 0);

    const maxCap = Math.min(Math.max(Number(capacity) || 4, 2), 10);
    const vivoxChannelUri = getVivoxChannelUri(finalRoomId);
    const expiresAt = calculateExpiresAt();

    // Generate unique Bingo card for creator
    const creatorBingoCard = generateUniqueBingoCard([]);

    const room = new Room({
      roomId: finalRoomId,
      name: roomName,
      password: trimPassword,
      isPublic: roomIsPublic,
      creatorId: formattedCreatorId,
      creatorName: trustedCreatorName,
      capacity: maxCap,
      gameType,
      boardSize,
      status: 'waiting',
      vivoxChannelUri,
      expiresAt,
      players: [
        {
          userId: formattedCreatorId,
          name: trustedCreatorName,
          profileImageUrl: trustedProfileImageUrl,
          isCreator: true,
          isReady: true,
          joinedAt: new Date(),
          bingoCard: creatorBingoCard
        }
      ]
    });

    await room.save();
    console.log(`[Room] Created room ${finalRoomId} (${roomName}) (expiresAt: ${expiresAt.toISOString()})`);

    const vivoxUserUri = getVivoxUserUri(formattedCreatorId);
    const vivoxToken = generateVivoxToken({
      userUri: vivoxUserUri,
      action: 'join',
      targetUri: vivoxChannelUri
    });

    res.status(201).json({
      ok: true,
      message: 'Room created successfully',
      room: sanitizeRoom(room),
      myBingoCard: creatorBingoCard,
      vivox: {
        token: vivoxToken,
        channelUri: vivoxChannelUri,
        userUri: vivoxUserUri
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.name) {
        return res.status(409).json({ error: `Room with name '${String(req.body.name || '').trim()}' already exists` });
      }
      return res.status(409).json({ error: 'Room ID or Room Name already exists' });
    }
    next(err);
  }
});

/**
 * GET /api/rooms
 * List active public/available rooms for joining. Cleans up expired rooms.
 */
router.get('/', async (req, res, next) => {
  try {
    const rawRooms = await Room.find({ status: 'waiting' }).sort({ createdAt: -1 });
    const availableRooms = [];

    for (const r of rawRooms) {
      if (isRoomExpired(r)) {
        await checkAndRemoveIfExpired(r, req.app.get('io'));
        continue;
      }
      if (r.players.length < r.capacity) {
        availableRooms.push(sanitizeRoom(r));
      }
    }

    res.json({ ok: true, count: availableRooms.length, rooms: availableRooms });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rooms/:roomId
 * Fetch room details. Validates expiration & sanitizes output.
 */
router.get('/:roomId', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (await checkAndRemoveIfExpired(room, req.app.get('io'))) {
      return res.status(410).json({ error: 'Room has expired' });
    }

    res.json({ ok: true, room: sanitizeRoom(room) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Join room with password check, capacity enforcement, 1-hour expiration check, and private Bingo card delivery.
 * Body: { userId, userName, password }
 */
router.post('/:roomId/join', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId, userName, password = '' } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }

    const formattedUserId = String(userId).trim().toUpperCase();

    // Retrieve registered user profile if available to prevent name spoofing
    const userProfile = await User.findOne({ userId: formattedUserId });
    const trustedPlayerName = userProfile ? userProfile.name : String(userName).trim();
    const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(req.body.profileImageUrl || '').trim();

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (await checkAndRemoveIfExpired(room, req.app.get('io'))) {
      return res.status(410).json({ error: 'Room has expired' });
    }

    if (room.status === 'finished') {
      return res.status(400).json({ error: 'Room is already finished' });
    }

    // Verify Password if required
    if (room.password && room.password !== String(password).trim()) {
      return res.status(401).json({ error: 'Invalid room password' });
    }

    const existingPlayer = room.players.find(p => p.userId === formattedUserId);

    let updatedRoom;
    let playerBingoCard;

    if (existingPlayer) {
      // Re-join/Update existing player: preserve existing Bingo card
      playerBingoCard = existingPlayer.bingoCard;
      if (!playerBingoCard || !Array.isArray(playerBingoCard.numbers)) {
        playerBingoCard = generateUniqueBingoCard(room.players);
      }

      updatedRoom = await Room.findOneAndUpdate(
        { roomId, 'players.userId': formattedUserId },
        {
          $set: {
            'players.$.name': trustedPlayerName,
            'players.$.profileImageUrl': trustedProfileImageUrl || existingPlayer.profileImageUrl,
            'players.$.bingoCard': playerBingoCard
          }
        },
        { new: true }
      );
    } else {
      // New player join: generate a unique Bingo card
      playerBingoCard = generateUniqueBingoCard(room.players);

      updatedRoom = await Room.findOneAndUpdate(
        {
          roomId,
          status: 'waiting',
          'players.userId': { $ne: formattedUserId },
          $expr: { $lt: [{ $size: '$players' }, '$capacity'] }
        },
        {
          $push: {
            players: {
              userId: formattedUserId,
              name: trustedPlayerName,
              profileImageUrl: trustedProfileImageUrl,
              isCreator: formattedUserId === room.creatorId,
              isReady: false,
              joinedAt: new Date(),
              bingoCard: playerBingoCard
            }
          }
        },
        { new: true }
      );

      if (!updatedRoom) {
        const currentRoom = await Room.findOne({ roomId });
        if (currentRoom && currentRoom.players.length >= currentRoom.capacity) {
          return res.status(400).json({ error: 'Room capacity limit reached' });
        }
        return res.status(400).json({ error: 'Unable to join room' });
      }
    }

    const vivoxChannelUri = updatedRoom.vivoxChannelUri || getVivoxChannelUri(roomId);
    const vivoxUserUri = getVivoxUserUri(formattedUserId);
    const vivoxToken = generateVivoxToken({
      userUri: vivoxUserUri,
      action: 'join',
      targetUri: vivoxChannelUri
    });

    const sanitizedRoom = sanitizeRoom(updatedRoom);
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('player_joined', {
        player: { userId: formattedUserId, name: trustedPlayerName, profileImageUrl: trustedProfileImageUrl },
        players: sanitizedRoom.players,
        playersCount: sanitizedRoom.players.length,
        capacity: updatedRoom.capacity
      });
    }

    res.json({
      ok: true,
      message: 'Joined room successfully',
      room: sanitizedRoom,
      myBingoCard: playerBingoCard,
      vivox: {
        token: vivoxToken,
        channelUri: vivoxChannelUri,
        userUri: vivoxUserUri
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rooms/:roomId/vivox-token
 * Securely generate Vivox token for authenticated room members only.
 * Body: { userId, userName }
 */
router.post('/:roomId/vivox-token', async (req, res, next) => {
  try {
    const rawRoomId = req.params.roomId;
    if (!rawRoomId || String(rawRoomId).trim() === '') {
      return res.status(400).json({ ok: false, message: 'roomId is required' });
    }

    const roomId = String(rawRoomId).toUpperCase().trim();
    const { userId, userName } = req.body || {};

    if (!userId || String(userId).trim() === '') {
      return res.status(400).json({ ok: false, message: 'userId is required' });
    }

    const formattedUserId = String(userId).trim().toUpperCase();

    if (!userName || String(userName).trim() === '') {
      return res.status(400).json({ ok: false, message: 'userName is required' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ ok: false, message: 'Room not found' });
    }

    if (await checkAndRemoveIfExpired(room, req.app.get('io'))) {
      return res.status(410).json({ ok: false, message: 'Room has expired' });
    }

    if (room.status === 'finished') {
      return res.status(403).json({ ok: false, message: 'Room is already finished' });
    }

    const player = room.players && room.players.find(p => p.userId === formattedUserId);
    if (!player) {
      return res.status(403).json({ ok: false, message: 'User is not a member of this room' });
    }

    const vivoxChannelUri = room.vivoxChannelUri || getVivoxChannelUri(roomId);
    const vivoxUserUri = getVivoxUserUri(player.userId);

    let token;
    try {
      token = generateVivoxToken({
        userUri: vivoxUserUri,
        action: 'join',
        targetUri: vivoxChannelUri
      });
    } catch (err) {
      console.error(`[Vivox] Error generating token:`, err.message);
      return res.status(500).json({ ok: false, message: 'Vivox service configuration error' });
    }

    res.json({
      ok: true,
      message: 'Vivox token generated',
      token,
      channelUri: vivoxChannelUri,
      userUri: vivoxUserUri,
      vivox: {
        token,
        channelUri: vivoxChannelUri,
        userUri: vivoxUserUri
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rooms/:roomId/leave
 * Player leaves room.
 * Requirement 4: If ROOM CREATOR leaves -> Delete entire room from MongoDB, notify players, close room. NO host migration.
 * Body: { userId }
 */
router.post('/:roomId/leave', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const formattedUserId = String(userId).trim().toUpperCase();
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isMember = room.players.some(p => p.userId === formattedUserId);
    if (!isMember) {
      return res.status(400).json({ error: 'User is not in this room' });
    }

    const io = req.app.get('io');

    // Requirement 4: Creator leaves -> Delete room completely
    if (room.creatorId === formattedUserId) {
      console.log(`[Room] Creator ${formattedUserId} left. Deleting room ${roomId}`);
      await Room.deleteOne({ roomId });

      if (io) {
        io.to(roomId).emit('room_deleted', {
          roomId,
          reason: 'Room creator left the room',
          deletedBy: formattedUserId
        });
        io.in(roomId).socketsLeave(roomId);
      }

      return res.json({
        ok: true,
        message: 'Creator left. Room deleted from MongoDB.',
        roomDeleted: true
      });
    }

    // Non-creator player leaves -> Remove only that player
    room.players = room.players.filter(p => p.userId !== formattedUserId);

    if (room.players.length === 0) {
      await Room.deleteOne({ roomId });

      if (io) {
        io.to(roomId).emit('room_deleted', {
          roomId,
          reason: 'All players have exited the room',
          deletedBy: formattedUserId
        });
        io.in(roomId).socketsLeave(roomId);
      }

      return res.json({
        ok: true,
        message: 'All players exited. Room deleted from MongoDB.',
        roomDeleted: true
      });
    } else {
      await room.save();
      const sanitizedRoom = sanitizeRoom(room);

      if (io) {
        io.to(roomId).emit('player_left', {
          userId: formattedUserId,
          players: sanitizedRoom.players,
          playersCount: room.players.length,
          creatorId: room.creatorId
        });
      }

      return res.json({
        ok: true,
        message: 'Left room successfully',
        roomDeleted: false,
        playersCount: room.players.length,
        room: sanitizedRoom
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/rooms/:roomId & POST /api/rooms/:roomId/end
 * Remove/delete room directly from MongoDB. Protected to room creator.
 */
const removeRoomHandler = async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId, reason = 'Room deleted by request' } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required to end or delete a room' });
    }

    const formattedUserId = String(userId).trim().toUpperCase();
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.creatorId !== formattedUserId) {
      return res.status(403).json({ error: 'Only the room creator can end or delete the room' });
    }

    await Room.deleteOne({ roomId });

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room_deleted', { roomId, reason, endedBy: formattedUserId });
      io.in(roomId).socketsLeave(roomId);
    }

    res.json({
      ok: true,
      message: `Room ${roomId} removed permanently from MongoDB`,
      reason
    });
  } catch (err) {
    next(err);
  }
};

router.delete('/:roomId', removeRoomHandler);
router.post('/:roomId/end', removeRoomHandler);

module.exports = router;
