const Room = require('../models/Room');
const User = require('../models/User');
const { generateUniqueRoomId } = require('../utils/roomIdGenerator');
const { getVivoxUserUri, getVivoxChannelUri, generateVivoxToken } = require('../utils/vivox');
const { generateUniqueBingoCard } = require('../utils/bingoCardGenerator');
const { calculateExpiresAt, checkAndRemoveIfExpired, sanitizeRoom } = require('../utils/roomHelpers');

function getCellLetter(cell) {
  if (!cell) return '';
  if (typeof cell === 'object') return cell.letter || '';
  return String(cell);
}

function checkFormedSOS(grid, boardSize, row, col, activeUserId, activeUserName, existingCompletedSOS) {
  const newSOSList = [];
  const existingSet = new Set(
    (existingCompletedSOS || []).map(sos => {
      const pts = [...sos.coords].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
      return pts.map(p => `${p[0]},${p[1]}`).join('|');
    })
  );

  const directions = [
    [0, 1],   // Horizontal
    [1, 0],   // Vertical
    [1, 1],   // Main Diagonal
    [-1, 1]   // Anti-Diagonal
  ];

  for (const [dr, dc] of directions) {
    for (let offset = -2; offset <= 0; offset++) {
      const r0 = row + offset * dr;
      const c0 = col + offset * dc;
      const r1 = r0 + dr;
      const c1 = c0 + dc;
      const r2 = r0 + 2 * dr;
      const c2 = c0 + 2 * dc;

      if (
        r0 >= 0 && r0 < boardSize && c0 >= 0 && c0 < boardSize &&
        r1 >= 0 && r1 < boardSize && c1 >= 0 && c1 < boardSize &&
        r2 >= 0 && r2 < boardSize && c2 >= 0 && c2 < boardSize
      ) {
        if (
          getCellLetter(grid[r0][c0]) === 'S' &&
          getCellLetter(grid[r1][c1]) === 'O' &&
          getCellLetter(grid[r2][c2]) === 'S'
        ) {
          const coords = [[r0, c0], [r1, c1], [r2, c2]];
          const sortedCoords = [...coords].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
          const lineKey = sortedCoords.map(p => `${p[0]},${p[1]}`).join('|');

          if (!existingSet.has(lineKey)) {
            existingSet.add(lineKey);
            newSOSList.push({
              playerUserId: activeUserId,
              playerName: activeUserName,
              coords
            });
          }
        }
      }
    }
  }

  return newSOSList;
}

function createLiarsDeckForPlayers(playerCount, variant = 'standard') {
  const numPlayers = Math.max(1, playerCount);
  const cardsPerPlayer = 10; // 10 cards per player as requested!
  const totalCardsNeeded = numPlayers * cardsPerPlayer;

  // Equal distribution among Kings, Queens, and Aces
  const baseCountPerRank = Math.floor(totalCardsNeeded / 3);
  let remainder = totalCardsNeeded % 3;

  let kings = baseCountPerRank + (remainder > 0 ? 1 : 0);
  let queens = baseCountPerRank + (remainder > 1 ? 1 : 0);
  let aces = baseCountPerRank;

  let deck = [];
  for (let i = 0; i < kings; i++) deck.push('King');
  for (let i = 0; i < queens; i++) deck.push('Queen');
  for (let i = 0; i < aces; i++) deck.push('Ace');

  // If Devil variant: exactly 1 Devil Card in the deck! Replace 1 random normal card
  if (variant === 'devil' && deck.length > 0) {
    const replaceIdx = Math.floor(Math.random() * deck.length);
    deck[replaceIdx] = 'Devil';
  } else if (variant === 'chaos' && deck.length > 0) {
    const replaceIdx = Math.floor(Math.random() * deck.length);
    deck[replaceIdx] = 'Chaos';
  }

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function initializeGameData(room) {
  const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
  room.status = 'playing';

  if (room.gameType === 'sos') {
    const size = [3, 5].includes(room.boardSize) ? room.boardSize : 5;
    const grid = Array(size).fill(null).map(() => Array(size).fill(''));
    const scores = {};
    const playerLetters = {};
    const playerColors = ['#38bdf8', '#10b981', '#f43f5e'];
    const letterAssignments = [
      { letter: 'S', letterId: 'S1', label: 'S₁' },
      { letter: 'O', letterId: 'O', label: 'O' },
      { letter: 'S', letterId: 'S2', label: 'S₂' }
    ];

    room.players.forEach((p, idx) => {
      scores[p.userId] = 0;
      const assign = letterAssignments[idx] || { letter: 'S', letterId: `S${idx + 1}`, label: `S${idx + 1}` };
      playerLetters[p.userId] = {
        letter: assign.letter,
        letterId: assign.letterId,
        label: assign.label,
        color: playerColors[idx % playerColors.length],
        playerIndex: idx + 1
      };
    });

    room.gameData = {
      ...(room.gameData || {}),
      gameType: 'sos',
      boardSize: size,
      grid,
      scores,
      playerLetters,
      completedSOS: [],
      currentTurnUserId: firstPlayer.userId,
      currentTurnName: firstPlayer.name,
      startedAt: Date.now(),
      winners: []
    };
  } else if (room.gameType === 'liars_bar') {
    const mode = room.liarsMode || 'deck';
    const variant = room.liarsDeckVariant || 'standard';

    if (mode === 'deck') {
      const ranks = ['King', 'Queen', 'Ace'];
      const tableRank = ranks[Math.floor(Math.random() * ranks.length)];
      const fullDeck = createLiarsDeckForPlayers(room.players.length, variant);

      const playerHands = {};
      const revolvers = {};

      room.players.forEach((p, idx) => {
        // Deal 10 cards per player!
        const hand = fullDeck.slice(idx * 10, (idx + 1) * 10);
        playerHands[p.userId] = hand;
        revolvers[p.userId] = {
          chambersLeft: 6,
          bulletIndex: Math.floor(Math.random() * 6) + 1,
          currentChamber: 1,
          isAlive: true
        };
      });

      room.gameData = {
        ...(room.gameData || {}),
        gameType: 'liars_bar',
        liarsMode: 'deck',
        liarsDeckVariant: variant,
        tableRank,
        playerHands,
        revolvers,
        centerPile: [],
        lastPlay: null,
        pendingRoulette: null,
        currentTurnUserId: firstPlayer.userId,
        currentTurnName: firstPlayer.name,
        startedAt: Date.now(),
        winners: []
      };
    } else {
      // Liar's Dice Mode
      const playerDice = {};
      const poisonDoses = {};
      const alivePlayers = {};

      room.players.forEach(p => {
        playerDice[p.userId] = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
        poisonDoses[p.userId] = 0;
        alivePlayers[p.userId] = true;
      });

      room.gameData = {
        ...(room.gameData || {}),
        gameType: 'liars_bar',
        liarsMode: 'dice',
        playerDice,
        poisonDoses,
        alivePlayers,
        currentBid: null,
        currentTurnUserId: firstPlayer.userId,
        currentTurnName: firstPlayer.name,
        startedAt: Date.now(),
        winners: []
      };
    }
  } else {
    room.gameData = {
      ...(room.gameData || {}),
      gameType: 'bingo',
      currentTurnUserId: firstPlayer.userId,
      currentTurnName: firstPlayer.name,
      pickedNumbers: [],
      lastPickedNumber: null,
      lastPickedBy: null,
      startedAt: Date.now(),
      winners: []
    };
  }

  return firstPlayer;
}

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
      const {
        userId,
        userName,
        profileImageUrl = '',
        roomName: inputRoomName,
        name: inputName,
        capacity = 4,
        customRoomId,
        roomId: inputRoomId,
        password = '',
        isPublic,
        challengeId = '',
        entryCoin = 0,
        entryCurrencyType = 'coins',
        rewardCoin = 0,
        rewardCurrencyType = 'coins',
        gameType: inputGameType = 'bingo',
        boardSize: inputBoardSize = 5,
        liarsMode: inputLiarsMode = 'deck',
        liarsDeckVariant: inputLiarsVariant = 'standard'
      } = payload;

      const gameType = ['bingo', 'sos', 'liars_bar'].includes(String(inputGameType).toLowerCase()) ? String(inputGameType).toLowerCase() : 'bingo';
      const boardSize = [3, 5].includes(Number(inputBoardSize)) ? Number(inputBoardSize) : 5;
      const liarsMode = ['deck', 'dice'].includes(String(inputLiarsMode).toLowerCase()) ? String(inputLiarsMode).toLowerCase() : 'deck';
      const liarsDeckVariant = ['standard', 'devil', 'chaos'].includes(String(inputLiarsVariant).toLowerCase()) ? String(inputLiarsVariant).toLowerCase() : 'standard';
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

      const reqEntry = Math.max(0, Number(entryCoin) || 0);
      const reqReward = Math.max(0, Number(rewardCoin) || 0);
      const entryType = entryCurrencyType === 'gems' ? 'gems' : 'coins';
      const rewardType = rewardCurrencyType === 'gems' ? 'gems' : 'coins';

      if (reqEntry > 0) {
        if (!userProfile) {
          return sendError('create_room', 'User profile not found to process entry fee');
        }
        const currentBal = entryType === 'gems' ? (userProfile.gems || 0) : (userProfile.coins || 0);
        if (currentBal < reqEntry) {
          const icon = entryType === 'gems' ? '💎' : '🪙';
          return sendError('create_room', `Insufficient balance! You need at least ${reqEntry} ${icon} to enter this challenge.`);
        }
      }

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

      let vivoxToken = null;
      const vivoxChannelUri = getVivoxChannelUri(finalRoomId);
      const vivoxUserUri = getVivoxUserUri(formattedUserId);
      try {
        vivoxToken = generateVivoxToken({
          userUri: vivoxUserUri,
          action: 'join',
          targetUri: vivoxChannelUri
        });
      } catch (err) {
        console.warn('[Vivox] Room creation token generation error (falling back to WebRTC):', err.message);
      }

      const expiresAt = calculateExpiresAt();
      const creatorBingoCard = generateUniqueBingoCard([]);

      const newRoom = new Room({
        roomId: finalRoomId,
        name: roomName,
        password: trimPassword,
        isPublic: roomIsPublic,
        creatorId: formattedUserId,
        creatorName: trustedName,
        capacity: gameType === 'sos' ? Math.min(Math.max(Number(capacity) || 3, 2), 3) : Math.min(Math.max(Number(capacity) || 4, 2), 10),
        gameType,
        boardSize,
        liarsMode,
        liarsDeckVariant,
        status: 'waiting',
        vivoxChannelUri,
        expiresAt,
        gameData: {
          challengeId,
          entryCoin: reqEntry,
          entryCurrencyType: entryType,
          rewardCoin: reqReward,
          rewardCurrencyType: rewardType
        },
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

      if (reqEntry > 0) {
        const updatedUser = await User.findOneAndUpdate(
          { userId: formattedUserId },
          { $inc: { [entryType]: -reqEntry } },
          { new: true }
        );
        if (updatedUser) {
          socket.emit('user_balance_updated', {
            coins: updatedUser.coins,
            gems: updatedUser.gems,
            deducted: reqEntry,
            currencyType: entryType,
            reason: `Deducted ${reqEntry} ${entryType === 'gems' ? '💎' : '🪙'} challenge entry fee`
          });
        }
      }

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

      if (!existingPlayer && room.gameData && Number(room.gameData.entryCoin) > 0) {
        const reqEntry = Number(room.gameData.entryCoin);
        const entryType = room.gameData.entryCurrencyType === 'gems' ? 'gems' : 'coins';
        const icon = entryType === 'gems' ? '💎' : '🪙';

        if (!userProfile) {
          return sendError('join_room', 'User profile not found to process entry fee');
        }
        const currentBal = entryType === 'gems' ? (userProfile.gems || 0) : (userProfile.coins || 0);
        if (currentBal < reqEntry) {
          return sendError('join_room', `Insufficient balance! You need at least ${reqEntry} ${icon} to join this challenge room.`);
        }

        const updatedUser = await User.findOneAndUpdate(
          { userId: formattedUserId },
          { $inc: { [entryType]: -reqEntry } },
          { new: true }
        );
        if (updatedUser) {
          socket.emit('user_balance_updated', {
            coins: updatedUser.coins,
            gems: updatedUser.gems,
            deducted: reqEntry,
            currencyType: entryType,
            reason: `Deducted ${reqEntry} ${icon} challenge entry fee`
          });
        }
      }

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

      let vivoxToken = null;
      const vivoxChannelUri = updatedRoom.vivoxChannelUri || getVivoxChannelUri(formattedRoomId);
      const vivoxUserUri = getVivoxUserUri(formattedUserId);
      try {
        vivoxToken = generateVivoxToken({
          userUri: vivoxUserUri,
          action: 'join',
          targetUri: vivoxChannelUri
        });
      } catch (err) {
        console.warn('[Vivox] Join token generation error (falling back to WebRTC):', err.message);
      }

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

      // Auto-start game if capacity limit is reached
      if (updatedRoom.status === 'waiting' && updatedRoom.players.length >= updatedRoom.capacity) {
        const firstPlayer = initializeGameData(updatedRoom);
        await updatedRoom.save();

        io.to(formattedRoomId).emit('game_started', {
          roomId: formattedRoomId,
          gameType: updatedRoom.gameType || 'bingo',
          boardSize: updatedRoom.boardSize || 5,
          status: 'playing',
          currentTurnUserId: firstPlayer.userId,
          currentTurnName: firstPlayer.name,
          players: updatedRoom.players,
          startedAt: updatedRoom.gameData.startedAt,
          gameData: updatedRoom.gameData,
          ...(updatedRoom.gameType === 'sos' ? {
            grid: updatedRoom.gameData.grid,
            scores: updatedRoom.gameData.scores,
            completedSOS: updatedRoom.gameData.completedSOS,
            playerLetters: updatedRoom.gameData.playerLetters
          } : {})
        });
      }
    } catch (err) {
      console.error('Socket join_room error:', err);
      sendError('join_room', err.message || 'Failed to join room');
    }
  });

  /**
   * Event: start_game (Host manually starts game before room reaches full capacity)
   * Payload: { roomId, userId }
   */
  socket.on('start_game', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return sendError('start_game', 'roomId and userId are required');

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('start_game', 'Room not found');

      if (room.creatorId !== formattedUserId) {
        return sendError('start_game', 'Only the room host can start the game');
      }

      if (room.players.length < 1) {
        return sendError('start_game', 'Not enough players in room');
      }

      const firstPlayer = initializeGameData(room);
      await room.save();

      io.to(formattedRoomId).emit('game_started', {
        roomId: formattedRoomId,
        gameType: room.gameType || 'bingo',
        boardSize: room.boardSize || 5,
        status: 'playing',
        currentTurnUserId: firstPlayer.userId,
        currentTurnName: firstPlayer.name,
        players: room.players,
        startedAt: room.gameData.startedAt,
        gameData: room.gameData,
        ...(room.gameType === 'sos' ? {
          grid: room.gameData.grid,
          scores: room.gameData.scores,
          completedSOS: room.gameData.completedSOS,
          playerLetters: room.gameData.playerLetters
        } : {})
      });
    } catch (err) {
      console.error('Socket start_game error:', err);
      sendError('start_game', err.message || 'Failed to start game');
    }
  });

  /**
   * Event: sos_make_move
   * Payload: { roomId, userId, row, col, letter }
   */
  socket.on('sos_make_move', async (payload = {}) => {
    try {
      const { roomId, userId, row, col, letter } = payload;
      if (!roomId || !userId || row === undefined || col === undefined || !letter) {
        return sendError('sos_make_move', 'roomId, userId, row, col, and letter are required');
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const selectedLetter = String(letter).toUpperCase().trim();

      if (!['S', 'O'].includes(selectedLetter)) {
        return sendError('sos_make_move', 'Letter must be S or O');
      }

      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('sos_make_move', 'Room not found');

      if (room.gameType !== 'sos') {
        return sendError('sos_make_move', 'This room is not an SOS room');
      }

      if (room.status !== 'playing') {
        return sendError('sos_make_move', 'Game is not currently active');
      }

      if (!room.gameData || room.gameData.currentTurnUserId !== formattedUserId) {
        return sendError('sos_make_move', "It's not your turn!");
      }

      const boardSize = room.boardSize || 5;
      const r = Number(row);
      const c = Number(col);

      if (isNaN(r) || isNaN(c) || r < 0 || r >= boardSize || c < 0 || c >= boardSize) {
        return sendError('sos_make_move', 'Invalid row or column indices');
      }

      const assignedLetterObj = (room.gameData && room.gameData.playerLetters) ? room.gameData.playerLetters[formattedUserId] : null;
      const moveLetter = assignedLetterObj ? assignedLetterObj.letter : (selectedLetter || 'S');
      const moveLetterId = assignedLetterObj ? assignedLetterObj.letterId : moveLetter;
      const moveColor = assignedLetterObj ? assignedLetterObj.color : '#38bdf8';

      let grid = room.gameData.grid || Array(boardSize).fill(null).map(() => Array(boardSize).fill(''));
      if (getCellLetter(grid[r] ? grid[r][c] : '') !== '') {
        return sendError('sos_make_move', 'Cell is already occupied');
      }

      const playerObj = room.players.find(p => p.userId === formattedUserId);
      const playerName = playerObj ? playerObj.name : formattedUserId;

      grid[r][c] = {
        letter: moveLetter,
        letterId: moveLetterId,
        color: moveColor,
        placedBy: formattedUserId,
        playerName
      };

      const newSOSLines = checkFormedSOS(
        grid,
        boardSize,
        r,
        c,
        formattedUserId,
        playerName,
        room.gameData.completedSOS || []
      );

      let scores = room.gameData.scores || {};
      if (typeof scores[formattedUserId] !== 'number') {
        scores[formattedUserId] = 0;
      }

      if (newSOSLines.length > 0) {
        scores[formattedUserId] += newSOSLines.length;
        if (!room.gameData.completedSOS) room.gameData.completedSOS = [];
        room.gameData.completedSOS.push(...newSOSLines);
      }

      room.gameData.grid = grid;
      room.gameData.scores = scores;
      room.markModified('gameData.grid');
      room.markModified('gameData.scores');
      room.markModified('gameData.completedSOS');

      // Check if grid is completely filled
      let isBoardFull = true;
      for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
          if (getCellLetter(grid[i][j]) === '') {
            isBoardFull = false;
            break;
          }
        }
        if (!isBoardFull) break;
      }

      let extraTurnGranted = false;
      if (isBoardFull) {
        room.status = 'finished';
        let maxScore = -1;
        for (const p of room.players) {
          const s = scores[p.userId] || 0;
          if (s > maxScore) maxScore = s;
        }

        const winners = room.players
          .filter(p => (scores[p.userId] || 0) === maxScore)
          .map(p => ({ userId: p.userId, name: p.name, score: scores[p.userId] || 0 }));

        room.gameData.winners = winners;
        room.markModified('gameData');
        await room.save();

        io.to(formattedRoomId).emit('sos_move_made', {
          roomId: formattedRoomId,
          placedBy: { userId: formattedUserId, name: playerName },
          row: r,
          col: c,
          letter: moveLetter,
          letterId: moveLetterId,
          color: moveColor,
          grid,
          scores,
          playerLetters: room.gameData.playerLetters,
          newSOSLines,
          completedSOS: room.gameData.completedSOS,
          currentTurnUserId: room.gameData.currentTurnUserId,
          currentTurnName: room.gameData.currentTurnName,
          extraTurn: false,
          isFinished: true
        });

        io.to(formattedRoomId).emit('sos_game_over', {
          roomId: formattedRoomId,
          winners,
          scores,
          playerLetters: room.gameData.playerLetters,
          completedSOS: room.gameData.completedSOS,
          grid
        });

        return;
      }

      // If SOS formed -> Extra turn granted to current player! Else next player's turn.
      if (newSOSLines.length > 0) {
        extraTurnGranted = true;
      } else {
        const currIdx = room.players.findIndex(p => p.userId === formattedUserId);
        const nextPlayer = room.players[(currIdx + 1) % room.players.length];
        room.gameData.currentTurnUserId = nextPlayer.userId;
        room.gameData.currentTurnName = nextPlayer.name;
      }

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('sos_move_made', {
        roomId: formattedRoomId,
        placedBy: { userId: formattedUserId, name: playerName },
        row: r,
        col: c,
        letter: moveLetter,
        letterId: moveLetterId,
        color: moveColor,
        grid,
        scores,
        playerLetters: room.gameData.playerLetters,
        newSOSLines,
        completedSOS: room.gameData.completedSOS,
        currentTurnUserId: room.gameData.currentTurnUserId,
        currentTurnName: room.gameData.currentTurnName,
        extraTurn: extraTurnGranted,
        isFinished: false
      });
    } catch (err) {
      console.error('Socket sos_make_move error:', err);
      sendError('sos_make_move', err.message || 'Failed to make SOS move');
    }
  });

  // ==========================================================================
  // Liar's Bar Socket Handlers (Liar's Deck & Liar's Dice)
  // ==========================================================================

  /**
   * Event: liars_play_cards
   * Payload: { roomId, userId, cardIndexes }
   */
  socket.on('liars_play_cards', async (payload = {}) => {
    try {
      const { roomId, userId, cardIndexes } = payload;
      if (!roomId || !userId || !Array.isArray(cardIndexes) || cardIndexes.length === 0) {
        return sendError('liars_play_cards', 'roomId, userId, and cardIndexes array are required');
      }

      if (cardIndexes.length > 3) {
        return sendError('liars_play_cards', 'You can play at most 3 cards per turn');
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('liars_play_cards', 'Room not found');

      if (room.gameType !== 'liars_bar' || (room.liarsMode && room.liarsMode !== 'deck')) {
        return sendError('liars_play_cards', 'Not a Liar’s Deck room');
      }

      if (room.status !== 'playing') {
        return sendError('liars_play_cards', 'Game is not currently active');
      }

      if (!room.gameData || room.gameData.currentTurnUserId !== formattedUserId) {
        return sendError('liars_play_cards', "It's not your turn!");
      }

      const playerHand = (room.gameData.playerHands && room.gameData.playerHands[formattedUserId]) || [];
      const playedCards = [];
      const remainingHand = [...playerHand];

      const sortedIndexes = [...cardIndexes].sort((a, b) => b - a);
      for (const idx of sortedIndexes) {
        if (idx < 0 || idx >= remainingHand.length) {
          return sendError('liars_play_cards', 'Invalid card index selected');
        }
        playedCards.push(remainingHand[idx]);
        remainingHand.splice(idx, 1);
      }

      room.gameData.playerHands[formattedUserId] = remainingHand;
      if (!room.gameData.centerPile) room.gameData.centerPile = [];

      const playerObj = room.players.find(p => p.userId === formattedUserId);
      const playerName = playerObj ? playerObj.name : formattedUserId;

      const playRecord = {
        playerUserId: formattedUserId,
        playerName,
        cards: playedCards,
        count: playedCards.length
      };

      room.gameData.centerPile.push(playRecord);
      room.gameData.lastPlay = playRecord;

      const revolvers = room.gameData.revolvers || {};
      const alivePlayers = room.players.filter(p => revolvers[p.userId] && revolvers[p.userId].isAlive);
      
      const currIdx = alivePlayers.findIndex(p => p.userId === formattedUserId);
      const nextPlayer = alivePlayers[(currIdx + 1) % alivePlayers.length];

      room.gameData.currentTurnUserId = nextPlayer.userId;
      room.gameData.currentTurnName = nextPlayer.name;

      room.markModified('gameData');
      await room.save();

      socket.emit('liars_hand_updated', {
        roomId: formattedRoomId,
        myHand: remainingHand
      });

      io.to(formattedRoomId).emit('liars_cards_played', {
        roomId: formattedRoomId,
        playedBy: { userId: formattedUserId, name: playerName },
        count: playedCards.length,
        remainingHandCount: remainingHand.length,
        nextTurnUserId: nextPlayer.userId,
        nextTurnName: nextPlayer.name,
        tableRank: room.gameData.tableRank
      });
    } catch (err) {
      console.error('Socket liars_play_cards error:', err);
      sendError('liars_play_cards', err.message || 'Failed to play cards');
    }
  });

  /**
   * Event: liars_call_liar_deck (Challenge preceding player's played cards)
   * Payload: { roomId, userId }
   */
  socket.on('liars_call_liar_deck', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return sendError('liars_call_liar_deck', 'roomId and userId are required');

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('liars_call_liar_deck', 'Room not found');

      if (room.gameType !== 'liars_bar' || (room.liarsMode || (room.gameData && room.gameData.liarsMode) || 'deck') !== 'deck') {
        return sendError('liars_call_liar_deck', 'Not a Liar’s Deck room');
      }

      if (room.status !== 'playing') {
        return sendError('liars_call_liar_deck', 'Game is not active');
      }

      const lastPlay = room.gameData.lastPlay;
      if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
        return sendError('liars_call_liar_deck', 'No cards played yet to challenge!');
      }

      const tableRank = room.gameData.tableRank;
      const challengerObj = room.players.find(p => p.userId === formattedUserId);
      const challengerName = challengerObj ? challengerObj.name : formattedUserId;

      const isValidCard = (card) => card === tableRank || card === 'Joker' || card === 'Chaos' || card === 'Devil';
      const isTruthful = lastPlay.cards.every(c => isValidCard(c));

      const losingUserId = isTruthful ? formattedUserId : lastPlay.playerUserId;
      const losingPlayerObj = room.players.find(p => p.userId === losingUserId);
      const losingUserName = losingPlayerObj ? losingPlayerObj.name : losingUserId;

      const isDevilPlayed = lastPlay.cards.includes('Devil');

      room.gameData.pendingRoulette = {
        losingUserId,
        losingUserName,
        isDevilPlayed,
        challengerUserId: formattedUserId,
        challengerName,
        accusedUserId: lastPlay.playerUserId,
        accusedName: lastPlay.playerName,
        revealedCards: lastPlay.cards,
        isTruthful
      };

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('liars_challenge_resolved', {
        roomId: formattedRoomId,
        challenger: { userId: formattedUserId, name: challengerName },
        accused: { userId: lastPlay.playerUserId, name: lastPlay.playerName },
        revealedCards: lastPlay.cards,
        tableRank,
        isTruthful,
        losingUserId,
        losingUserName,
        isDevilPlayed
      });
    } catch (err) {
      console.error('Socket liars_call_liar_deck error:', err);
      sendError('liars_call_liar_deck', err.message || 'Failed to process challenge');
    }
  });

  /**
   * Event: liars_trigger_roulette
   * Payload: { roomId, userId }
   */
  socket.on('liars_trigger_roulette', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return sendError('liars_trigger_roulette', 'roomId and userId are required');

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('liars_trigger_roulette', 'Room not found');

      if (!room.gameData || !room.gameData.pendingRoulette) {
        return sendError('liars_trigger_roulette', 'No pending roulette trigger pull');
      }

      const pending = room.gameData.pendingRoulette;
      if (pending.losingUserId !== formattedUserId && !pending.isDevilPlayed) {
        return sendError('liars_trigger_roulette', 'Only the losing player must pull the trigger');
      }

      const revolvers = room.gameData.revolvers || {};
      const rev = revolvers[formattedUserId];
      if (!rev || !rev.isAlive) {
        return sendError('liars_trigger_roulette', 'Player is already eliminated');
      }

      const isLiveRound = (rev.currentChamber === rev.bulletIndex);
      rev.chambersLeft = Math.max(0, rev.chambersLeft - 1);
      rev.currentChamber++;

      let isEliminated = false;
      if (isLiveRound) {
        rev.isAlive = false;
        isEliminated = true;
      }

      room.gameData.revolvers = revolvers;
      room.gameData.pendingRoulette = null;

      const alivePlayers = room.players.filter(p => revolvers[p.userId] && revolvers[p.userId].isAlive);

      if (alivePlayers.length <= 1) {
        room.status = 'finished';
        const winner = alivePlayers[0] || room.players[0];
        room.gameData.winners = [{ userId: winner.userId, name: winner.name }];
        room.markModified('gameData');
        await room.save();

        io.to(formattedRoomId).emit('liars_roulette_result', {
          roomId: formattedRoomId,
          userId: formattedUserId,
          isLiveRound,
          isEliminated,
          chambersLeft: rev.chambersLeft,
          isGameOver: true
        });

        io.to(formattedRoomId).emit('liars_game_over', {
          roomId: formattedRoomId,
          winners: [{ userId: winner.userId, name: winner.name }],
          revolvers
        });
        return;
      }

      const ranks = ['King', 'Queen', 'Ace'];
      const tableRank = ranks[Math.floor(Math.random() * ranks.length)];
      const fullDeck = createLiarsDeckForPlayers(alivePlayers.length, room.liarsDeckVariant || 'standard');

      alivePlayers.forEach((p, idx) => {
        const hand = fullDeck.slice(idx * 10, (idx + 1) * 10);
        room.gameData.playerHands[p.userId] = hand;
        if (p.socketId) {
          io.to(p.socketId).emit('liars_hand_updated', {
            roomId: formattedRoomId,
            myHand: hand
          });
        }
      });

      room.gameData.tableRank = tableRank;
      room.gameData.centerPile = [];
      room.gameData.lastPlay = null;

      const firstAlivePlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      room.gameData.currentTurnUserId = firstAlivePlayer.userId;
      room.gameData.currentTurnName = firstAlivePlayer.name;

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('liars_roulette_result', {
        roomId: formattedRoomId,
        userId: formattedUserId,
        isLiveRound,
        isEliminated,
        chambersLeft: rev.chambersLeft,
        isGameOver: false,
        newRound: {
          tableRank,
          currentTurnUserId: firstAlivePlayer.userId,
          currentTurnName: firstAlivePlayer.name,
          playerHands: room.gameData.playerHands
        }
      });
    } catch (err) {
      console.error('Socket liars_trigger_roulette error:', err);
      sendError('liars_trigger_roulette', err.message || 'Failed to trigger roulette');
    }
  });

  /**
   * Event: liars_place_bid (Liar's Dice mode)
   * Payload: { roomId, userId, quantity, face }
   */
  socket.on('liars_place_bid', async (payload = {}) => {
    try {
      const { roomId, userId, quantity, face } = payload;
      if (!roomId || !userId || !quantity || !face) {
        return sendError('liars_place_bid', 'roomId, userId, quantity, and face are required');
      }

      const q = Number(quantity);
      const f = Number(face);

      if (isNaN(q) || q < 1 || isNaN(f) || f < 1 || f > 6) {
        return sendError('liars_place_bid', 'Invalid quantity or face value (1-6)');
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('liars_place_bid', 'Room not found');

      if (room.gameType !== 'liars_bar' || room.gameData.liarsMode !== 'dice') {
        return sendError('liars_place_bid', 'Not a Liar’s Dice room');
      }

      if (room.status !== 'playing') {
        return sendError('liars_place_bid', 'Game is not active');
      }

      if (room.gameData.currentTurnUserId !== formattedUserId) {
        return sendError('liars_place_bid', "It's not your turn!");
      }

      const currentBid = room.gameData.currentBid;
      if (currentBid) {
        const isHigher = q > currentBid.quantity || (q === currentBid.quantity && f > currentBid.face);
        if (!isHigher) {
          return sendError('liars_place_bid', 'Bid must be higher than current bid!');
        }
      }

      const playerObj = room.players.find(p => p.userId === formattedUserId);
      const playerName = playerObj ? playerObj.name : formattedUserId;

      const newBid = { quantity: q, face: f, bidderUserId: formattedUserId, bidderName: playerName };
      room.gameData.currentBid = newBid;

      const alivePlayersMap = room.gameData.alivePlayers || {};
      const aliveList = room.players.filter(p => alivePlayersMap[p.userId] !== false);
      const currIdx = aliveList.findIndex(p => p.userId === formattedUserId);
      const nextPlayer = aliveList[(currIdx + 1) % aliveList.length];

      room.gameData.currentTurnUserId = nextPlayer.userId;
      room.gameData.currentTurnName = nextPlayer.name;

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('liars_bid_placed', {
        roomId: formattedRoomId,
        bid: newBid,
        nextTurnUserId: nextPlayer.userId,
        nextTurnName: nextPlayer.name
      });
    } catch (err) {
      console.error('Socket liars_place_bid error:', err);
      sendError('liars_place_bid', err.message || 'Failed to place bid');
    }
  });

  /**
   * Event: liars_call_liar_dice (Liar's Dice challenge)
   * Payload: { roomId, userId }
   */
  socket.on('liars_call_liar_dice', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return sendError('liars_call_liar_dice', 'roomId and userId are required');

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('liars_call_liar_dice', 'Room not found');

      if (room.gameType !== 'liars_bar' || room.gameData.liarsMode !== 'dice') {
        return sendError('liars_call_liar_dice', 'Not a Liar’s Dice room');
      }

      if (room.status !== 'playing') {
        return sendError('liars_call_liar_dice', 'Game is not active');
      }

      const currentBid = room.gameData.currentBid;
      if (!currentBid) {
        return sendError('liars_call_liar_dice', 'No bid has been placed yet to challenge!');
      }

      const playerDice = room.gameData.playerDice || {};
      const alivePlayersMap = room.gameData.alivePlayers || {};

      let actualCount = 0;
      Object.keys(playerDice).forEach(uid => {
        if (alivePlayersMap[uid] !== false) {
          const dice = playerDice[uid] || [];
          dice.forEach(d => {
            if (d === currentBid.face || (d === 1 && currentBid.face !== 1)) {
              actualCount++;
            }
          });
        }
      });

      const isTruthful = actualCount >= currentBid.quantity;
      const losingUserId = isTruthful ? formattedUserId : currentBid.bidderUserId;

      const poisonDoses = room.gameData.poisonDoses || {};
      poisonDoses[losingUserId] = (poisonDoses[losingUserId] || 0) + 1;

      let isEliminated = false;
      if (poisonDoses[losingUserId] >= 2) {
        alivePlayersMap[losingUserId] = false;
        isEliminated = true;
      }

      room.gameData.poisonDoses = poisonDoses;
      room.gameData.alivePlayers = alivePlayersMap;

      const aliveList = room.players.filter(p => alivePlayersMap[p.userId] !== false);

      if (aliveList.length <= 1) {
        room.status = 'finished';
        const winner = aliveList[0] || room.players[0];
        room.gameData.winners = [{ userId: winner.userId, name: winner.name }];
        room.markModified('gameData');
        await room.save();

        io.to(formattedRoomId).emit('liars_dice_resolved', {
          roomId: formattedRoomId,
          bid: currentBid,
          playerDice,
          actualCount,
          isTruthful,
          losingUserId,
          poisonDoses,
          isEliminated,
          isGameOver: true
        });

        io.to(formattedRoomId).emit('liars_game_over', {
          roomId: formattedRoomId,
          winners: [{ userId: winner.userId, name: winner.name }],
          playerDice,
          poisonDoses
        });
        return;
      }

      aliveList.forEach(p => {
        playerDice[p.userId] = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
      });

      const firstAlive = aliveList[Math.floor(Math.random() * aliveList.length)];
      room.gameData.currentBid = null;
      room.gameData.currentTurnUserId = firstAlive.userId;
      room.gameData.currentTurnName = firstAlive.name;

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('liars_dice_resolved', {
        roomId: formattedRoomId,
        bid: currentBid,
        playerDice,
        actualCount,
        isTruthful,
        losingUserId,
        poisonDoses,
        isEliminated,
        isGameOver: false,
        newRound: {
          currentTurnUserId: firstAlive.userId,
          currentTurnName: firstAlive.name,
          playerDice
        }
      });
    } catch (err) {
      console.error('Socket liars_call_liar_dice error:', err);
      sendError('liars_call_liar_dice', err.message || 'Failed to challenge dice bid');
    }
  });

  /**
   * Event: pick_number (Active player picks a tile number)
   * Payload: { roomId, userId, number }
   */
  socket.on('pick_number', async (payload = {}) => {
    try {
      const { roomId, userId, number } = payload;
      if (!roomId || !userId || number === undefined) {
        return sendError('pick_number', 'roomId, userId, and number are required');
      }

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return sendError('pick_number', 'Room not found');

      if (room.status !== 'playing') {
        return sendError('pick_number', 'Game is not in active playing state');
      }

      const num = Number(number);
      if (isNaN(num) || num < 1 || num > 75) {
        return sendError('pick_number', 'Invalid number picked');
      }

      const gameData = room.gameData || {};
      if (gameData.currentTurnUserId !== formattedUserId) {
        return sendError('pick_number', `It is not your turn! Waiting for ${gameData.currentTurnName || 'another player'}`);
      }

      const pickedNumbers = Array.isArray(gameData.pickedNumbers) ? gameData.pickedNumbers : [];
      if (pickedNumbers.includes(num)) {
        return sendError('pick_number', `Number ${num} has already been picked`);
      }

      const activePlayer = room.players.find(p => p.userId === formattedUserId);
      pickedNumbers.push(num);

      // Rotate turn to next player in room roster
      const playerIndex = room.players.findIndex(p => p.userId === formattedUserId);
      const nextIndex = (playerIndex + 1) % room.players.length;
      const nextPlayer = room.players[nextIndex];

      room.gameData = {
        currentTurnUserId: nextPlayer.userId,
        currentTurnName: nextPlayer.name,
        pickedNumbers,
        lastPickedNumber: num,
        lastPickedBy: activePlayer ? activePlayer.name : 'Player'
      };

      room.markModified('gameData');
      await room.save();

      io.to(formattedRoomId).emit('number_picked', {
        roomId: formattedRoomId,
        number: num,
        pickedBy: activePlayer ? activePlayer.name : 'Player',
        pickedByUserId: formattedUserId,
        pickedNumbers,
        nextTurnUserId: nextPlayer.userId,
        nextTurnName: nextPlayer.name
      });
    } catch (err) {
      console.error('Socket pick_number error:', err);
      sendError('pick_number', err.message || 'Failed to pick number');
    }
  });

  /**
   * Event: claim_bingo
   * Payload: { roomId, userId }
   */
  socket.on('claim_bingo', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) return;

      const formattedUserId = String(userId).trim().toUpperCase();
      const formattedRoomId = String(roomId).toUpperCase().trim();
      const room = await Room.findOne({ roomId: formattedRoomId });
      if (!room) return;

      const winner = room.players.find(p => p.userId === formattedUserId);
      const winnerName = winner ? winner.name : 'Player';
      const winnerAvatar = winner ? winner.profileImageUrl : '';

      const gameData = room.gameData || {};
      const startedAt = gameData.startedAt || Date.now();
      const winners = Array.isArray(gameData.winners) ? gameData.winners : [];

      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      const timeDisplay = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

      let existingWin = winners.find(w => w.userId === formattedUserId);
      let position;

      if (!existingWin) {
        position = winners.length + 1;
        existingWin = {
          position,
          userId: formattedUserId,
          name: winnerName,
          profileImageUrl: winnerAvatar,
          timeTakenSeconds: elapsedSec,
          timeDisplay
        };
        winners.push(existingWin);
        gameData.winners = winners;
        room.gameData = gameData;
        room.markModified('gameData');
      } else {
        position = existingWin.position;
      }

      room.status = 'finished';

      let prizeMsg = '';
      if (position === 1 && gameData && Number(gameData.rewardCoin) > 0 && !gameData.rewardAwarded) {
        const prizeAmount = Number(gameData.rewardCoin);
        const prizeCurrency = gameData.rewardCurrencyType === 'gems' ? 'gems' : 'coins';
        const currencyIcon = prizeCurrency === 'gems' ? '💎' : '🪙';

        gameData.rewardAwarded = true;
        room.markModified('gameData');

        const updatedWinner = await User.findOneAndUpdate(
          { userId: formattedUserId },
          { $inc: { [prizeCurrency]: prizeAmount } },
          { new: true }
        );

        if (updatedWinner && winner && winner.socketId) {
          io.to(winner.socketId).emit('user_balance_updated', {
            coins: updatedWinner.coins,
            gems: updatedWinner.gems,
            awarded: prizeAmount,
            currencyType: prizeCurrency,
            reason: `Won ${prizeAmount} ${currencyIcon} challenge reward!`
          });
        }
        prizeMsg = ` 🎁 Winner earned ${prizeAmount} ${currencyIcon} prize reward!`;
      }

      await room.save();

      io.to(formattedRoomId).emit('bingo_claimed', {
        roomId: formattedRoomId,
        winnerUserId: formattedUserId,
        winnerName: winnerName,
        position,
        timeDisplay: existingWin.timeDisplay,
        timeTakenSeconds: existingWin.timeTakenSeconds,
        leaderboard: winners,
        message: `🎉 ${winnerName} claimed Position #${position} BINGO in ${existingWin.timeDisplay}!${prizeMsg}`
      });
    } catch (err) {
      console.error('Socket claim_bingo error:', err);
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
   * Event: voice_signal (Relay WebRTC audio offers, answers, ICE candidates)
   * Payload: { roomId, targetSocketId, signalData, type }
   */
  socket.on('voice_signal', (payload = {}) => {
    try {
      const { roomId, targetSocketId, signalData, type, senderUserId } = payload;
      if (!roomId) return;
      const formattedRoomId = String(roomId).toUpperCase().trim();

      // Enforce Room Exclusivity: Sender socket must belong to the specified room
      if (!socket.rooms.has(formattedRoomId)) {
        console.warn(`[VoiceChat Security] Unauthorized signal from socket ${socket.id} outside room ${formattedRoomId}`);
        return;
      }

      const signalDataPayload = {
        roomId: formattedRoomId,
        senderSocketId: socket.id,
        senderUserId: senderUserId || null,
        signalData,
        type
      };

      if (targetSocketId) {
        // Enforce Room Exclusivity: Target socket must also be inside the room
        const roomSockets = io.sockets.adapter.rooms.get(formattedRoomId);
        if (roomSockets && roomSockets.has(targetSocketId)) {
          io.to(targetSocketId).emit('voice_signal', signalDataPayload);
        } else {
          console.warn(`[VoiceChat Security] Target socket ${targetSocketId} is not in room ${formattedRoomId}`);
        }
      } else {
        socket.to(formattedRoomId).emit('voice_signal', signalDataPayload);
      }
    } catch (err) {
      console.error('Socket voice_signal error:', err);
    }
  });

  /**
   * Event: voice_state_change (Broadcast Mic / Speaker state to room roster)
   * Payload: { roomId, userId, isMicMuted, isSpeakerMuted }
   */
  socket.on('voice_state_change', (payload = {}) => {
    try {
      const { roomId, userId, isMicMuted, isSpeakerMuted } = payload;
      if (!roomId || !userId) return;
      const formattedRoomId = String(roomId).toUpperCase().trim();

      // Enforce Room Exclusivity: Sender must be inside the room
      if (!socket.rooms.has(formattedRoomId)) return;

      socket.to(formattedRoomId).emit('voice_state_updated', {
        roomId: formattedRoomId,
        userId,
        socketId: socket.id,
        isMicMuted: Boolean(isMicMuted),
        isSpeakerMuted: Boolean(isSpeakerMuted)
      });
    } catch (err) {
      console.error('Socket voice_state_change error:', err);
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
