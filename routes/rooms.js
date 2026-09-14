const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { getVivoxUserUri, getVivoxChannelUri, generateVivoxToken } = require('../utils/vivox');

/**
 * POST /api/rooms
 * Create a new room with custom ID option, password, and public/private setting.
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
      isPublic
    } = req.body;

    if (!creatorId || !creatorName) {
      return res.status(400).json({ error: 'creatorId and creatorName are required' });
    }

    // Retrieve registered user profile if available to prevent name spoofing
    const userProfile = await User.findOne({ userId: String(creatorId).trim() });
    const trustedCreatorName = userProfile ? userProfile.name : String(creatorName).trim();
    const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(req.body.profileImageUrl || '').trim();

    let finalRoomId = String(customRoomId || inputRoomId || '').toUpperCase().trim();

    if (finalRoomId) {
      const existingRoom = await Room.findOne({ roomId: finalRoomId });
      if (existingRoom) {
        return res.status(400).json({ error: `Room ID '${finalRoomId}' already exists` });
      }
    } else {
      finalRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const trimPassword = String(password).trim();
    // If isPublic isn't explicitly passed, room is public if password is empty
    const roomIsPublic = isPublic !== undefined ? Boolean(isPublic) : (trimPassword.length === 0);

    const maxCap = Math.min(Math.max(Number(capacity) || 4, 2), 10);
    const vivoxChannelUri = getVivoxChannelUri(finalRoomId);

    const room = new Room({
      roomId: finalRoomId,
      name: String(name).trim(),
      password: trimPassword,
      isPublic: roomIsPublic,
      creatorId: String(creatorId),
      creatorName: trustedCreatorName,
      capacity: maxCap,
      status: 'waiting',
      vivoxChannelUri,
      players: [
        {
          userId: String(creatorId),
          name: trustedCreatorName,
          profileImageUrl: trustedProfileImageUrl,
          isCreator: true,
          isReady: true,
          joinedAt: new Date()
        }
      ]
    });

    await room.save();

    const vivoxUserUri = getVivoxUserUri(String(creatorId));
    const vivoxToken = generateVivoxToken({
      userUri: vivoxUserUri,
      action: 'join',
      targetUri: vivoxChannelUri
    });

    res.status(201).json({
      ok: true,
      message: 'Room created successfully',
      room,
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
 * GET /api/rooms
 * List active public/available rooms for joining.
 */
router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: 'waiting' }).sort({ createdAt: -1 }).lean();
    // Filter rooms that are available and hide raw password field in response
    const availableRooms = rooms
      .filter(r => r.players.length < r.capacity)
      .map(r => {
        const { password, ...safeRoom } = r;
        safeRoom.hasPassword = Boolean(password && password.length > 0);
        return safeRoom;
      });

    res.json({ ok: true, count: availableRooms.length, rooms: availableRooms });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/rooms/:roomId
 * Fetch room details.
 */
router.get('/:roomId', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const room = await Room.findOne({ roomId }).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const { password, ...safeRoom } = room;
    safeRoom.hasPassword = Boolean(password && password.length > 0);
    res.json({ ok: true, room: safeRoom });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Join room with password check & capacity enforcement.
 * Body: { userId, userName, password }
 */
router.post('/:roomId/join', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId, userName, password = '' } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }

    // Retrieve registered user profile if available to prevent name spoofing
    const userProfile = await User.findOne({ userId: String(userId).trim() });
    const trustedPlayerName = userProfile ? userProfile.name : String(userName).trim();
    const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(req.body.profileImageUrl || '').trim();

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === 'finished') {
      return res.status(400).json({ error: 'Room is already finished' });
    }

    // Verify Password if required
    if (room.password && room.password !== String(password).trim()) {
      return res.status(401).json({ error: 'Invalid room password' });
    }

    const existingIndex = room.players.findIndex(p => p.userId === String(userId));
    if (existingIndex === -1 && room.players.length >= room.capacity) {
      return res.status(400).json({ error: 'Room capacity limit reached' });
    }

    if (existingIndex !== -1) {
      room.players[existingIndex].name = trustedPlayerName;
      if (trustedProfileImageUrl) {
        room.players[existingIndex].profileImageUrl = trustedProfileImageUrl;
      }
    } else {
      room.players.push({
        userId: String(userId),
        name: trustedPlayerName,
        profileImageUrl: trustedProfileImageUrl,
        isCreator: String(userId) === String(room.creatorId),
        isReady: false,
        joinedAt: new Date()
      });
    }

    await room.save();

    const vivoxChannelUri = room.vivoxChannelUri || getVivoxChannelUri(roomId);
    const vivoxUserUri = getVivoxUserUri(String(userId));
    const vivoxToken = generateVivoxToken({
      userUri: vivoxUserUri,
      action: 'join',
      targetUri: vivoxChannelUri
    });

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('player_joined', {
        player: { userId: String(userId), name: trustedPlayerName, profileImageUrl: trustedProfileImageUrl },
        players: room.players,
        playersCount: room.players.length,
        capacity: room.capacity
      });
    }

    res.json({
      ok: true,
      message: 'Joined room successfully',
      room,
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

    console.log(`[Vivox] Token request for room: ${roomId}, user: ${userId}`);

    if (!userId || String(userId).trim() === '') {
      console.log(`[Vivox] Unauthorized token request: missing userId`);
      return res.status(400).json({ ok: false, message: 'userId is required' });
    }

    if (!userName || String(userName).trim() === '') {
      console.log(`[Vivox] Unauthorized token request: missing userName`);
      return res.status(400).json({ ok: false, message: 'userName is required' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log(`[Vivox] Token request failed: Room ${roomId} not found`);
      return res.status(404).json({ ok: false, message: 'Room not found' });
    }

    if (room.status === 'finished') {
      console.log(`[Vivox] Token request rejected: Room ${roomId} is finished`);
      return res.status(403).json({ ok: false, message: 'Room is already finished' });
    }

    const player = room.players && room.players.find(p => String(p.userId) === String(userId).trim());
    if (!player) {
      console.log(`[Vivox] Unauthorized token request: User ${userId} is not a member of room ${roomId}`);
      return res.status(403).json({ ok: false, message: 'User is not a member of this room' });
    }

    console.log(`[Vivox] Membership verified for user: ${userId} in room ${roomId}`);

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

    console.log(`[Vivox] Token generated successfully`);

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
/**
 * POST /api/rooms/:roomId/leave
 * Player leaves room. If creator exits, room is permanently deleted from MongoDB and real-time room_deleted event is broadcast.
 * Body: { userId }
 */
router.post('/:roomId/leave', async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const isCreator = String(room.creatorId) === String(userId);
    const io = req.app.get('io');

    if (isCreator) {
      // Creator exits -> Remove room from MongoDB & notify clients live
      await Room.deleteOne({ roomId });

      if (io) {
        io.to(roomId).emit('room_deleted', {
          roomId,
          reason: 'Room creator has exited the room',
          deletedBy: userId
        });
        io.in(roomId).socketsLeave(roomId);
      }

      return res.json({
        ok: true,
        message: 'Creator exited. Room deleted permanently from MongoDB.',
        roomDeleted: true
      });
    } else {
      // Non-creator exits -> Remove player from list in MongoDB
      room.players = room.players.filter(p => p.userId !== String(userId));
      await room.save();

      if (io) {
        io.to(roomId).emit('player_left', {
          userId: String(userId),
          players: room.players,
          playersCount: room.players.length
        });
      }

      return res.json({
        ok: true,
        message: 'Left room successfully',
        roomDeleted: false,
        playersCount: room.players.length
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/rooms/:roomId & POST /api/rooms/:roomId/end
 * Remove/delete room directly from MongoDB and notify all connected clients in real time.
 */
const removeRoomHandler = async (req, res, next) => {
  try {
    const roomId = req.params.roomId.toUpperCase().trim();
    const { userId, reason = 'Room deleted by request or admin' } = req.body || {};

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await Room.deleteOne({ roomId });

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room_deleted', { roomId, reason, endedBy: userId });
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

