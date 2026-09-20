/* ==========================================================================
   Bingo Arena - Main Game Client JavaScript (Multiplayer Turn-Based)
   ========================================================================== */

// Global Cache Data ID & Version Control
const BINGO_CACHE_VERSION = 'v2_2026_09_20';
(function autoPurgeLegacyCache() {
  try {
    const activeVersion = localStorage.getItem('bingo_cache_version');
    if (activeVersion !== BINGO_CACHE_VERSION) {
      console.log('🔄 New Cache Data Version detected (' + BINGO_CACHE_VERSION + '). Declining legacy cache IDs...');
      // Discard all legacy cache data keys
      const legacyKeys = ['bingo_user_session', 'bingo_device_id', 'bingo_admin_token', 'bingo_admin_email', 'imgbb_api_key'];
      legacyKeys.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      localStorage.setItem('bingo_cache_version', BINGO_CACHE_VERSION);
    }
  } catch (e) {
    console.warn('Auto cache purge failed:', e);
  }
})();

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

// ==========================================================================
// Web Audio API Synthesizer - Premium Sound Effects System
// ==========================================================================
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // 1. Tile / Block Click Sound (crisp tactile click/pop)
  playTileClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('SoundFX playTileClick error:', e);
    }
  },

  // 2. Tile Marked Sound (satisfying C5-E5-G5 chime checkmark)
  playTileMarked() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.2, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.12);
      });
    } catch (e) {
      console.warn('SoundFX playTileMarked error:', e);
    }
  },

  // 3. Turn Switch Sound (bright A5-D6-E6 notification bell when turn shifts to you)
  playYourTurn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [880, 1174.66, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.25, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (e) {
      console.warn('SoundFX playYourTurn error:', e);
    }
  },

  // 4. Player Joined Sound (welcoming double chime C5 to E5)
  playPlayerJoined() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {
      console.warn('SoundFX playPlayerJoined error:', e);
    }
  },

  // 5. Player Left / Disconnected Sound (soft descending chime A4 to F4)
  playPlayerLeft() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [440, 349.23].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.25);
      });
    } catch (e) {
      console.warn('SoundFX playPlayerLeft error:', e);
    }
  },

  // 6. Victory Fanfare Sound (triumphant C5-E5-G5-C6-E6-G6 arpeggio fanfare)
  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('SoundFX playVictory error:', e);
    }
  }
};

function toggleSound() {
  SoundFX.enabled = !SoundFX.enabled;
  const btn = document.getElementById('soundToggleBtn');
  if (btn) {
    btn.textContent = SoundFX.enabled ? '🔊' : '🔇';
    btn.title = SoundFX.enabled ? 'Sound On' : 'Sound Muted';
  }
  showToast(SoundFX.enabled ? 'Sound Effects Enabled 🔊' : 'Sound Effects Muted 🔇', 'info');
}
window.toggleSound = toggleSound;
window.SoundFX = SoundFX;

// On DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', () => SoundFX.init(), { once: true });
  const soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', toggleSound);
  }
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
  let deviceId = localStorage.getItem('bingo_v2_device_id');
  if (!deviceId) {
    deviceId = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('bingo_v2_device_id', deviceId);
  }
  return deviceId;
}

function getDeviceId() {
  return localStorage.getItem('bingo_v2_device_id') || initDeviceId();
}

function checkSavedSession() {
  const savedUserJson = localStorage.getItem('bingo_v2_user_session');
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
    localStorage.setItem('bingo_v2_user_session', JSON.stringify(currentUser));
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
  localStorage.removeItem('bingo_v2_user_session');
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

let challengeAutoScrollTimer = null;
let challengeAutoScrollHovered = false;

function initChallengeAutoScroll() {
  const container = document.getElementById('challengesContainer');
  if (!container) return;

  if (challengeAutoScrollTimer) {
    clearInterval(challengeAutoScrollTimer);
    challengeAutoScrollTimer = null;
  }

  const onPause = () => { challengeAutoScrollHovered = true; };
  const onResume = () => { challengeAutoScrollHovered = false; };

  container.addEventListener('mouseenter', onPause);
  container.addEventListener('mouseleave', onResume);
  container.addEventListener('touchstart', onPause, { passive: true });
  container.addEventListener('touchend', onResume, { passive: true });

  challengeAutoScrollTimer = setInterval(() => {
    if (challengeAutoScrollHovered) return;
    if (container.scrollWidth <= container.clientWidth) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (container.scrollLeft >= maxScroll - 15) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: 310, behavior: 'smooth' });
    }
  }, 3500);
}

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

    window.allActiveChallenges = data.challenges || [];
    container.innerHTML = data.challenges.map(c => {
      const entryIcon = c.entryCurrencyType === 'gems' ? '💎' : '🪙';
      const rewardIcon = c.rewardCurrencyType === 'gems' ? '💎' : '🪙';
      const entryVal = c.entryCoin !== undefined ? c.entryCoin : (c.entryFeeCoins !== undefined ? c.entryFeeCoins : 0);
      const rewardVal = c.rewardCoin !== undefined ? c.rewardCoin : (c.prizeCoins !== undefined ? c.prizeCoins : 0);
      const cardColor = c.color1 || (c.gradientColors && c.gradientColors[0]) || '#8b5cf6';
      const cardColor2 = c.color2 || '#a855f7';
      const coverImgStyle = c.coverImage ? `background-image: url('${escapeHtml(c.coverImage)}');` : `background: linear-gradient(135deg, ${cardColor}, ${cardColor2});`;

      return `
        <div class="challenge-card" style="border-top: 4px solid ${cardColor};">
          <div class="challenge-card-banner" style="${coverImgStyle}">
            <div class="challenge-card-content flex justify-between items-center w-full">
              <span class="challenge-category badge badge-purple">${escapeHtml(c.category || 'Standard')}</span>
              <span class="badge badge-outline"><i class="fa-solid fa-users text-purple"></i> ${c.maxPlayers || 4} Players</span>
            </div>
            <div class="challenge-card-content">
              <div class="challenge-title text-white font-bold text-lg leading-tight" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${escapeHtml(c.title)}</div>
            </div>
          </div>
          <div class="challenge-card-body">
            <div class="challenge-details">
              <div class="detail-item">
                <span class="detail-label">ENTRY FEE</span>
                <span class="detail-val font-semibold">${entryIcon} ${Number(entryVal).toLocaleString()}</span>
              </div>
              <div class="detail-item text-right">
                <span class="detail-label">PRIZE POOL</span>
                <span class="detail-val text-green font-bold">${rewardIcon} ${Number(rewardVal).toLocaleString()}</span>
              </div>
            </div>
            <button class="btn btn-primary btn-block btn-sm" onclick="playFeaturedChallenge('${c._id}')">
              🎮 Play Challenge
            </button>
          </div>
        </div>
      `;
    }).join('');

    initChallengeAutoScroll();
  } catch (err) {
    console.error('Fetch challenges failed:', err);
    container.innerHTML = `<div class="empty-state"><p>Unable to load challenges.</p></div>`;
  }
}

function playFeaturedChallenge(challengeId) {
  if (!currentUser) return openModal('authModal');

  const c = (window.allActiveChallenges || []).find(ch => ch._id === challengeId);
  if (!c) return quickCreateRoom('Challenge Game');

  const entryVal = c.entryCoin !== undefined ? c.entryCoin : (c.entryFeeCoins || 0);
  const currencyType = c.entryCurrencyType === 'gems' ? 'gems' : 'coins';
  const icon = currencyType === 'gems' ? '💎' : '🪙';

  if (entryVal > 0) {
    const userBal = currencyType === 'gems' ? (currentUser.gems || 0) : (currentUser.coins || 0);
    if (userBal < entryVal) {
      showToast(`Insufficient balance! You need at least ${entryVal.toLocaleString()} ${icon} to play this challenge.`, 'error');
      return;
    }
  }

  socket.emit('create_room', {
    userId: currentUser.userId,
    userName: currentUser.name,
    profileImageUrl: currentUser.profileImageUrl,
    roomName: `${c.title} #${Math.floor(100 + Math.random() * 890)}`,
    capacity: c.maxPlayers || 4,
    challengeId: c._id,
    entryCoin: entryVal,
    entryCurrencyType: currencyType,
    rewardCoin: c.rewardCoin !== undefined ? c.rewardCoin : (c.prizeCoins || 0),
    rewardCurrencyType: c.rewardCurrencyType === 'gems' ? 'gems' : 'coins'
  });
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
      SoundFX.playPlayerJoined();
      if (data.player && data.player.socketId && data.player.socketId !== socket.id) {
        VoiceChat.connectToPeer(data.player.socketId);
      }
    }
  });

  socket.on('player_left', (data) => {
    if (currentRoom) {
      currentRoom.players = data.players || [];
      updateTurnStateUI();
      showToast('A player left the room.', 'info');
      SoundFX.playPlayerLeft();
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

    if (isMyTurn) {
      SoundFX.playYourTurn();
    }
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
      SoundFX.playYourTurn();
    } else if (isPicker) {
      showToast(`🎯 You picked ${number}! Next turn: ${nextTurnName}`, 'info');
      SoundFX.playTileMarked();
    } else {
      SoundFX.playTileClick();
      if (tileIdx !== -1 && !markedIndexes.has(tileIdx)) {
        showToast(`🎯 ${pickedBy} picked ${number}! Click ${number} on your board to mark it!`, 'warning');
      } else {
        showToast(`🎯 ${pickedBy} picked ${number}. ${nextTurnName}'s turn!`, 'info');
      }
    }
  });

  socket.on('bingo_claimed', (data) => {
    roomStatus = 'finished';
    const { winnerName, winnerUserId, position, timeDisplay, leaderboard = [] } = data;
    const isMe = currentUser && currentUser.userId === winnerUserId;

    showToast(`🎉 ${winnerName} claimed Position #${position || 1} BINGO in ${timeDisplay || '0m 00s'}!`, 'success');
    SoundFX.playVictory();

    document.getElementById('victoryTitle').textContent = isMe ? `🏆 YOU WON POSITION #${position || 1}!` : `🏆 MATCH RESULTS`;
    document.getElementById('victoryMessage').textContent = `Bingo claimed in ${timeDisplay || '0m 00s'}!`;

    renderVictoryLeaderboard(leaderboard);
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

  socket.on('user_balance_updated', (data) => {
    if (!currentUser) return;
    if (data.coins !== undefined) currentUser.coins = data.coins;
    if (data.gems !== undefined) currentUser.gems = data.gems;
    localStorage.setItem('bingo_v2_user_session', JSON.stringify(currentUser));
    updateUserNavUI();

    if (data.reason) {
      const type = data.deducted ? 'info' : (data.awarded ? 'success' : 'info');
      showToast(`${data.reason}`, type);
    }
  });

  socket.on('admin_clear_cache', async (data) => {
    showToast('⚡ Admin reset system cache memory & updated app UI! Refreshing session...', 'warning');
    try {
      localStorage.clear();
      sessionStorage.clear();

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }

    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    }, 1000);
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

  VoiceChat.initInRoom(currentRoom.roomId);

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
    SoundFX.playTileMarked();
    showToast(`Marked ${num} on your Bingo board! ✅`, 'success');
    return;
  }

  // 3. For un-drawn numbers, check if it's currently this player's turn to pick
  const isMyTurn = currentUser && currentUser.userId === currentTurnUserId;
  if (!isMyTurn) {
    showToast(`It's not your turn to pick a new number! Waiting for ${currentTurnName || 'other player'}...`, 'error');
    return;
  }

  SoundFX.playTileClick();

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

function renderVictoryLeaderboard(leaderboard = []) {
  const container = document.getElementById('victoryLeaderboardList');
  if (!container) return;

  if (!leaderboard || leaderboard.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No position data recorded yet.</p></div>';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rewardCoins = [500, 300, 150, 50, 50, 50];

  container.innerHTML = leaderboard.map((item, idx) => {
    const pos = item.position || (idx + 1);
    const medal = pos <= 3 ? medals[pos - 1] : `#${pos}`;
    const coins = rewardCoins[pos - 1] || 50;
    const isMe = currentUser && currentUser.userId === item.userId;

    return `
      <div class="leaderboard-item ${isMe ? 'is-me' : ''} pos-${pos}">
        <div class="rank-badge">${medal}</div>
        <img src="${item.profileImageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + item.userId}" class="rank-avatar" />
        <div class="rank-info">
          <span class="rank-name">${escapeHtml(item.name)} ${isMe ? '⭐' : ''}</span>
          <span class="rank-time">⏱️ ${escapeHtml(item.timeDisplay || '0m 00s')}</span>
        </div>
        <div class="rank-reward">+${coins} 🪙</div>
      </div>
    `;
  }).join('');
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
  VoiceChat.close();
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
    const isMe = currentUser && currentUser.userId === p.userId;
    const voiceState = VoiceChat.voiceStates[p.userId] || {};
    const isMuted = isMe
      ? (VoiceChat.isMicMuted || !VoiceChat.localAudioTrack)
      : (voiceState.isMicMuted !== false);

    return `
      <div class="player-badge ${isCreator ? 'is-creator' : ''} ${isTurn ? 'is-turn' : ''}">
        <img src="${p.profileImageUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.userId}" class="badge-avatar" />
        <span>${escapeHtml(p.name)}</span>
        ${isCreator ? '👑' : ''}
        ${isTurn ? ' 🎲' : ''}
        ${isMuted ? '<span class="voice-badge muted" title="Mic Muted">🔇</span>' : '<span class="voice-badge live" title="Voice Live">🎙️</span>'}
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

// ==========================================================================
// WebRTC In-Room Real-Time Voice Chat System
// ==========================================================================
// ==========================================================================
// Agora RTC Web SDK In-Room Voice Chat System
// ==========================================================================
const VoiceChat = {
  client: null,
  localAudioTrack: null,
  remoteUsers: {}, // uid -> user
  isMicMuted: false,
  isSpeakerMuted: false,
  voiceStates: {}, // userId / socketId -> { isMicMuted, isSpeakerMuted }

  async initInRoom(roomId) {
    if (!roomId) return;
    await this.close();

    if (typeof AgoraRTC === 'undefined') {
      let attempts = 0;
      while (typeof AgoraRTC === 'undefined' && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (typeof AgoraRTC === 'undefined') {
        console.warn('AgoraRTC SDK is not available');
        return;
      }
    }

    // 1. Initialize Agora RTC Client with mode "rtc" and codec "vp8"
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // 2. Subscribe to remote users' published audio tracks and play automatically
    this.client.on('user-published', async (user, mediaType) => {
      try {
        await this.client.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          this.remoteUsers[user.uid] = user;
          if (!this.isSpeakerMuted && user.audioTrack) {
            user.audioTrack.play();
          }
        }
      } catch (err) {
        console.error('Agora subscribe user-published error:', err);
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        delete this.remoteUsers[user.uid];
      }
    });

    this.client.on('user-left', (user) => {
      delete this.remoteUsers[user.uid];
      delete this.voiceStates[user.uid];
      renderPlayersStrip();
    });

    if (socket) {
      socket.off('voice_state_updated');
      socket.on('voice_state_updated', (data) => {
        const { roomId: signalRoomId, userId, socketId, isMicMuted, isSpeakerMuted } = data;
        if (signalRoomId && currentRoom && String(signalRoomId).toUpperCase().trim() !== String(currentRoom.roomId).toUpperCase().trim()) {
          return;
        }
        this.voiceStates[userId || socketId] = { isMicMuted, isSpeakerMuted };
        renderPlayersStrip();
      });
    }

    // 3. Fetch Agora App ID from server or global fallback
    let appId = window.AGORA_APP_ID || 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
    try {
      const res = await fetch('/api/agora/config');
      const data = await res.json();
      if (data && data.appId) appId = data.appId;
    } catch (e) {}

    const formattedRoomId = String(roomId).toUpperCase().trim();
    const uid = (currentUser && currentUser.userId) ? String(currentUser.userId) : String(socket ? socket.id : Date.now());

    try {
      // 4. Join the voice channel named after roomId
      await this.client.join(appId, formattedRoomId, null, uid);

      // 5. Create & publish local microphone audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true
      });

      await this.client.publish([this.localAudioTrack]);
      this.isMicMuted = false;
      this.updateControlsUI();
      this.broadcastState();

      showToast('🎙️ Live Voice Chat Connected (Agora)!', 'success');
    } catch (err) {
      console.warn('Agora mic capture error or permission denied:', err);
      this.isMicMuted = true;
      showToast('🎙️ Voice Chat: Mic muted or permission needed. Click Mic ON to activate!', 'info');
      this.updateControlsUI();
      this.broadcastState();
    }
  },

  async toggleMic() {
    if (!this.localAudioTrack) {
      if (currentRoom) {
        await this.initInRoom(currentRoom.roomId);
      }
      return;
    }

    this.isMicMuted = !this.isMicMuted;
    try {
      await this.localAudioTrack.setMuted(this.isMicMuted);
    } catch (e) {
      console.warn('Error setting local track mute state:', e);
    }

    this.updateControlsUI();
    this.broadcastState();
    renderPlayersStrip();

    showToast(this.isMicMuted ? '🎙️ Microphone Muted 🔇' : '🎙️ Microphone Unmuted 🎙️', 'info');
  },

  toggleSpeaker() {
    this.isSpeakerMuted = !this.isSpeakerMuted;

    Object.values(this.remoteUsers).forEach(user => {
      if (user && user.audioTrack) {
        if (this.isSpeakerMuted) {
          user.audioTrack.stop();
        } else {
          user.audioTrack.play();
        }
      }
    });

    this.updateControlsUI();
    this.broadcastState();

    showToast(this.isSpeakerMuted ? '🔊 Room Audio Muted 🔇' : '🔊 Room Audio Enabled 🔊', 'info');
  },

  broadcastState() {
    if (socket && currentUser && currentRoom) {
      socket.emit('voice_state_change', {
        roomId: currentRoom.roomId,
        userId: currentUser.userId,
        isMicMuted: this.isMicMuted || !this.localAudioTrack,
        isSpeakerMuted: this.isSpeakerMuted
      });
    }
  },

  updateControlsUI() {
    const micBtn = document.getElementById('micToggleBtn');
    const micIcon = document.getElementById('micIcon');
    const micLabel = document.getElementById('micLabel');

    const speakerBtn = document.getElementById('speakerToggleBtn');
    const speakerIcon = document.getElementById('speakerIcon');
    const speakerLabel = document.getElementById('speakerLabel');

    if (micBtn && micIcon && micLabel) {
      if (this.isMicMuted || !this.localAudioTrack) {
        micBtn.classList.add('muted');
        micIcon.textContent = '🔇';
        micLabel.textContent = 'Mic OFF';
      } else {
        micBtn.classList.remove('muted');
        micIcon.textContent = '🎙️';
        micLabel.textContent = 'Mic ON';
      }
    }

    if (speakerBtn && speakerIcon && speakerLabel) {
      if (this.isSpeakerMuted) {
        speakerBtn.classList.add('muted');
        speakerIcon.textContent = '🔇';
        speakerLabel.textContent = 'Audio OFF';
      } else {
        speakerBtn.classList.remove('muted');
        speakerIcon.textContent = '🔊';
        speakerLabel.textContent = 'Audio ON';
      }
    }
  },

  async close() {
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch (e) {}
      this.localAudioTrack = null;
    }

    if (this.client) {
      try {
        await this.client.leave();
      } catch (e) {}
      this.client = null;
    }

    this.remoteUsers = {};
    this.voiceStates = {};
  }
};

window.VoiceChat = VoiceChat;

// Mobile audio unlocker for remote tracks
document.addEventListener('click', () => {
  if (VoiceChat.remoteUsers) {
    Object.values(VoiceChat.remoteUsers).forEach(user => {
      if (user && user.audioTrack && !VoiceChat.isSpeakerMuted) {
        user.audioTrack.play();
      }
    });
  }
}, { passive: true });
