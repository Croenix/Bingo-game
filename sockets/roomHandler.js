const Room = require('../models/Room');
const User = require('../models/User');
const { getVivoxUserUri, getVivoxChannelUri, generateVivoxToken } = require('../utils/vivox');

function registerRoomHandlers(io, socket) {
  const sendError = (eventName, message) => {
    socket.emit('room_error', { event: eventName, error: message });
  };

  /**
   * Event: create_room
   * Payload: { userId, userName, profileImageUrl, roomName, capacity, customRoomId, password, isPublic }
   */
  socket.on('create_room', async (payload = {}) => {
    try {
      const { userId, userName, profileImageUrl = '', roomName = 'Bingo Room', capacity = 4, customRoomId, roomId: inputRoomId, password = '', isPublic } = payload;
      if (!userId || !userName) {
        return sendError('create_room', 'userId and userName are required');
      }

      const userProfile = await User.findOne({ userId: String(userId).trim() });
      const trustedName = userProfile ? userProfile.name : userName;
      const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(profileImageUrl).trim();

      let finalRoomId = String(customRoomId || inputRoomId || '').toUpperCase().trim();

      if (finalRoomId) {
        const existingRoom = await Room.findOne({ roomId: finalRoomId });
        if (existingRoom) {
          return sendError('create_room', `Room ID '${finalRoomId}' is already taken`);
        }
      } else {
        // Generate random 6-character uppercase room code
        finalRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const trimPassword = String(password).trim();
      // Room is public if explicitly set to true OR if password is empty
      const roomIsPublic = isPublic !== undefined ? Boolean(isPublic) : (trimPassword.length === 0);

      const vivoxChannelUri = getVivoxChannelUri(finalRoomId);
      const vivoxUserUri = getVivoxUserUri(String(userId));
      const vivoxToken = generateVivoxToken({
        userUri: vivoxUserUri,
        action: 'join',
        targetUri: vivoxChannelUri
      });

      const newRoom = new Room({
        roomId: finalRoomId,
        name: roomName,
        password: trimPassword,
        isPublic: roomIsPublic,
        creatorId: String(userId),
        creatorName: trustedName,
        capacity: Math.min(Math.max(Number(capacity) || 4, 2), 10),
        status: 'waiting',
        vivoxChannelUri,
        players: [
          {
            userId: String(userId),
            name: trustedName,
            profileImageUrl: trustedProfileImageUrl,
            socketId: socket.id,
            isCreator: true,
            isReady: true,
            joinedAt: new Date()
          }
        ]
      });

      await newRoom.save();
      socket.join(finalRoomId);

      socket.emit('room_created', {
        ok: true,
        room: newRoom,
        vivox: {
          token: vivoxToken,
          channelUri: vivoxChannelUri,
          userUri: vivoxUserUri
        }
      });
    } catch (err) {
      console.error('Socket create_room error:', err);
      sendError('create_room', err.message || 'Failed to create room');
    }
  });

  /**
   * Event: join_room
   * Payload: { roomId, userId, userName, profileImageUrl, password }
   */
  socket.on('join_room', async (payload = {}) => {
    try {
      const { roomId, userId, userName, profileImageUrl = '', password = '' } = payload;
      if (!roomId || !userId || !userName) {
        return sendError('join_room', 'roomId, userId, and userName are required');
      }

      const userProfile = await User.findOne({ userId: String(userId).trim() });
      const trustedName = userProfile ? userProfile.name : userName;
      const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(profileImageUrl).trim();

      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) {
        return sendError('join_room', 'Room not found');
      }

      if (room.status === 'finished') {
        return sendError('join_room', 'Room has already finished');
      }

      // Check Password protection
      if (room.password && room.password !== String(password).trim()) {
        return sendError('join_room', 'Invalid room password');
      }

      // Check if user is already in room
      const existingPlayerIndex = room.players.findIndex(p => p.userId === String(userId));
      if (existingPlayerIndex === -1 && room.players.length >= room.capacity) {
        return sendError('join_room', 'Room capacity limit reached');
      }

      if (existingPlayerIndex !== -1) {
        room.players[existingPlayerIndex].socketId = socket.id;
        room.players[existingPlayerIndex].name = trustedName;
        if (trustedProfileImageUrl) {
          room.players[existingPlayerIndex].profileImageUrl = trustedProfileImageUrl;
        }
      } else {
        room.players.push({
          userId: String(userId),
          name: trustedName,
          profileImageUrl: trustedProfileImageUrl,
          socketId: socket.id,
          isCreator: String(userId) === String(room.creatorId),
          isReady: false,
          joinedAt: new Date()
        });
      }

      await room.save();
      socket.join(formattedRoomId);

      const vivoxChannelUri = room.vivoxChannelUri || getVivoxChannelUri(formattedRoomId);
      const vivoxUserUri = getVivoxUserUri(String(userId));
      const vivoxToken = generateVivoxToken({
        userUri: vivoxUserUri,
        action: 'join',
        targetUri: vivoxChannelUri
      });

      const responsePayload = {
        ok: true,
        room,
        vivox: {
          token: vivoxToken,
          channelUri: vivoxChannelUri,
          userUri: vivoxUserUri
        }
      };

      socket.emit('room_joined', responsePayload);
      socket.to(formattedRoomId).emit('player_joined', {
        player: { userId: String(userId), name: trustedName, profileImageUrl: trustedProfileImageUrl, socketId: socket.id },
        players: room.players,
        playersCount: room.players.length,
        capacity: room.capacity
      });
    } catch (err) {
      console.error('Socket join_room error:', err);
      sendError('join_room', err.message || 'Failed to join room');
    }
  });

  /**
   * Event: leave_room
   * Payload: { roomId, userId }
   */
  socket.on('leave_room', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return;

      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return;

      const isCreator = String(room.creatorId) === String(userId);

      if (isCreator) {
        await Room.deleteOne({ roomId: formattedRoomId });
        io.to(formattedRoomId).emit('room_deleted', {
          roomId: formattedRoomId,
          reason: 'Room creator has exited the room'
        });
        io.in(formattedRoomId).socketsLeave(formattedRoomId);
      } else {
        room.players = room.players.filter(p => p.userId !== String(userId));
        await room.save();
        socket.leave(formattedRoomId);
        socket.to(formattedRoomId).emit('player_left', {
          userId: String(userId),
          players: room.players,
          playersCount: room.players.length
        });
      }
    } catch (err) {
      console.error('Socket leave_room error:', err);
    }
  });

  /**
   * Event: end_game
   * Payload: { roomId, userId, gameResults }
   */
  socket.on('end_game', async (payload = {}) => {
    try {
      const { roomId, userId, gameResults = {} } = payload;
      if (!roomId) return;

      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return;

      await Room.deleteOne({ roomId: formattedRoomId });

      io.to(formattedRoomId).emit('game_ended', {
        roomId: formattedRoomId,
        endedBy: userId,
        results: gameResults,
        message: 'Game ended and room deleted'
      });
      io.to(formattedRoomId).emit('room_deleted', {
        roomId: formattedRoomId,
        reason: 'Game ended'
      });
      io.in(formattedRoomId).socketsLeave(formattedRoomId);
    } catch (err) {
      console.error('Socket end_game error:', err);
    }
  });

  /**
   * Event: disconnect
   */
  socket.on('disconnect', async () => {
    try {
      const roomsWithSocket = await Room.find({ 'players.socketId': socket.id });

      for (const room of roomsWithSocket) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) continue;

        if (player.isCreator || String(room.creatorId) === String(player.userId)) {
          await Room.deleteOne({ roomId: room.roomId });
          io.to(room.roomId).emit('room_deleted', {
            roomId: room.roomId,
            reason: 'Creator disconnected from room'
          });
          io.in(room.roomId).socketsLeave(room.roomId);
        } else {
          room.players = room.players.filter(p => p.socketId !== socket.id);
          await room.save();
          io.to(room.roomId).emit('player_left', {
            userId: player.userId,
            socketId: socket.id,
            players: room.players,
            playersCount: room.players.length
          });
        }
      }
    } catch (err) {
      console.error('Socket disconnect handler error:', err);
    }
  });
}

module.exports = registerRoomHandlers;

