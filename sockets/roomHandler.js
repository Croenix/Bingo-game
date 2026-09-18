const Room = require('../models/Room');
const User = require('../models/User');
const { generateUniqueRoomId } = require('../utils/roomIdGenerator');
const { getVivoxUserUri, getVivoxChannelUri, generateVivoxToken } = require('../utils/vivox');
const { generateUniqueBingoCard } = require('../utils/bingoCardGenerator');
const { calculateExpiresAt, checkAndRemoveIfExpired, sanitizeRoom } = require('../utils/roomHelpers');

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
      const { userId, userName, profileImageUrl = '', roomName: inputRoomName, name: inputName, capacity = 4, customRoomId, roomId: inputRoomId, password = '', isPublic } = payload;
      if (!userId || !userName) {
        return sendError('create_room', 'userId and userName are required');
      }

      const roomName = String(inputRoomName || inputName || 'Bingo Room').trim();
      if (!roomName) {
        return sendError('create_room', 'Room name is required');
      }

      // Enforce case-sensitive room name uniqueness
      const existingNameRoom = await Room.findOne({ name: roomName });
      if (existingNameRoom) {
        if (await checkAndRemoveIfExpired(existingNameRoom, io)) {
          // Room expired and removed
        } else {
          return sendError('create_room', `Room with name '${roomName}' already exists`);
        }
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const userProfile = await User.findOne({ userId: formattedUserId });
      const trustedName = userProfile ? userProfile.name : String(userName).trim();
      const trustedProfileImageUrl = (userProfile && userProfile.profileImageUrl) ? userProfile.profileImageUrl : String(profileImageUrl).trim();

      let finalRoomId = String(customRoomId || inputRoomId || '').toUpperCase().trim();

      if (finalRoomId) {
        const existingRoom = await Room.findOne({ roomId: finalRoomId });
        if (existingRoom) {
          if (await checkAndRemoveIfExpired(existingRoom, io)) {
            // Room expired and removed
          } else {
            return sendError('create_room', `Room ID '${finalRoomId}' is already taken`);
          }
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

      const expiresAt = calculateExpiresAt();
      const creatorBingoCard = generateUniqueBingoCard([]);

      const newRoom = new Room({
        roomId: finalRoomId,
        name: roomName,
        password: trimPassword,
        isPublic: roomIsPublic,
        creatorId: formattedUserId,
        creatorName: trustedName,
        capacity: Math.min(Math.max(Number(capacity) || 4, 2), 10),
        status: 'waiting',
        vivoxChannelUri,
        expiresAt,
        players: [
          {
            userId: formattedUserId,
            name: trustedName,
            profileImageUrl: trustedProfileImageUrl,
            socketId: socket.id,
            isCreator: true,
            isReady: true,
            joinedAt: new Date(),
            bingoCard: creatorBingoCard
          }
        ]
      });

      await newRoom.save();
      socket.join(finalRoomId);

      const sanitizedRoom = sanitizeRoom(newRoom);

      socket.emit('room_created', {
        ok: true,
        room: sanitizedRoom,
        myBingoCard: creatorBingoCard,
        vivox: {
          token: vivoxToken,
          channelUri: vivoxChannelUri,
          userUri: vivoxUserUri
        }
      });

      socket.emit('bingo_card_assigned', {
        roomId: finalRoomId,
        bingoCard: creatorBingoCard
      });
    } catch (err) {
      console.error('Socket create_room error:', err);
      if (err.code === 11000) {
        if (err.keyPattern && err.keyPattern.name) {
          return sendError('create_room', `Room with name '${String(payload.roomName || payload.name || '').trim()}' already exists`);
        }
        return sendError('create_room', 'Room ID or Room Name already exists');
      }
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

      if (await checkAndRemoveIfExpired(room, io)) {
        return sendError('join_room', 'Room has expired');
      }

      if (room.status === 'finished') {
        return sendError('join_room', 'Room has already finished');
      }

      if (room.password && room.password !== String(password).trim()) {
        return sendError('join_room', 'Invalid room password');
      }

      const existingPlayer = room.players.find(p => p.userId === formattedUserId);

      let updatedRoom;
      let playerBingoCard;

      if (existingPlayer) {
        // Update existing player socketId and profile while preserving Bingo card
        playerBingoCard = existingPlayer.bingoCard;
        if (!playerBingoCard || !Array.isArray(playerBingoCard.numbers)) {
          playerBingoCard = generateUniqueBingoCard(room.players);
        }

        updatedRoom = await Room.findOneAndUpdate(
          { roomId: formattedRoomId, 'players.userId': formattedUserId },
          {
            $set: {
              'players.$.socketId': socket.id,
              'players.$.name': trustedName,
              'players.$.profileImageUrl': trustedProfileImageUrl || existingPlayer.profileImageUrl,
              'players.$.bingoCard': playerBingoCard
            }
          },
          { new: true }
        );
      } else {
        // Atomic push with capacity check directly inside query filter
        playerBingoCard = generateUniqueBingoCard(room.players);

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
                joinedAt: new Date(),
                bingoCard: playerBingoCard
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

      const sanitizedRoom = sanitizeRoom(updatedRoom);

      const responsePayload = {
        ok: true,
        room: sanitizedRoom,
        myBingoCard: playerBingoCard,
        vivox: {
          token: vivoxToken,
          channelUri: vivoxChannelUri,
          userUri: vivoxUserUri
        }
      };

      socket.emit('room_joined', responsePayload);
      socket.emit('bingo_card_assigned', {
        roomId: formattedRoomId,
        bingoCard: playerBingoCard
      });

      socket.to(formattedRoomId).emit('player_joined', {
        player: { userId: formattedUserId, name: trustedName, profileImageUrl: trustedProfileImageUrl, socketId: socket.id },
        players: sanitizedRoom.players,
        playersCount: sanitizedRoom.players.length,
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

      // Requirement 4: Creator leaves -> Delete room completely (No host migration)
      if (room.creatorId === formattedUserId) {
        console.log(`[Socket] Creator ${formattedUserId} left room ${formattedRoomId}. Deleting room.`);
        await Room.deleteOne({ roomId: formattedRoomId });
        io.to(formattedRoomId).emit('room_deleted', {
          roomId: formattedRoomId,
          reason: 'Room creator left the room',
          deletedBy: formattedUserId
        });
        io.in(formattedRoomId).socketsLeave(formattedRoomId);
        return;
      }

      // Non-creator leaves -> Remove player
      room.players = room.players.filter(p => p.userId !== formattedUserId);

      if (room.players.length === 0) {
        await Room.deleteOne({ roomId: formattedRoomId });
        io.to(formattedRoomId).emit('room_deleted', {
          roomId: formattedRoomId,
          reason: 'All players left the room'
        });
        io.in(formattedRoomId).socketsLeave(formattedRoomId);
      } else {
        await room.save();
        const sanitizedRoom = sanitizeRoom(room);

        io.to(formattedRoomId).emit('player_left', {
          userId: formattedUserId,
          players: sanitizedRoom.players,
          playersCount: room.players.length,
          creatorId: room.creatorId
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

        // Requirement 4: Creator disconnects -> Delete entire room (No host migration)
        if (room.creatorId === formattedUserId) {
          console.log(`[Socket] Creator ${formattedUserId} disconnected from room ${formattedRoomId}. Deleting room.`);
          await Room.deleteOne({ roomId: formattedRoomId });
          io.to(formattedRoomId).emit('room_deleted', {
            roomId: formattedRoomId,
            reason: 'Room creator disconnected from room',
            deletedBy: formattedUserId
          });
          io.in(formattedRoomId).socketsLeave(formattedRoomId);
          continue;
        }

        // Non-creator disconnects -> Remove player
        room.players = room.players.filter(p => p.socketId !== socket.id);

        if (room.players.length === 0) {
          await Room.deleteOne({ roomId: formattedRoomId });
          io.to(formattedRoomId).emit('room_deleted', {
            roomId: formattedRoomId,
            reason: 'All players disconnected from room'
          });
          io.in(formattedRoomId).socketsLeave(formattedRoomId);
        } else {
          await room.save();
          const sanitizedRoom = sanitizeRoom(room);

          io.to(formattedRoomId).emit('player_left', {
            userId: formattedUserId,
            socketId: socket.id,
            players: sanitizedRoom.players,
            playersCount: room.players.length,
            creatorId: room.creatorId
          });
        }
      }
    } catch (err) {
      console.error('Socket disconnect handler error:', err);
    }
  });
}

module.exports = registerRoomHandlers;
