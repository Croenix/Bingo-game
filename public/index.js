/* ==========================================================================
   Bingo Arena - Main Game Client JavaScript (Multiplayer Turn-Based)
   ========================================================================== */

// Global State
let currentUser = null;
let socket = null;
let currentRoom = null;
let myBingoCard = [];
let markedIndexes = new Set();
let pickedNumbersSet = new Set();
let completedLinesCount = 0;

let roomStatus = 'waiting'; // 'waiting', 'playing', 'finished'
let currentTurnUserId = null;
let currentTurnName = '';

// On DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initDeviceId();
  checkSavedSession();
  initSocket();
  fetchChallenges();
  fetchRooms();
});

// ==========================================================================
// Device & Session Management (LocalStorage)
// ==========================================================================

function initDeviceId() {
  let deviceId = localStorage.getItem('bingo_device_id');
  if (!deviceId) {
    deviceId = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('bingo_device_id', deviceId);
  }
  return deviceId;
}

function getDeviceId() {
  return localStorage.getItem('bingo_device_id') || initDeviceId();
}

function checkSavedSession() {
  const savedUserJson = localStorage.getItem('bingo_user_session');
  if (savedUserJson) {
    try {
      const savedUser = JSON.parse(savedUserJson);
      if (savedUser && savedUser.gmailId) {
        // Silent re-auth with backend
        loginUser({
          gmailId: savedUser.gmailId,
          name: savedUser.name,
          deviceId: getDeviceId()
        }, true);
        return;
      }
    } catch (e) {
      console.error('Failed to parse saved session:', e);
    }
  }
  openModal('authModal');
}

// ==========================================================================
// API Calls & Authentication
// ==========================================================================

async function loginUser(payload, silent = false) {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        deviceId: getDeviceId()
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to authenticate');
    }

    currentUser = data.user;
    localStorage.setItem('bingo_user_session', JSON.stringify(currentUser));
    updateUserNavUI();
    closeModal('authModal');

    if (!silent) {
      showToast(`Welcome, ${currentUser.name}! 👋`, 'success');
    }
  } catch (err) {
    console.error('Login error:', err);
    if (!silent) {
      showToast(err.message, 'error');
    } else {
      openModal('authModal');
    }
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const gmailId = document.getElementById('authGmail').value.trim();
  const name = document.getElementById('authName').value.trim();
  const password = document.getElementById('authPassword').value.trim();

  if (!gmailId) {
    showToast('Please enter a valid Gmail address', 'error');
    return;
  }

  loginUser({ gmailId, name, password });
}

function handleGuestLogin() {
  const deviceId = getDeviceId();
  const cleanId = deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
  const guestGmail = `guest_${cleanId}@gmail.com`;

  loginUser({ gmailId: guestGmail });
}

function handleLogout() {
  localStorage.removeItem('bingo_user_session');
  currentUser = null;
  closeModal('profileModal');
  updateUserNavUI();
  openModal('authModal');
  showToast('Logged out successfully', 'info');
}

function updateUserNavUI() {
  const navBadge = document.getElementById('navUserBadge');
  if (!currentUser) {
    navBadge.style.display = 'none';
    return;
  }

  navBadge.style.display = 'flex';
  document.getElementById('navUserName').textContent = currentUser.name || 'Player';
  document.getElementById('navUserId').textContent = currentUser.userId || 'BGO-0000';
  document.getElementById('navUserCoins').textContent = (currentUser.coins || 0).toLocaleString();
  document.getElementById('navUserGems').textContent = (currentUser.gems || 0).toLocaleString();

  const avatarUrl = currentUser.profileImageUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.userId}`;
  document.getElementById('navUserAvatar').src = avatarUrl;
  document.getElementById('modalProfileAvatar').src = avatarUrl;
}

// ==========================================================================
// Lobby Data Fetching
// ==========================================================================

async function fetchChallenges() {
  const container = document.getElementById('challengesContainer');
  try {
    const res = await fetch('/api/challenges');
    const data = await res.json();

    if (!res.ok || !data.challenges || data.challenges.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🏆</span>
          <p>No active game challenges available.</p>
        </div>`;
      return;
    }

    container.innerHTML = data.challenges.map(c => `
      <div class="challenge-card" style="border-left: 4px solid ${c.gradientColors?.[0] || '#8b5cf6'};">
        <div>
          <div class="challenge-category">${escapeHtml(c.category || 'Standard')}</div>
          <div class="challenge-title">${escapeHtml(c.title)}</div>
        </div>
        <div>
          <div class="challenge-details">
            <div class="detail-item">
              <span class="detail-label">ENTRY FEE</span>
              <span class="detail-val">🪙 ${c.entryFeeCoins}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">PRIZE POOL</span>
              <span class="detail-val">🪙 ${c.prizeCoins}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-block btn-sm" onclick="quickCreateRoom('${escapeHtml(c.title)}')">
            🎮 Play Challenge
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Fetch challenges failed:', err);
    container.innerHTML = `<div class="empty-state"><p>Unable to load challenges.</p></div>`;
  }
}

async function fetchRooms() {
  const container = document.getElementById('roomsContainer');
  const badge = document.getElementById('roomsCountBadge');

  try {
    const res = await fetch('/api/rooms');
    const data = await res.json();

    const rooms = data.rooms || [];
    badge.textContent = rooms.length;

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎲</span>
          <p>No public rooms active right now.</p>
          <button class="btn btn-primary btn-sm mt-3" onclick="openCreateRoomModal()">Create First Room</button>
        </div>`;
      return;
    }

    container.innerHTML = rooms.map(r => `
      <div class="room-card">
        <div class="room-card-header">
          <span class="room-card-title">${escapeHtml(r.name)}</span>
          <span class="room-card-code">${escapeHtml(r.roomId)}</span>
        </div>
        <div class="room-card-body">
          <span class="player-count">👥 ${r.playersCount} / ${r.capacity}</span>
          ${r.hasPassword ? '<span>🔒 Protected</span>' : '<span>🌐 Public</span>'}
        </div>
        <button class="btn btn-secondary btn-block btn-sm" onclick="joinRoomByCode('${r.roomId}', ${r.hasPassword})">
          Join Room
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Fetch rooms failed:', err);
  }
}

// ==========================================================================
// Socket.io Real-Time Event Handlers
// ==========================================================================

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('room_created', (data) => {
    handleRoomJoinedOrCreated(data);
    showToast('Room created successfully! 🎉', 'success');
  });

  socket.on('room_joined', (data) => {
    handleRoomJoinedOrCreated(data);
    showToast('Joined room successfully! 🎲', 'success');
  });

  socket.on('bingo_card_assigned', (data) => {
    if (data.bingoCard && Array.isArray(data.bingoCard.numbers)) {
      myBingoCard = data.bingoCard.numbers;
      renderBingoBoard();
    }
  });

  socket.on('player_joined', (data) => {
    if (currentRoom) {
      currentRoom.players = data.players || [];
      updateTurnStateUI();
      showToast(`${data.player?.name || 'A player'} joined the room!`, 'info');
    }
  });

  socket.on('player_left', (data) => {
    if (currentRoom) {
      currentRoom.players = data.players || [];
      updateTurnStateUI();
      showToast('A player left the room.', 'info');
    }
  });

  socket.on('game_started', (data) => {
    roomStatus = 'playing';
    currentTurnUserId = data.currentTurnUserId;
    currentTurnName = data.currentTurnName;
    if (currentRoom) {
      currentRoom.status = 'playing';
      if (data.players) currentRoom.players = data.players;
    }

    const isMyTurn = currentUser && currentUser.userId === currentTurnUserId;
    showToast(`🎮 GAME STARTED! ${isMyTurn ? 'YOU start first!' : currentTurnName + ' starts first!'}`, 'success');
    updateTurnStateUI();
    renderBingoBoard();
  });

  socket.on('number_picked', (data) => {
    const { number, pickedBy, pickedByUserId, pickedNumbers, nextTurnUserId, nextTurnName } = data;

    // Show Last Drawn Ball Banner
    const banner = document.getElementById('drawnBallBanner');
    banner.style.display = 'flex';
    document.getElementById('drawnBallNumber').textContent = number;
    document.getElementById('drawnBallPicker').textContent = `by ${pickedBy}`;

    // Add to set of picked/drawn numbers across the room
    pickedNumbersSet.add(number);

    // Auto-mark ONLY for the player who picked the number on their turn
    const isPicker = currentUser && currentUser.userId === pickedByUserId;
    const tileIdx = myBingoCard.indexOf(number);
    if (isPicker && tileIdx !== -1) {
      markedIndexes.add(tileIdx);
    }

    currentTurnUserId = nextTurnUserId;
    currentTurnName = nextTurnName;

    updateTurnStateUI();
    renderBingoBoard();
    checkCompletedLines();

    const isMyTurnNow = currentUser && currentUser.userId === currentTurnUserId;
    if (isMyTurnNow) {
      showToast(`🎯 Number ${number} picked! IT IS YOUR TURN NOW! 🔥`, 'success');
    } else if (isPicker) {
      showToast(`🎯 You picked ${number}! Next turn: ${nextTurnName}`, 'info');
    } else {
      if (tileIdx !== -1 && !markedIndexes.has(tileIdx)) {
        showToast(`🎯 ${pickedBy} picked ${number}! Click ${number} on your board to mark it!`, 'warning');
      } else {
        showToast(`🎯 ${pickedBy} picked ${number}. ${nextTurnName}'s turn!`, 'info');
      }
    }
  });

  socket.on('bingo_claimed', (data) => {
    roomStatus = 'finished';
    const winnerName = data.winnerName || 'Player';
    showToast(`🎉 ${winnerName} claimed BINGO and won!`, 'success');

    document.getElementById('victoryMessage').textContent = data.message || `${winnerName} completed 5 lines and won!`;
    openModal('victoryModal');
    if (window.confetti) confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
  });

  socket.on('room_deleted', (data) => {
    showToast(`Room closed: ${data.reason || 'Host left'}`, 'error');
    leaveRoomUI();
  });

  socket.on('room_error', (data) => {
    showToast(data.error || 'Room error occurred', 'error');
  });
}

function handleRoomJoinedOrCreated(data) {
  if (!data.ok || !data.room) return;
  currentRoom = data.room;

  if (data.myBingoCard && Array.isArray(data.myBingoCard.numbers)) {
    myBingoCard = data.myBingoCard.numbers;
  } else {
    myBingoCard = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  }

  markedIndexes.clear();
  pickedNumbersSet.clear();
  completedLinesCount = 0;

  roomStatus = currentRoom.status || 'waiting';
  const gameData = currentRoom.gameData || {};
  currentTurnUserId = gameData.currentTurnUserId || null;
  currentTurnName = gameData.currentTurnName || '';

  if (Array.isArray(gameData.pickedNumbers)) {
    gameData.pickedNumbers.forEach(n => {
      pickedNumbersSet.add(n);
    });
  }

  document.getElementById('gameRoomName').textContent = currentRoom.name;
  document.getElementById('gameRoomCode').textContent = currentRoom.roomId;

  updateBingoLinesUI();
  updateTurnStateUI();
  renderBingoBoard();

  switchView('gameView');
  closeModal('createRoomModal');
  closeModal('joinRoomModal');
}

// ==========================================================================
// Interactive 5x5 Bingo Board & Turn Logic
// ==========================================================================

function updateTurnStateUI() {
  const hostBtn = document.getElementById('hostStartBtn');
  const statusText = document.getElementById('gameStatusText');
  const isHost = currentUser && currentRoom && (currentUser.userId === currentRoom.creatorId);

  if (roomStatus === 'waiting') {
    if (isHost) {
      hostBtn.style.display = 'inline-flex';
      statusText.textContent = `Waiting for players (${currentRoom.players ? currentRoom.players.length : 1}/${currentRoom.capacity})... Or click "START GAME" now!`;
    } else {
      hostBtn.style.display = 'none';
      statusText.textContent = `Waiting for Host (${currentRoom ? currentRoom.creatorName : 'Host'}) to start game...`;
    }
  } else if (roomStatus === 'playing') {
    hostBtn.style.display = 'none';
    const isMyTurn = currentUser && currentUser.userId === currentTurnUserId;
    if (isMyTurn) {
      statusText.textContent = '🕹️ YOUR TURN! Click any number on your board to pick it!';
    } else {
      statusText.textContent = `⏳ Waiting for ${currentTurnName}'s turn...`;
    }
  } else if (roomStatus === 'finished') {
    hostBtn.style.display = 'none';
    statusText.textContent = '🏆 Game Finished!';
  }

  renderPlayersStrip();
}

function renderBingoBoard() {
  const grid = document.getElementById('bingoGrid');
  grid.innerHTML = '';

  const isMyTurn = currentUser && currentUser.userId === currentTurnUserId;
  const isPlaying = roomStatus === 'playing';

  myBingoCard.forEach((num, index) => {
    const tile = document.createElement('div');
    const isMarked = markedIndexes.has(index);
    const isDrawnUnmarked = !isMarked && pickedNumbersSet.has(num);
    const isDisabled = !isPlaying || (!isMyTurn && !isDrawnUnmarked && !isMarked);

    let tileClasses = 'bingo-tile';
    if (isMarked) {
      tileClasses += ' marked';
    } else if (isDrawnUnmarked) {
      tileClasses += ' drawn-unmarked';
    } else if (isDisabled) {
      tileClasses += ' disabled-tile';
    }

    tile.className = tileClasses;
    tile.textContent = num;
    tile.onclick = () => handleTileClick(index, num);
    grid.appendChild(tile);
  });
}

function handleTileClick(index, num) {
  if (roomStatus !== 'playing') {
    showToast('Game has not started yet!', 'error');
    return;
  }

  // 1. Check if tile is already marked
  if (markedIndexes.has(index)) {
    showToast(`Number ${num} is already marked on your board!`, 'info');
    return;
  }

  // 2. Check if this number has already been drawn/picked by anyone in the room
  if (pickedNumbersSet.has(num)) {
    // Manually mark drawn tile on player's board
    markedIndexes.add(index);
    renderBingoBoard();
    checkCompletedLines();
    showToast(`Marked ${num} on your Bingo board! ✅`, 'success');
    return;
  }

  // 3. For un-drawn numbers, check if it's currently this player's turn to pick
  const isMyTurn = currentUser && currentUser.userId === currentTurnUserId;
  if (!isMyTurn) {
    showToast(`It's not your turn to pick a new number! Waiting for ${currentTurnName || 'other player'}...`, 'error');
    return;
  }

  // Send turn action to server via socket!
  socket.emit('pick_number', {
    roomId: currentRoom.roomId,
    userId: currentUser.userId,
    number: num
  });
}

function checkCompletedLines() {
  let lines = 0;

  // 1. Check Rows
  for (let r = 0; r < 5; r++) {
    let rowComplete = true;
    for (let c = 0; c < 5; c++) {
      if (!markedIndexes.has(r * 5 + c)) { rowComplete = false; break; }
    }
    if (rowComplete) lines++;
  }

  // 2. Check Columns
  for (let c = 0; c < 5; c++) {
    let colComplete = true;
    for (let r = 0; r < 5; r++) {
      if (!markedIndexes.has(r * 5 + c)) { colComplete = false; break; }
    }
    if (colComplete) lines++;
  }

  // 3. Diagonal 1
  let d1Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!markedIndexes.has(i * 5 + i)) { d1Complete = false; break; }
  }
  if (d1Complete) lines++;

  // 4. Diagonal 2
  let d2Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!markedIndexes.has(i * 5 + (4 - i))) { d2Complete = false; break; }
  }
  if (d2Complete) lines++;

  completedLinesCount = Math.min(lines, 5);
  updateBingoLinesUI();
}

function updateBingoLinesUI() {
  document.getElementById('linesClearedCount').textContent = completedLinesCount;

  const letters = ['B', 'I', 'N', 'G', 'O'];
  letters.forEach((l, idx) => {
    const el = document.getElementById(`letter-${l}`);
    if (idx < completedLinesCount) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const claimBtn = document.getElementById('claimBingoBtn');
  if (completedLinesCount >= 5 && roomStatus === 'playing') {
    claimBtn.disabled = false;
    claimBtn.classList.add('glow-effect');
  } else {
    claimBtn.disabled = true;
    claimBtn.classList.remove('glow-effect');
  }
}

function claimBingo() {
  if (completedLinesCount < 5 || !currentRoom) return;

  socket.emit('claim_bingo', {
    roomId: currentRoom.roomId,
    userId: currentUser.userId
  });
}

function handleHostStartGame() {
  if (!currentRoom || !currentUser) return;
  socket.emit('start_game', {
    roomId: currentRoom.roomId,
    userId: currentUser.userId
  });
}

function closeVictoryAndLeave() {
  closeModal('victoryModal');
  confirmLeaveRoom();
}

// ==========================================================================
// Room Actions & UI Handlers
// ==========================================================================

function quickCreateRoom(roomName) {
  if (!currentUser) return openModal('authModal');

  socket.emit('create_room', {
    userId: currentUser.userId,
    userName: currentUser.name,
    profileImageUrl: currentUser.profileImageUrl,
    roomName: roomName + ' #' + Math.floor(100 + Math.random() * 890),
    capacity: 4
  });
}

function handleCreateRoomSubmit(event) {
  event.preventDefault();
  if (!currentUser) return openModal('authModal');

  const roomName = document.getElementById('createRoomName').value.trim();
  const capacity = Number(document.getElementById('createCapacity').value) || 4;
  const password = document.getElementById('createPassword').value.trim();
  const customRoomId = document.getElementById('createCustomId').value.trim().toUpperCase();

  socket.emit('create_room', {
    userId: currentUser.userId,
    userName: currentUser.name,
    profileImageUrl: currentUser.profileImageUrl,
    roomName,
    capacity,
    password,
    customRoomId
  });
}

function joinRoomByCode(roomId, hasPassword) {
  if (!currentUser) return openModal('authModal');

  if (hasPassword) {
    document.getElementById('joinRoomCode').value = roomId;
    openModal('joinRoomModal');
    return;
  }

  socket.emit('join_room', {
    roomId,
    userId: currentUser.userId,
    userName: currentUser.name,
    profileImageUrl: currentUser.profileImageUrl
  });
}

function handleJoinRoomSubmit(event) {
  event.preventDefault();
  if (!currentUser) return openModal('authModal');

  const roomId = document.getElementById('joinRoomCode').value.trim().toUpperCase();
  const password = document.getElementById('joinRoomPassword').value.trim();

  socket.emit('join_room', {
    roomId,
    userId: currentUser.userId,
    userName: currentUser.name,
    profileImageUrl: currentUser.profileImageUrl,
    password
  });
}

function confirmLeaveRoom() {
  if (currentRoom && socket && currentUser) {
    socket.emit('leave_room', {
      roomId: currentRoom.roomId,
      userId: currentUser.userId
    });
  }
  leaveRoomUI();
}

function leaveRoomUI() {
  currentRoom = null;
  roomStatus = 'waiting';
  currentTurnUserId = null;
  currentTurnName = '';
  markedIndexes.clear();
  pickedNumbersSet.clear();
  document.getElementById('drawnBallBanner').style.display = 'none';
  switchView('lobbyView');
  fetchRooms();
}

function renderPlayersStrip() {
  const strip = document.getElementById('playersStrip');
  if (!currentRoom || !currentRoom.players) return;

  strip.innerHTML = currentRoom.players.map(p => {
    const isTurn = roomStatus === 'playing' && p.userId === currentTurnUserId;
    const isCreator = p.isCreator || p.userId === currentRoom.creatorId;

    return `
      <div class="player-badge ${isCreator ? 'is-creator' : ''} ${isTurn ? 'is-turn' : ''}">
        <img src="${p.profileImageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.userId}" class="badge-avatar" />
        <span>${escapeHtml(p.name)}</span>
        ${isCreator ? '👑' : ''}
        ${isTurn ? ' 🎲' : ''}
      </div>
    `;
  }).join('');
}

// ==========================================================================
// Navigation & Modals Helpers
// ==========================================================================

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(viewId).classList.add('active-view');
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active-modal');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active-modal');
}

function openProfileModal() {
  if (!currentUser) return;
  document.getElementById('modalProfileName').textContent = currentUser.name;
  document.getElementById('modalProfileUserId').textContent = currentUser.userId;
  document.getElementById('modalProfileGmail').textContent = currentUser.gmailId || '';
  document.getElementById('modalProfileCoins').textContent = (currentUser.coins || 0).toLocaleString();
  document.getElementById('modalProfileGems').textContent = (currentUser.gems || 0).toLocaleString();
  openModal('profileModal');
}

function openCreateRoomModal() {
  if (!currentUser) return openModal('authModal');
  openModal('createRoomModal');
}

function openJoinRoomModal() {
  if (!currentUser) return openModal('authModal');
  openModal('joinRoomModal');
}

function copyRoomCode() {
  if (!currentRoom) return;
  navigator.clipboard.writeText(currentRoom.roomId);
  showToast(`Room code ${currentRoom.roomId} copied! 📋`, 'info');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}
