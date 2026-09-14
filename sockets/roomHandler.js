const Room = require('../models/Room');
const User = require('../models/User');
const { generateUniqueRoomId } = require('../utils/roomIdGenerator');
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

      const formattedUserId = String(userId).trim().toUpperCase();
      const userProfile = await User.findOne({ userId: formattedUserId });
      const trustedName = userProfile ? userProfile.name : String(userName).trim();
      const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(profileImageUrl).trim();

      let finalRoomId = String(customRoomId || inputRoomId || '').toUpperCase().trim();

      if (finalRoomId) {
        const existingRoom = await Room.findOne({ roomId: finalRoomId });
        if (existingRoom) {
          return sendError('create_room', `Room ID '${finalRoomId}' is already taken`);
        }
      } else {
        finalRoomId = await generateUniqueRoomId(Room);
      }

      const trimPassword = String(password).trim();
      const roomIsPublic = isPublic !== undefined ? Boolean(isPublic) : (trimPassword.length === 0);

      const vivoxChannelUri = getVivoxChannelUri(finalRoomId);
      const vivoxUserUri = getVivoxUserUri(formattedUserId);
      const vivoxToken = generateVivoxToken({
        userUri: vivoxUserUri,
        action: 'join',
        targetUri: vivoxChannelUri
      });

      const newRoom = new Room({
        roomId: finalRoomId,
        name: String(roomName).trim(),
        password: trimPassword,
        isPublic: roomIsPublic,
        creatorId: formattedUserId,
        creatorName: trustedName,
        capacity: Math.min(Math.max(Number(capacity) || 4, 2), 10),
        status: 'waiting',
        vivoxChannelUri,
        players: [
          {
            userId: formattedUserId,
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

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();

      const userProfile = await User.findOne({ userId: formattedUserId });
      const trustedName = userProfile ? userProfile.name : String(userName).trim();
      const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(profileImageUrl).trim();

      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) {
        return sendError('join_room', 'Room not found');
      }

      if (room.status === 'finished') {
        return sendError('join_room', 'Room has already finished');
      }

      if (room.password && room.password !== String(password).trim()) {
        return sendError('join_room', 'Invalid room password');
      }

      const existingPlayer = room.players.find(p => p.userId === formattedUserId);

      let updatedRoom;
      if (existingPlayer) {
        // Update existing player socketId and profile
        updatedRoom = await Room.findOneAndUpdate(
          { roomId: formattedRoomId, 'players.userId': formattedUserId },
          {
            $set: {
              'players.$.socketId': socket.id,
              'players.$.name': trustedName,
              'players.$.profileImageUrl': trustedProfileImageUrl || existingPlayer.profileImageUrl
            }
          },
          { new: true }
        );
      } else {
        // Atomic push with capacity check directly inside query filter
        updatedRoom = await Room.findOneAndUpdate(
          {
            roomId: formattedRoomId,
            status: 'waiting',
            'players.userId': { $ne: formattedUserId },
            $expr: { $lt: [{ $size: '$players' }, '$capacity'] }
          },
          {
            $push: {
              players: {
                userId: formattedUserId,
                name: trustedName,
                profileImageUrl: trustedProfileImageUrl,
                socketId: socket.id,
                isCreator: formattedUserId === room.creatorId,
                isReady: false,
                joinedAt: new Date()
              }
            }
          },
          { new: true }
        );

        if (!updatedRoom) {
          const currentRoom = await Room.findOne({ roomId: formattedRoomId });
          if (currentRoom && currentRoom.players.length >= currentRoom.capacity) {
            return sendError('join_room', 'Room capacity limit reached');
          }
          return sendError('join_room', 'Unable to join room');
        }
      }

      socket.join(formattedRoomId);

      const vivoxChannelUri = updatedRoom.vivoxChannelUri || getVivoxChannelUri(formattedRoomId);
      const vivoxUserUri = getVivoxUserUri(formattedUserId);
      const vivoxToken = generateVivoxToken({
        userUri: vivoxUserUri,
        action: 'join',
        targetUri: vivoxChannelUri
      });

      const responsePayload = {
        ok: true,
        room: updatedRoom,
        vivox: {
          token: vivoxToken,
          channelUri: vivoxChannelUri,
          userUri: vivoxUserUri
        }
      };

      socket.emit('room_joined', responsePayload);
      socket.to(formattedRoomId).emit('player_joined', {
        player: { userId: formattedUserId, name: trustedName, profileImageUrl: trustedProfileImageUrl, socketId: socket.id },
        players: updatedRoom.players,
        playersCount: updatedRoom.players.length,
        capacity: updatedRoom.capacity
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

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return;

      socket.leave(formattedRoomId);
      room.players = room.players.filter(p => p.userId !== formattedUserId);

      if (room.players.length === 0) {
        await Room.deleteOne({ roomId: formattedRoomId });
        io.to(formattedRoomId).emit('room_deleted', {
          roomId: formattedRoomId,
          reason: 'All players left the room'
        });
        io.in(formattedRoomId).socketsLeave(formattedRoomId);
      } else {
        let hostMigrated = false;
        if (room.creatorId === formattedUserId) {
          room.players[0].isCreator = true;
          room.creatorId = room.players[0].userId;
          room.creatorName = room.players[0].name;
          hostMigrated = true;
        }

        await room.save();

        io.to(formattedRoomId).emit('player_left', {
          userId: formattedUserId,
          players: room.players,
          playersCount: room.players.length,
          newCreatorId: room.creatorId
        });

        if (hostMigrated) {
          io.to(formattedRoomId).emit('host_changed', {
            roomId: formattedRoomId,
            newHost: { userId: room.creatorId, name: room.creatorName }
          });
        }
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
      if (!roomId || !userId) {
        return sendError('end_game', 'roomId and userId are required to end game');
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) {
        return sendError('end_game', 'Room not found');
      }

      // Authorization Check: Only room creator can trigger end_game
      if (room.creatorId !== formattedUserId) {
        return sendError('end_game', 'Unauthorized: Only the room creator can end the game');
      }

      await Room.deleteOne({ roomId: formattedRoomId });

      io.to(formattedRoomId).emit('game_ended', {
        roomId: formattedRoomId,
        endedBy: formattedUserId,
        results: gameResults,
        message: 'Game ended and room deleted'
      });
      io.to(formattedRoomId).emit('room_deleted', {
        roomId: formattedRoomId,
        reason: 'Game ended by room creator'
      });
      io.in(formattedRoomId).socketsLeave(formattedRoomId);
    } catch (err) {
      console.error('Socket end_game error:', err);
      sendError('end_game', err.message || 'Failed to end game');
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

        const formattedUserId = player.userId;
        const formattedRoomId = room.roomId;

        room.players = room.players.filter(p => p.socketId !== socket.id);

        if (room.players.length === 0) {
          await Room.deleteOne({ roomId: formattedRoomId });
          io.to(formattedRoomId).emit('room_deleted', {
            roomId: formattedRoomId,
            reason: 'All players disconnected from room'
          });
          io.in(formattedRoomId).socketsLeave(formattedRoomId);
        } else {
          let hostMigrated = false;
          if (room.creatorId === formattedUserId) {
            room.players[0].isCreator = true;
            room.creatorId = room.players[0].userId;
            room.creatorName = room.players[0].name;
            hostMigrated = true;
          }

          await room.save();

          io.to(formattedRoomId).emit('player_left', {
            userId: formattedUserId,
            socketId: socket.id,
            players: room.players,
            playersCount: room.players.length,
            newCreatorId: room.creatorId
          });

          if (hostMigrated) {
            io.to(formattedRoomId).emit('host_changed', {
              roomId: formattedRoomId,
              newHost: { userId: room.creatorId, name: room.creatorName }
            });
          }
        }
      }
    } catch (err) {
      console.error('Socket disconnect handler error:', err);
    }
  });
}

module.exports = registerRoomHandlers;

