/* ==========================================================================
   BINGO SERVER ADMIN PANEL JAVASCRIPT
   ========================================================================== */

(function () {
  'use strict';

  // Global Cache Data ID & Version Control
  const BINGO_CACHE_VERSION = 'v2_2026_09_20';
  try {
    const activeVersion = localStorage.getItem('bingo_cache_version');
    if (activeVersion !== BINGO_CACHE_VERSION) {
      console.log('🔄 New Cache Data Version detected (' + BINGO_CACHE_VERSION + '). Purging legacy cache IDs...');
      const legacyKeys = ['bingo_user_session', 'bingo_device_id', 'bingo_admin_token', 'bingo_admin_email', 'imgbb_api_key'];
      legacyKeys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('bingo_cache_version', BINGO_CACHE_VERSION);
    }
  } catch (e) {}

  // Application State
  const state = {
    token: localStorage.getItem('bingo_v2_admin_token') || '',
    adminEmail: localStorage.getItem('bingo_v2_admin_email') || '',
    currentPage: 1,
    limit: 20,
    search: '',
    challengeSearch: '',
    totalPages: 1,
    totalUsers: 0,
    activeTab: 'dashboard',
    searchDebounceTimer: null,
    chalSearchDebounceTimer: null,
    deleteTargetId: null,
    deleteChallengeTargetId: null,
    serverStartTime: null,
    selectedImageFile: null
  };

  // DOM Elements Selector Cache
  const el = {
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('loginForm'),
    adminEmail: document.getElementById('adminEmail'),
    adminPassword: document.getElementById('adminPassword'),
    togglePasswordBtn: document.getElementById('togglePasswordBtn'),
    loginError: document.getElementById('loginError'),
    loginErrorText: document.getElementById('loginErrorText'),
    
    mainContent: document.getElementById('mainContent'),
    adminEmailDisplay: document.getElementById('adminEmailDisplay'),
    adminAvatar: document.getElementById('adminAvatar'),
    logoutBtn: document.getElementById('logoutBtn'),
    serverBadge: document.getElementById('serverBadge'),
    statusBadgeText: document.getElementById('statusBadgeText'),
    
    pageTitle: document.getElementById('pageTitle'),
    pageSubTitle: document.getElementById('pageSubTitle'),
    liveClock: document.getElementById('liveClock'),
    headerUptimeTag: document.getElementById('headerUptimeTag'),
    globalRefreshBtn: document.getElementById('globalRefreshBtn'),
    
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // Dashboard Elements
    statTotalUsers: document.getElementById('statTotalUsers'),
    statTodayUsers: document.getElementById('statTodayUsers'),
    statTotalChallenges: document.getElementById('statTotalChallenges'),
    statDbStatus: document.getElementById('statDbStatus'),
    statServerMemory: document.getElementById('statServerMemory'),
    statServerUptime: document.getElementById('statServerUptime'),
    dashNodeVer: document.getElementById('dashNodeVer'),
    dashPlatform: document.getElementById('dashPlatform'),
    dashJwtState: document.getElementById('dashJwtState'),

    // MongoDB Telemetry Elements
    mongoLiveBadge: document.getElementById('mongoLiveBadge'),
    mongoPingTag: document.getElementById('mongoPingTag'),
    mongoDbNameTag: document.getElementById('mongoDbNameTag'),
    refreshMongoBtn: document.getElementById('refreshMongoBtn'),
    mongoWarningBanner: document.getElementById('mongoWarningBanner'),
    mongoCollectionsCount: document.getElementById('mongoCollectionsCount'),
    mongoDocumentsCount: document.getElementById('mongoDocumentsCount'),
    mongoStorageSize: document.getElementById('mongoStorageSize'),
    mongoDataSizeSub: document.getElementById('mongoDataSizeSub'),
    mongoIndexesCount: document.getElementById('mongoIndexesCount'),
    mongoIndexSizeSub: document.getElementById('mongoIndexSizeSub'),
    mongoCollectionsList: document.getElementById('mongoCollectionsList'),

    // Quick Actions
    quickAddUserBtn: document.getElementById('quickAddUserBtn'),
    quickCreateChallengeBtn: document.getElementById('quickCreateChallengeBtn'),
    quickCheckHealthBtn: document.getElementById('quickCheckHealthBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),

    // Users Tab
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    limitSelect: document.getElementById('limitSelect'),
    addNewUserModalBtn: document.getElementById('addNewUserModalBtn'),
    refreshUsersBtn: document.getElementById('refreshUsersBtn'),
    userTableBody: document.getElementById('userTableBody'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),

    // Challenges Tab
    challengeSearchInput: document.getElementById('challengeSearchInput'),
    openCreateChallengeModalBtn: document.getElementById('openCreateChallengeModalBtn'),
    refreshChallengesBtn: document.getElementById('refreshChallengesBtn'),
    challengesGrid: document.getElementById('challengesGrid'),

    // Options Tab
    sysOptionsList: document.getElementById('sysOptionsList'),
    testerEndpoint: document.getElementById('testerEndpoint'),
    runDiagnosticBtn: document.getElementById('runDiagnosticBtn'),
    resStatusCode: document.getElementById('resStatusCode'),
    resLatency: document.getElementById('resLatency'),
    resJsonBox: document.getElementById('resJsonBox'),
    routesTableBody: document.getElementById('routesTableBody'),

    // Add/Edit User Modal
    userModal: document.getElementById('userModal'),
    userForm: document.getElementById('userForm'),
    userModalTitle: document.getElementById('userModalTitle'),
    editUserId: document.getElementById('editUserId'),
    modalUserName: document.getElementById('modalUserName'),
    modalUsername: document.getElementById('modalUsername'),
    modalGmailId: document.getElementById('modalGmailId'),
    modalDeviceId: document.getElementById('modalDeviceId'),
    modalCoins: document.getElementById('modalCoins'),
    modalGems: document.getElementById('modalGems'),
    userModalError: document.getElementById('userModalError'),
    closeUserModalBtn: document.getElementById('closeUserModalBtn'),
    cancelUserModalBtn: document.getElementById('cancelUserModalBtn'),

    // Challenge Modal Elements
    challengeModal: document.getElementById('challengeModal'),
    challengeForm: document.getElementById('challengeForm'),
    challengeModalTitle: document.getElementById('challengeModalTitle'),
    editChallengeId: document.getElementById('editChallengeId'),
    chalTitle: document.getElementById('chalTitle'),
    chalCategory: document.getElementById('chalCategory'),
    chalCoverImage: document.getElementById('chalCoverImage'),
    chalColor1: document.getElementById('chalColor1'),
    chalColor1Picker: document.getElementById('chalColor1Picker'),
    chalColor2: document.getElementById('chalColor2'),
    chalColor2Picker: document.getElementById('chalColor2Picker'),
    gradientPreviewBox: document.getElementById('gradientPreviewBox'),
    previewTitleDisplay: document.getElementById('previewTitleDisplay'),
    chalEntryCoin: document.getElementById('chalEntryCoin'),
    chalEntryType: document.getElementById('chalEntryType'),
    chalRewardCoin: document.getElementById('chalRewardCoin'),
    chalRewardType: document.getElementById('chalRewardType'),
    chalMaxPlayers: document.getElementById('chalMaxPlayers'),
    chalStatus: document.getElementById('chalStatus'),
    chalModalError: document.getElementById('chalModalError'),
    closeChallengeModalBtn: document.getElementById('closeChallengeModalBtn'),
    cancelChallengeModalBtn: document.getElementById('cancelChallengeModalBtn'),

    // View Modal
    viewModal: document.getElementById('viewModal'),
    viewJsonContent: document.getElementById('viewJsonContent'),
    closeViewModalBtn: document.getElementById('closeViewModalBtn'),
    closeViewModalBtn2: document.getElementById('closeViewModalBtn2'),

    // Delete User Modal
    deleteModal: document.getElementById('deleteModal'),
    deleteUserName: document.getElementById('deleteUserName'),
    deleteUserEmail: document.getElementById('deleteUserEmail'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // Delete Challenge Modal
    deleteChallengeModal: document.getElementById('deleteChallengeModal'),
    deleteChalTitle: document.getElementById('deleteChalTitle'),
    closeDeleteChalModalBtn: document.getElementById('closeDeleteChalModalBtn'),
    cancelDeleteChalBtn: document.getElementById('cancelDeleteChalBtn'),
    confirmDeleteChalBtn: document.getElementById('confirmDeleteChalBtn'),

    // Rooms & Vivox Elements
    statActiveRooms: document.getElementById('statActiveRooms'),
    adminCreateRoomForm: document.getElementById('adminCreateRoomForm'),
    adminRoomName: document.getElementById('adminRoomName'),
    adminCreatorId: document.getElementById('adminCreatorId'),
    adminCreatorName: document.getElementById('adminCreatorName'),
    adminCustomRoomId: document.getElementById('adminCustomRoomId'),
    adminRoomCapacity: document.getElementById('adminRoomCapacity'),
    adminRoomPassword: document.getElementById('adminRoomPassword'),
    adminVivoxTokenForm: document.getElementById('adminVivoxTokenForm'),
    vivoxTestRoomId: document.getElementById('vivoxTestRoomId'),
    vivoxTestUserName: document.getElementById('vivoxTestUserName'),
    vivoxTestAction: document.getElementById('vivoxTestAction'),
    copyVivoxTokenBtn: document.getElementById('copyVivoxTokenBtn'),
    vivoxTokenOutputBox: document.getElementById('vivoxTokenOutputBox'),
    refreshRoomsBtn: document.getElementById('refreshRoomsBtn'),
    roomsTableBody: document.getElementById('roomsTableBody'),

    // Profile Pictures Tab Elements
    statTotalPictures: document.getElementById('statTotalPictures'),
    imgbbUploadForm: document.getElementById('imgbbUploadForm'),
    imgbbApiKey: document.getElementById('imgbbApiKey'),
    imgbbKeyStatusTag: document.getElementById('imgbbKeyStatusTag'),
    saveImgbbKeyBtn: document.getElementById('saveImgbbKeyBtn'),
    dropZone: document.getElementById('dropZone'),
    profilePicFile: document.getElementById('profilePicFile'),
    imagePreviewBox: document.getElementById('imagePreviewBox'),
    imagePreview: document.getElementById('imagePreview'),
    previewInfoTag: document.getElementById('previewInfoTag'),
    uploadImgbbBtn: document.getElementById('uploadImgbbBtn'),
    addDirectUrlForm: document.getElementById('addDirectUrlForm'),
    directImageUrl: document.getElementById('directImageUrl'),
    refreshPicturesBtn: document.getElementById('refreshPicturesBtn'),
    picturesGalleryGrid: document.getElementById('picturesGalleryGrid'),
    galleryCount: document.getElementById('galleryCount'),

    clearAllCacheBtn: document.getElementById('clearAllCacheBtn'),
    globalClearCacheBtn: document.getElementById('globalClearCacheBtn'),
    usersClearCacheBtn: document.getElementById('usersClearCacheBtn'),
    cacheClearStatusText: document.getElementById('cacheClearStatusText'),

    toastContainer: document.getElementById('toastContainer')
  };

  // Toast helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      info: 'fa-circle-info'
    };
    toast.innerHTML = `<i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Format Uptime
  function formatUptime(seconds) {
    if (!seconds || isNaN(seconds)) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // API Request Wrapper
  async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(endpoint, config);
    const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));

    if (res.status === 401 || res.status === 403) {
      if (endpoint !== '/api/admin/login') {
        showToast('Admin session expired. Please sign in.', 'error');
        logoutAdmin();
      }
    }

    return { status: res.status, ok: res.ok, data };
  }

  // Live Clock & Server Uptime Counter
  function startClock() {
    const update = () => {
      const now = new Date();
      if (el.liveClock) {
        el.liveClock.innerHTML = `<i class="fa-regular fa-clock"></i> ${now.toLocaleTimeString()}`;
      }
      if (el.headerUptimeTag) {
        if (state.serverStartTime) {
          const elapsedSec = Math.max(0, Math.floor((Date.now() - state.serverStartTime) / 1000));
          el.headerUptimeTag.innerHTML = `<i class="fa-solid fa-bolt"></i> Uptime: ${formatUptime(elapsedSec)}`;
        } else {
          el.headerUptimeTag.innerHTML = `<i class="fa-solid fa-bolt"></i> Uptime: --`;
        }
      }
    };
    update();
    setInterval(update, 1000);
  }

  // Auth Handling
  function checkAuth() {
    if (state.token) {
      if (el.loginScreen) el.loginScreen.classList.add('hidden');
      if (el.mainContent) el.mainContent.classList.remove('hidden');
      if (el.adminEmailDisplay) el.adminEmailDisplay.textContent = state.adminEmail || 'admin@admin';
      if (el.adminAvatar) el.adminAvatar.textContent = (state.adminEmail || 'A').charAt(0).toUpperCase();
      loadDashboardData();
    } else {
      if (el.loginScreen) el.loginScreen.classList.remove('hidden');
      if (el.mainContent) el.mainContent.classList.add('hidden');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (el.loginError) el.loginError.classList.add('hidden');

    const email = el.adminEmail.value.trim();
    const password = el.adminPassword.value;

    const { ok, data } = await apiRequest('/api/admin/login', 'POST', { email, password });

    if (ok && data.token) {
      state.token = data.token;
      state.adminEmail = email;
      localStorage.setItem('bingo_v2_admin_token', data.token);
      localStorage.setItem('bingo_v2_admin_email', email);
      showToast('Login successful! Welcome to Bingo Admin.', 'success');
      checkAuth();
    } else {
      if (el.loginErrorText) el.loginErrorText.textContent = data.error || 'Invalid credentials';
      if (el.loginError) el.loginError.classList.remove('hidden');
    }
  }

  function logoutAdmin() {
    state.token = '';
    state.adminEmail = '';
    localStorage.removeItem('bingo_v2_admin_token');
    localStorage.removeItem('bingo_v2_admin_email');
    checkAuth();
    showToast('Logged out successfully.', 'info');
  }

  // Tab Switcher
  function switchTab(tabId) {
    state.activeTab = tabId;
    el.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });
    el.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabId}Tab`);
    });

    const titles = {
      dashboard: { title: 'Dashboard Overview', sub: 'Real-time telemetry and overall summary' },
      users: { title: 'User Control & Rewards', sub: 'Manage accounts, update coins, gems, and profile details' },
      challenges: { title: 'Challenges Management', sub: 'Create and configure game room challenges' },
      rooms: { title: 'Multiplayer Rooms & Vivox', sub: 'Create test rooms, manage active games, and generate Vivox tokens' },
      pictures: { title: 'Profile Pictures (ImgBB)', sub: 'Upload images via ImgBB or add direct URLs to profilePictures.json' },
      options: { title: 'Server Options & Tools', sub: 'Diagnostic controls, system settings & API tester' }
    };
    const current = titles[tabId] || titles.dashboard;
    if (el.pageTitle) el.pageTitle.textContent = current.title;
    if (el.pageSubTitle) el.pageSubTitle.textContent = current.sub;

    if (tabId === 'dashboard') loadDashboardData();
    if (tabId === 'users') fetchUsers();
    if (tabId === 'challenges') fetchChallenges();
    if (tabId === 'rooms') fetchRooms();
    if (tabId === 'pictures') fetchProfilePictures();
    if (tabId === 'options') loadServerOptions();
  }

  // Live MongoDB Telemetry Fetcher
  async function fetchMongoTelemetry() {
    const { ok, data } = await apiRequest('/api/admin/db-status');
    if (!ok) return;

    if (data.isConnected) {
      if (el.mongoLiveBadge) {
        el.mongoLiveBadge.textContent = 'Connected Live';
        el.mongoLiveBadge.className = 'badge-pill green ml-2';
      }
      if (el.mongoWarningBanner) el.mongoWarningBanner.classList.add('hidden');
      if (el.mongoPingTag) el.mongoPingTag.innerHTML = `<i class="fa-solid fa-bolt text-amber"></i> Ping: ${data.pingMs !== null ? data.pingMs + ' ms' : '--'}`;
      if (el.mongoDbNameTag) el.mongoDbNameTag.innerHTML = `<i class="fa-solid fa-database text-cyan"></i> DB: ${escapeHtml(data.dbName)}`;

      if (data.stats) {
        if (el.mongoCollectionsCount) el.mongoCollectionsCount.textContent = (data.stats.collections || 0).toLocaleString();
        if (el.mongoDocumentsCount) el.mongoDocumentsCount.textContent = (data.stats.documents || 0).toLocaleString();
        if (el.mongoStorageSize) el.mongoStorageSize.textContent = data.stats.storageSizeFormatted || '--';
        if (el.mongoDataSizeSub) el.mongoDataSizeSub.textContent = `Data Size: ${data.stats.dataSizeFormatted || '--'}`;
        if (el.mongoIndexesCount) el.mongoIndexesCount.textContent = (data.stats.indexes || 0).toLocaleString();
        if (el.mongoIndexSizeSub) el.mongoIndexSizeSub.textContent = `Index Size: ${data.stats.indexSizeFormatted || '--'}`;
      }

      if (data.collectionsList && Array.isArray(data.collectionsList) && el.mongoCollectionsList) {
        if (data.collectionsList.length === 0) {
          el.mongoCollectionsList.innerHTML = '<span class="text-dim">No collections created yet.</span>';
        } else {
          el.mongoCollectionsList.innerHTML = data.collectionsList.map(c => `
            <div class="collection-chip">
              <i class="fa-solid fa-table"></i>
              <span>${escapeHtml(c.name)}:</span>
              <strong>${(c.count || 0).toLocaleString()} docs</strong>
            </div>
          `).join('');
        }
      }
    } else {
      if (el.mongoLiveBadge) {
        el.mongoLiveBadge.textContent = 'Disconnected';
        el.mongoLiveBadge.className = 'badge-pill text-danger ml-2';
      }
      if (el.mongoWarningBanner) el.mongoWarningBanner.classList.remove('hidden');
      if (el.mongoPingTag) el.mongoPingTag.innerHTML = '<i class="fa-solid fa-bolt text-danger"></i> Ping: Offline';
      if (el.mongoDbNameTag) el.mongoDbNameTag.innerHTML = `<i class="fa-solid fa-database"></i> DB: ${escapeHtml(data.dbName || 'bingo_game')}`;
      if (el.mongoCollectionsList) el.mongoCollectionsList.innerHTML = '<span class="text-danger">Database offline. Please check Atlas IP whitelist.</span>';
    }
  }

  // Dashboard Data
  async function loadDashboardData() {
    const health = await apiRequest('/api/health');
    if (health.ok) {
      if (health.data.uptime) {
        state.serverStartTime = Date.now() - (health.data.uptime * 1000);
      }
      if (el.serverBadge) {
        const pulse = el.serverBadge.querySelector('.pulse-dot');
        if (pulse) pulse.className = 'pulse-dot green';
      }
      if (el.statusBadgeText) el.statusBadgeText.textContent = `Server Online (DB: ${health.data.database})`;
    } else {
      if (el.serverBadge) {
        const pulse = el.serverBadge.querySelector('.pulse-dot');
        if (pulse) pulse.className = 'pulse-dot red';
      }
      if (el.statusBadgeText) el.statusBadgeText.textContent = 'Server Offline';
    }

    const statsRes = await apiRequest('/api/admin/stats');
    if (statsRes.ok) {
      const s = statsRes.data;
      if (el.statTotalUsers) el.statTotalUsers.textContent = s.totalUsers !== undefined ? s.totalUsers.toLocaleString() : '0';
      if (el.statTodayUsers) el.statTodayUsers.textContent = s.todayUsers !== undefined ? s.todayUsers.toLocaleString() : '0';
      if (el.statTotalChallenges) el.statTotalChallenges.textContent = s.totalChallenges !== undefined ? s.totalChallenges.toLocaleString() : '0';

      const dbConnected = s.database === 'connected';
      if (el.statDbStatus) {
        el.statDbStatus.innerHTML = `<span class="status-indicator ${dbConnected ? 'text-accent-green' : 'text-danger'}">${s.database || 'unknown'}</span>`;
      }

      if (s.memory && el.statServerMemory) {
        const heapUsedMB = Math.round((s.memory.heapUsed || 0) / 1024 / 1024);
        el.statServerMemory.textContent = `${heapUsedMB} MB Heap`;
      }
      if (s.uptime) {
        state.serverStartTime = Date.now() - (s.uptime * 1000);
        if (el.statServerUptime) el.statServerUptime.textContent = `Uptime: ${formatUptime(s.uptime)}`;
      }
    }

    const sysRes = await apiRequest('/api/admin/system');
    if (sysRes.ok) {
      const sys = sysRes.data;
      if (sys.server) {
        if (el.dashNodeVer) el.dashNodeVer.textContent = sys.server.nodeVersion || '--';
        if (el.dashPlatform) el.dashPlatform.textContent = `${sys.server.platform} (${sys.server.arch})`;
      }
      if (sys.environment && el.dashJwtState) {
        el.dashJwtState.textContent = sys.environment.hasJwtSecret ? 'Configured' : 'Missing';
        el.dashJwtState.className = `info-value badge-pill ${sys.environment.hasJwtSecret ? 'green' : 'text-danger'}`;
      }
    }

    fetchMongoTelemetry();
  }

  // ==================== USER MANAGEMENT ====================

  async function fetchUsers() {
    el.userTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
          <p class="mt-2 text-sub">Loading user accounts...</p>
        </td>
      </tr>
    `;

    const query = new URLSearchParams({
      page: state.currentPage,
      limit: state.limit,
      search: state.search
    });

    const { ok, data } = await apiRequest(`/api/admin/users?${query.toString()}`);

    if (!ok) {
      el.userTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-danger">
            <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
            <p class="mt-2">${data.error || 'Failed to load user list'}</p>
          </td>
        </tr>
      `;
      return;
    }

    renderUserTable(data.users || [], data.pagination || {});
  }

  function renderUserTable(users, pagination) {
    state.totalUsers = pagination.total || 0;
    state.totalPages = pagination.totalPages || 1;

    if (users.length === 0) {
      el.userTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4">
            <i class="fa-solid fa-folder-open fa-2x" style="color: var(--text-dim);"></i>
            <p class="mt-2 text-sub">No user records found.</p>
          </td>
        </tr>
      `;
      el.paginationInfo.textContent = 'Showing 0 of 0 users';
      renderPaginationControls(1, 1);
      return;
    }

    const startItem = (pagination.page - 1) * pagination.limit + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.total);
    el.paginationInfo.textContent = `Showing ${startItem} - ${endItem} of ${pagination.total} users`;

    let html = '';
    users.forEach((u, idx) => {
      const itemNum = startItem + idx;
      const initial = (u.name || 'U').charAt(0).toUpperCase();
      const formattedDate = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A';
      const coins = Number(u.coins || 0).toLocaleString();
      const gems = Number(u.gems || 0).toLocaleString();
      const usernameTag = u.username
        ? `<span class="id-badge copy-trigger" title="Click to copy Username" data-copy="${escapeHtml(u.username)}"><i class="fa-solid fa-gamepad text-purple"></i> ${escapeHtml(u.username)}</span>`
        : '<span class="text-dim">N/A</span>';
      const deviceTag = u.deviceId
        ? `<span class="id-badge copy-trigger" title="Click to copy Device ID" data-copy="${escapeHtml(u.deviceId)}"><i class="fa-solid fa-mobile-screen text-cyan"></i> ${escapeHtml(u.deviceId)}</span>`
        : '<span class="text-dim">N/A</span>';

      html += `
        <tr>
          <td>${itemNum}</td>
          <td>
            <div class="user-cell">
              <div class="avatar-circle">${initial}</div>
              <span class="user-name-text">${escapeHtml(u.name)}</span>
            </div>
          </td>
          <td>${usernameTag}</td>
          <td>
            <span class="gmail-tag"><i class="fa-solid fa-envelope"></i> ${escapeHtml(u.gmailId)}</span>
          </td>
          <td>${deviceTag}</td>
          <td><span class="coin-badge">🟡 ${coins}</span></td>
          <td><span class="gem-badge">💎 ${gems}</span></td>
          <td>
            <span class="id-badge copy-trigger" title="Click to copy ID" data-copy="${u._id}">
              ${u._id} <i class="fa-regular fa-copy"></i>
            </span>
          </td>
          <td class="text-sub">${formattedDate}</td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" title="View Document JSON" data-action="view" data-id="${u._id}">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-icon" title="Edit Profile & Currency" data-action="edit" data-id="${u._id}" data-name="${escapeHtml(u.name)}" data-username="${escapeHtml(u.username || '')}" data-gmail="${escapeHtml(u.gmailId)}" data-device="${escapeHtml(u.deviceId || '')}" data-coins="${u.coins || 0}" data-gems="${u.gems || 0}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-icon delete" title="Delete User" data-action="delete" data-id="${u._id}" data-name="${escapeHtml(u.name)}" data-gmail="${escapeHtml(u.gmailId)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    el.userTableBody.innerHTML = html;
    renderPaginationControls(pagination.page, pagination.totalPages);
  }

  function renderPaginationControls(page, totalPages) {
    let html = '';
    html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">Previous</button>`;

    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">Next</button>`;
    el.paginationControls.innerHTML = html;
  }

  function openAddUserModal() {
    el.editUserId.value = '';
    el.modalUserName.value = '';
    if (el.modalUsername) el.modalUsername.value = '';
    el.modalGmailId.value = '';
    if (el.modalDeviceId) el.modalDeviceId.value = '';
    el.modalCoins.value = '1000';
    el.modalGems.value = '0';
    el.userModalTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New User';
    el.userModalError.classList.add('hidden');
    el.userModal.classList.remove('hidden');
  }

  function openEditUserModal(id, name, username, gmail, deviceId, coins, gems) {
    el.editUserId.value = id;
    el.modalUserName.value = name;
    if (el.modalUsername) el.modalUsername.value = username || '';
    el.modalGmailId.value = gmail;
    if (el.modalDeviceId) el.modalDeviceId.value = deviceId || '';
    el.modalCoins.value = coins !== undefined ? coins : '1000';
    el.modalGems.value = gems !== undefined ? gems : '0';
    el.userModalTitle.innerHTML = '<i class="fa-solid fa-pen"></i> Edit User Profile & Device ID';
    el.userModalError.classList.add('hidden');
    el.userModal.classList.remove('hidden');
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    el.userModalError.classList.add('hidden');

    const id = el.editUserId.value;
    const name = el.modalUserName.value.trim();
    const username = el.modalUsername ? el.modalUsername.value.trim() : '';
    const gmailId = el.modalGmailId.value.trim().toLowerCase();
    const deviceId = el.modalDeviceId ? el.modalDeviceId.value.trim() : '';
    const coins = Math.max(Number(el.modalCoins.value) || 0, 0);
    const gems = Math.max(Number(el.modalGems.value) || 0, 0);

    if (!name) {
      showModalError('User name is required.');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(gmailId)) {
      showModalError('Gmail ID must end with @gmail.com');
      return;
    }

    const payload = { name, gmailId, deviceId, coins, gems };
    if (username) {
      payload.username = username;
    }

    let res;
    if (id) {
      res = await apiRequest(`/api/admin/users/${id}`, 'PATCH', payload);
    } else {
      res = await apiRequest('/api/admin/users', 'POST', payload);
    }

    if (res.ok) {
      showToast(id ? 'User updated successfully' : 'User created successfully', 'success');
      el.userModal.classList.add('hidden');
      fetchUsers();
      loadDashboardData();
    } else {
      showModalError(res.data.error || 'Operation failed');
    }
  }

  function showModalError(msg) {
    el.userModalError.textContent = msg;
    el.userModalError.classList.remove('hidden');
  }

  async function openViewJsonModal(id, directObj) {
    if (directObj) {
      el.viewJsonContent.textContent = JSON.stringify(directObj, null, 2);
      el.viewModal.classList.remove('hidden');
      return;
    }
    const { ok, data } = await apiRequest(`/api/admin/users/${id}`);
    if (ok) {
      el.viewJsonContent.textContent = JSON.stringify(data.user, null, 2);
      el.viewModal.classList.remove('hidden');
    } else {
      showToast(data.error || 'Unable to view user JSON', 'error');
    }
  }

  function openDeleteModal(id, name, gmail) {
    state.deleteTargetId = id;
    el.deleteUserName.textContent = name;
    el.deleteUserEmail.textContent = gmail;
    el.deleteModal.classList.remove('hidden');
  }

  async function handleConfirmDelete() {
    if (!state.deleteTargetId) return;
    const id = state.deleteTargetId;

    const { ok, data } = await apiRequest(`/api/admin/users/${id}`, 'DELETE');
    el.deleteModal.classList.add('hidden');

    if (ok) {
      showToast('User record permanently deleted.', 'success');
      fetchUsers();
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to delete user', 'error');
    }
  }

  // Export CSV
  async function exportData(format) {
    showToast(`Generating ${format.toUpperCase()} export...`, 'info');
    const { ok, data } = await apiRequest('/api/admin/users?page=1&limit=1000');
    if (!ok || !data.users) {
      showToast('Export failed to retrieve data', 'error');
      return;
    }

    const users = data.users;
    let content = '';
    let mimeType = 'text/csv';
    let filename = `bingo_users_export_${Date.now()}.csv`;

    const headers = ['User ID', 'Name', 'Gmail ID', 'Device ID', 'Coins', 'Gems', 'Created At'];
    const rows = users.map(u => [
      `"${u._id}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.gmailId || '').replace(/"/g, '""')}"`,
      `"${(u.deviceId || '').replace(/"/g, '""')}"`,
      u.coins || 0,
      u.gems || 0,
      `"${u.createdAt || ''}"`
    ]);
    content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV export downloaded successfully!', 'success');
  }

  // ==================== CHALLENGES MANAGEMENT ====================

  async function fetchChallenges() {
    el.challengesGrid.innerHTML = `
      <div class="text-center py-4 full-width">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--accent-amber);"></i>
        <p class="mt-2 text-sub">Loading game challenges...</p>
      </div>
    `;

    const query = new URLSearchParams({ search: state.challengeSearch });
    const { ok, data } = await apiRequest(`/api/admin/challenges?${query.toString()}`);

    if (!ok) {
      el.challengesGrid.innerHTML = `
        <div class="text-center py-4 full-width text-danger">
          <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
          <p class="mt-2">${data.error || 'Failed to load challenges'}</p>
        </div>
      `;
      return;
    }

    renderChallengesGrid(data.challenges || []);
  }

  function renderChallengesGrid(challenges) {
    if (challenges.length === 0) {
      el.challengesGrid.innerHTML = `
        <div class="text-center py-4 full-width">
          <i class="fa-solid fa-trophy fa-3x" style="color: var(--text-dim);"></i>
          <p class="mt-2 text-sub">No game challenges found. Click 'Create Challenge' to add one!</p>
        </div>
      `;
      return;
    }

    let html = '';
    challenges.forEach(c => {
      const bgStyle = c.coverImage
        ? `background-image: url('${c.coverImage}');`
        : `background: linear-gradient(135deg, ${c.color1 || '#6366f1'}, ${c.color2 || '#a855f7'});`;

      const entryIcon = c.entryCurrencyType === 'gems' ? '💎' : '🟡';
      const entryLabel = c.entryCurrencyType === 'gems' ? 'Gems' : 'Coins';
      const rewardIcon = c.rewardCurrencyType === 'gems' ? '💎' : '🟡';
      const rewardLabel = c.rewardCurrencyType === 'gems' ? 'Gems' : 'Coins';

      html += `
        <div class="challenge-card">
          <div class="challenge-banner" style="${bgStyle}">
            <div class="challenge-banner-overlay"></div>
            <span class="challenge-status-badge ${c.status === 'inactive' ? 'inactive' : 'active'}">${c.status || 'active'}</span>
            <div class="challenge-title">${escapeHtml(c.title)}</div>
          </div>
          <div class="challenge-body">
            <div class="challenge-meta-row">
              <span class="meta-label"><i class="fa-solid fa-folder-tree text-amber"></i> Category:</span>
              <span class="meta-value badge-pill amber">${escapeHtml(c.category || 'Standard')}</span>
            </div>
            <div class="challenge-meta-row">
              <span class="meta-label"><i class="fa-solid fa-right-to-bracket text-amber"></i> Entry Fee:</span>
              <span class="meta-value ${c.entryCurrencyType === 'gems' ? 'text-cyan' : 'text-amber'}">${entryIcon} ${c.entryCoin || 0} ${entryLabel}</span>
            </div>
            <div class="challenge-meta-row">
              <span class="meta-label"><i class="fa-solid fa-gift text-green"></i> Reward Prize:</span>
              <span class="meta-value ${c.rewardCurrencyType === 'gems' ? 'text-cyan' : 'text-green'}">${rewardIcon} ${c.rewardCoin || 0} ${rewardLabel}</span>
            </div>
            <div class="challenge-meta-row">
              <span class="meta-label"><i class="fa-solid fa-users text-purple"></i> Max Players:</span>
              <span class="meta-value">${c.maxPlayers || 2} Players</span>
            </div>
            <div class="challenge-meta-row">
              <span class="meta-label"><i class="fa-solid fa-palette"></i> Colors:</span>
              <span class="meta-value font-mono text-dim">${c.color1} ➔ ${c.color2}</span>
            </div>
            <div class="challenge-actions">
              <button class="btn btn-outline btn-sm" data-action="edit-chal" data-id="${c._id}">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
              <button class="btn btn-danger btn-sm" data-action="delete-chal" data-id="${c._id}" data-title="${escapeHtml(c.title)}">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
    });

    el.challengesGrid.innerHTML = html;
  }

  function syncGradientPreview() {
    const c1 = el.chalColor1.value.trim() || '#6366f1';
    const c2 = el.chalColor2.value.trim() || '#a855f7';
    const title = el.chalTitle.value.trim() || 'Live Gradient Preview';

    el.gradientPreviewBox.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
    el.previewTitleDisplay.textContent = title;
  }

  function openCreateChallengeModal() {
    el.editChallengeId.value = '';
    el.chalTitle.value = '';
    if (el.chalCategory) el.chalCategory.value = 'Standard';
    el.chalCoverImage.value = '';
    el.chalColor1.value = '#6366f1';
    el.chalColor1Picker.value = '#6366f1';
    el.chalColor2.value = '#a855f7';
    el.chalColor2Picker.value = '#a855f7';
    el.chalEntryCoin.value = '100';
    if (el.chalEntryType) el.chalEntryType.value = 'coins';
    el.chalRewardCoin.value = '250';
    if (el.chalRewardType) el.chalRewardType.value = 'coins';
    el.chalMaxPlayers.value = '4';
    el.chalStatus.value = 'active';

    el.challengeModalTitle.innerHTML = '<i class="fa-solid fa-trophy"></i> Create Game Challenge';
    el.chalModalError.classList.add('hidden');
    syncGradientPreview();
    el.challengeModal.classList.remove('hidden');
  }

  async function openEditChallengeModal(id) {
    const { ok, data } = await apiRequest(`/api/admin/challenges/${id}`);
    if (!ok || !data.challenge) {
      showToast('Unable to load challenge details', 'error');
      return;
    }

    const c = data.challenge;
    el.editChallengeId.value = c._id;
    el.chalTitle.value = c.title;
    if (el.chalCategory) el.chalCategory.value = c.category || 'Standard';
    el.chalCoverImage.value = c.coverImage || '';
    el.chalColor1.value = c.color1 || '#6366f1';
    el.chalColor1Picker.value = c.color1 || '#6366f1';
    el.chalColor2.value = c.color2 || '#a855f7';
    el.chalColor2Picker.value = c.color2 || '#a855f7';
    el.chalEntryCoin.value = c.entryCoin || 0;
    if (el.chalEntryType) el.chalEntryType.value = c.entryCurrencyType || 'coins';
    el.chalRewardCoin.value = c.rewardCoin || 0;
    if (el.chalRewardType) el.chalRewardType.value = c.rewardCurrencyType || 'coins';
    el.chalMaxPlayers.value = c.maxPlayers || 4;
    el.chalStatus.value = c.status || 'active';

    el.challengeModalTitle.innerHTML = '<i class="fa-solid fa-pen"></i> Edit Game Challenge';
    el.chalModalError.classList.add('hidden');
    syncGradientPreview();
    el.challengeModal.classList.remove('hidden');
  }

  async function handleSaveChallenge(e) {
    e.preventDefault();
    el.chalModalError.classList.add('hidden');

    const id = el.editChallengeId.value;
    const title = el.chalTitle.value.trim();
    const category = el.chalCategory ? el.chalCategory.value.trim() : 'Standard';
    const coverImage = el.chalCoverImage.value.trim();
    const color1 = el.chalColor1.value.trim();
    const color2 = el.chalColor2.value.trim();
    const entryCoin = Math.max(Number(el.chalEntryCoin.value) || 0, 0);
    const entryCurrencyType = el.chalEntryType ? el.chalEntryType.value : 'coins';
    const rewardCoin = Math.max(Number(el.chalRewardCoin.value) || 0, 0);
    const rewardCurrencyType = el.chalRewardType ? el.chalRewardType.value : 'coins';
    const maxPlayers = Math.max(Number(el.chalMaxPlayers.value) || 2, 2);
    const status = el.chalStatus.value;

    if (!title) {
      showChalModalError('Challenge title is required');
      return;
    }

    const body = {
      title,
      category,
      coverImage,
      color1,
      color2,
      entryCoin,
      entryCurrencyType,
      rewardCoin,
      rewardCurrencyType,
      maxPlayers,
      status
    };
    let res;
    if (id) {
      res = await apiRequest(`/api/admin/challenges/${id}`, 'PATCH', body);
    } else {
      res = await apiRequest('/api/admin/challenges', 'POST', body);
    }

    if (res.ok) {
      showToast(id ? 'Challenge updated successfully' : 'Challenge created successfully', 'success');
      el.challengeModal.classList.add('hidden');
      fetchChallenges();
      loadDashboardData();
    } else {
      showChalModalError(res.data.error || 'Failed to save challenge');
    }
  }

  function showChalModalError(msg) {
    el.chalModalError.textContent = msg;
    el.chalModalError.classList.remove('hidden');
  }

  function openDeleteChallengeModal(id, title) {
    state.deleteChallengeTargetId = id;
    el.deleteChalTitle.textContent = title;
    el.deleteChallengeModal.classList.remove('hidden');
  }

  async function handleConfirmDeleteChallenge() {
    if (!state.deleteChallengeTargetId) return;
    const id = state.deleteChallengeTargetId;

    const { ok, data } = await apiRequest(`/api/admin/challenges/${id}`, 'DELETE');
    el.deleteChallengeModal.classList.add('hidden');

    if (ok) {
      showToast('Challenge deleted successfully', 'success');
      fetchChallenges();
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to delete challenge', 'error');
    }
  }

  // ==================== MULTIPLAYER ROOMS & VIVOX ====================

  async function fetchRooms() {
    if (!el.roomsTableBody) return;
    el.roomsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p class="mt-2 text-sub">Fetching active rooms...</p>
        </td>
      </tr>
    `;

    const { ok, data } = await apiRequest('/api/rooms');
    if (!ok) {
      el.roomsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-danger">
            <i class="fa-solid fa-circle-exclamation fa-2x"></i>
            <p class="mt-2">Failed to load active rooms</p>
          </td>
        </tr>
      `;
      return;
    }

    const rooms = data.rooms || [];
    if (el.statActiveRooms) el.statActiveRooms.textContent = rooms.length;

    if (rooms.length === 0) {
      el.roomsTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4 text-sub">
            <i class="fa-solid fa-door-closed fa-2x mb-2"></i>
            <p>No active rooms waiting in MongoDB. Create one above to test!</p>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    rooms.forEach(r => {
      const isPublicBadge = r.hasPassword || (r.password && r.password.length > 0)
        ? '<span class="badge-pill red"><i class="fa-solid fa-lock"></i> Protected</span>'
        : '<span class="badge-pill green"><i class="fa-solid fa-earth-americas"></i> Public</span>';
      
      const statusBadge = `<span class="badge-pill cyan">${r.status || 'waiting'}</span>`;
      const jsonStr = encodeURIComponent(JSON.stringify(r));

      const playersListHtml = (r.players && r.players.length > 0)
        ? r.players.map(p => `
            <span class="badge-pill ${p.isCreator ? 'amber' : 'purple'}" title="User ID: ${escapeHtml(p.userId)}">
              <i class="fa-solid ${p.isCreator ? 'fa-crown' : 'fa-user'}"></i> ${escapeHtml(p.name)}
            </span>
          `).join(' ')
        : '<span class="text-dim">No players joined</span>';

      html += `
        <tr>
          <td><code>${escapeHtml(r.roomId)}</code></td>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td>${escapeHtml(r.creatorName)} <small class="text-dim">(${escapeHtml(r.creatorId)})</small></td>
          <td>${playersListHtml}</td>
          <td><span class="badge-pill purple">${r.players ? r.players.length : 0} / ${r.capacity}</span></td>
          <td>${isPublicBadge}</td>
          <td>${statusBadge}</td>
          <td><small class="text-dim"><code>${escapeHtml(r.vivoxChannelUri || 'N/A')}</code></small></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" title="View Room Details JSON" data-action="view-room" data-json="${jsonStr}">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-icon delete" title="End & Delete Room" data-action="end-room" data-id="${escapeHtml(r.roomId)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    el.roomsTableBody.innerHTML = html;
  }

  async function handleAdminCreateRoom(e) {
    e.preventDefault();
    const name = el.adminRoomName.value.trim();
    const creatorId = el.adminCreatorId.value.trim();
    const creatorName = el.adminCreatorName.value.trim();
    const customRoomId = el.adminCustomRoomId.value.trim();
    const capacity = Number(el.adminRoomCapacity.value) || 4;
    const password = el.adminRoomPassword.value.trim();

    const payload = {
      name,
      creatorId,
      creatorName,
      customRoomId,
      capacity,
      password
    };

    const { ok, data } = await apiRequest('/api/rooms', 'POST', payload);
    if (ok) {
      showToast(`Room '${data.room.roomId}' created successfully!`, 'success');
      if (el.vivoxTestRoomId) el.vivoxTestRoomId.value = data.room.roomId;
      if (el.vivoxTokenOutputBox) el.vivoxTokenOutputBox.textContent = JSON.stringify(data, null, 2);
      fetchRooms();
    } else {
      showToast(data.error || 'Failed to create room', 'error');
    }
  }

  async function handleGenerateVivoxToken(e) {
    e.preventDefault();
    const roomId = el.vivoxTestRoomId.value.trim();
    const userName = el.vivoxTestUserName.value.trim();
    const action = el.vivoxTestAction.value;

    if (!roomId || !userName) {
      showToast('Room ID and Username are required for Vivox token generation.', 'error');
      return;
    }

    const { ok, data } = await apiRequest(`/api/rooms/${roomId}/vivox-token`, 'POST', { userName, action });
    if (ok) {
      showToast('Vivox authentication token generated!', 'success');
      if (el.vivoxTokenOutputBox) el.vivoxTokenOutputBox.textContent = JSON.stringify(data, null, 2);
    } else {
      showToast(data.error || 'Failed to generate Vivox token', 'error');
    }
  }

  function copyVivoxToken() {
    if (!el.vivoxTokenOutputBox) return;
    const text = el.vivoxTokenOutputBox.textContent;
    if (text && text.trim().length > 0 && !text.startsWith('//')) {
      navigator.clipboard.writeText(text);
      showToast('Vivox token payload copied to clipboard!', 'success');
    } else {
      showToast('No generated token payload to copy.', 'info');
    }
  }

  async function handleEndRoom(roomId) {
    if (!confirm(`Are you sure you want to remove and delete room '${roomId}' from MongoDB?`)) return;
    const { ok, data } = await apiRequest(`/api/rooms/${roomId}`, 'DELETE');
    if (ok) {
      showToast(`Room '${roomId}' removed permanently from MongoDB.`, 'success');
      fetchRooms();
    } else {
      showToast(data.error || 'Failed to delete room', 'error');
    }
  }

  // ==================== OPTIONS TAB ====================

  async function loadServerOptions() {
    el.sysOptionsList.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> Fetching system options...</div>';

    const { ok, data } = await apiRequest('/api/admin/system');
    if (!ok) {
      el.sysOptionsList.innerHTML = `<div class="text-danger py-2">Failed to load system settings: ${data.error}</div>`;
      return;
    }

    const s = data.server || {};
    const m = data.memory || {};
    const env = data.environment || {};

    const options = [
      { key: 'Server Listening Port', val: s.port },
      { key: 'Node.js Version', val: s.nodeVersion },
      { key: 'Operating System', val: `${s.platform} (${s.arch})` },
      { key: 'CPU Cores Count', val: s.cpuCores },
      { key: 'System Total Uptime', val: formatUptime(s.systemUptime) },
      { key: 'Process Active Uptime', val: formatUptime(s.processUptime) },
      { key: 'Allowed CORS Origin', val: s.corsOrigin },
      { key: 'Database Connection', val: data.dbState || 'unknown' },
      { key: 'Memory RSS Usage', val: m.rss || 'N/A' },
      { key: 'Memory Heap Used / Total', val: `${m.heapUsed} / ${m.heapTotal}` },
      { key: 'JWT Secret Key Configured', val: env.hasJwtSecret ? 'Yes (Active)' : 'No (Missing)' },
      { key: 'MongoDB URI Configured', val: env.hasMongoUri ? 'Yes (Configured)' : 'No (Missing)' }
    ];

    el.sysOptionsList.innerHTML = options.map(opt => `
      <div class="sys-option-row">
        <span class="sys-opt-key">${opt.key}</span>
        <span class="sys-opt-val">${opt.val}</span>
      </div>
    `).join('');

    if (data.routes && Array.isArray(data.routes)) {
      el.routesTableBody.innerHTML = data.routes.map(r => {
        const methodClass = r.method.toLowerCase();
        return `
          <tr>
            <td><span class="method-badge ${methodClass}">${r.method}</span></td>
            <td><code>${r.path}</code></td>
            <td><span class="badge-pill">${r.auth}</span></td>
            <td class="text-sub">${r.desc}</td>
          </tr>
        `;
      }).join('');
    }
  }

  async function runDiagnostic() {
    const endpoint = el.testerEndpoint.value;
    el.resStatusCode.textContent = '...';
    el.resLatency.textContent = '...';
    el.resJsonBox.textContent = 'Sending request...';

    const startTime = performance.now();
    const { status, data } = await apiRequest(endpoint);
    const endTime = performance.now();

    el.resStatusCode.textContent = status;
    el.resLatency.textContent = `${Math.round(endTime - startTime)} ms`;
    el.resJsonBox.textContent = JSON.stringify(data, null, 2);
  }

  // Setup Event Listeners
  function initEvents() {
    el.loginForm.addEventListener('submit', handleLogin);
    el.logoutBtn.addEventListener('click', logoutAdmin);
    el.togglePasswordBtn.addEventListener('click', () => {
      const type = el.adminPassword.type === 'password' ? 'text' : 'password';
      el.adminPassword.type = type;
      el.togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });

    el.navItems.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    el.globalRefreshBtn.addEventListener('click', () => {
      showToast('Refreshing all telemetry data...', 'info');
      loadDashboardData();
      if (state.activeTab === 'users') fetchUsers();
      if (state.activeTab === 'challenges') fetchChallenges();
      if (state.activeTab === 'rooms') fetchRooms();
      if (state.activeTab === 'options') loadServerOptions();
    });

    // Quick Actions
    el.quickAddUserBtn.addEventListener('click', openAddUserModal);
    el.quickCreateChallengeBtn.addEventListener('click', () => {
      switchTab('challenges');
      openCreateChallengeModal();
    });
    el.quickCheckHealthBtn.addEventListener('click', async () => {
      const { status, data } = await apiRequest('/api/health');
      showToast(`Health Check [${status}]: Server is ${data.database === 'connected' ? 'Healthy' : 'Degraded'}`, data.ok ? 'success' : 'error');
    });
    el.exportCsvBtn.addEventListener('click', () => exportData('csv'));

    // User Table Events
    el.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      el.clearSearchBtn.classList.toggle('hidden', !val);
      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        state.search = val.trim();
        state.currentPage = 1;
        fetchUsers();
      }, 350);
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      el.clearSearchBtn.classList.add('hidden');
      state.search = '';
      state.currentPage = 1;
      fetchUsers();
    });

    el.limitSelect.addEventListener('change', (e) => {
      state.limit = Number(e.target.value);
      state.currentPage = 1;
      fetchUsers();
    });

    el.addNewUserModalBtn.addEventListener('click', openAddUserModal);
    el.refreshUsersBtn.addEventListener('click', fetchUsers);

    el.paginationControls.addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (btn && !btn.disabled) {
        state.currentPage = Number(btn.dataset.page);
        fetchUsers();
      }
    });

    el.userTableBody.addEventListener('click', (e) => {
      const copyEl = e.target.closest('.copy-trigger');
      if (copyEl && copyEl.dataset.copy) {
        navigator.clipboard.writeText(copyEl.dataset.copy);
        showToast('Copied to clipboard!', 'info');
        return;
      }

      const btn = e.target.closest('.btn-icon');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const username = btn.dataset.username;
      const gmail = btn.dataset.gmail;
      const coins = btn.dataset.coins;
      const gems = btn.dataset.gems;
      const device = btn.dataset.device;

      if (action === 'view') openViewJsonModal(id);
      if (action === 'edit') openEditUserModal(id, name, username, gmail, device, coins, gems);
      if (action === 'delete') openDeleteModal(id, name, gmail);
    });

    el.userForm.addEventListener('submit', handleSaveUser);
    el.closeUserModalBtn.addEventListener('click', () => el.userModal.classList.add('hidden'));
    el.cancelUserModalBtn.addEventListener('click', () => el.userModal.classList.add('hidden'));

    el.closeViewModalBtn.addEventListener('click', () => el.viewModal.classList.add('hidden'));
    el.closeViewModalBtn2.addEventListener('click', () => el.viewModal.classList.add('hidden'));

    el.closeDeleteModalBtn.addEventListener('click', () => el.deleteModal.classList.add('hidden'));
    el.cancelDeleteBtn.addEventListener('click', () => el.deleteModal.classList.add('hidden'));
    el.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Challenges Events
    el.challengeSearchInput.addEventListener('input', (e) => {
      clearTimeout(state.chalSearchDebounceTimer);
      state.chalSearchDebounceTimer = setTimeout(() => {
        state.challengeSearch = e.target.value.trim();
        fetchChallenges();
      }, 350);
    });

    el.openCreateChallengeModalBtn.addEventListener('click', openCreateChallengeModal);
    el.refreshChallengesBtn.addEventListener('click', fetchChallenges);

    // Gradient Color Picker Sync
    el.chalColor1Picker.addEventListener('input', (e) => {
      el.chalColor1.value = e.target.value;
      syncGradientPreview();
    });
    el.chalColor1.addEventListener('input', (e) => {
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
        el.chalColor1Picker.value = e.target.value;
      }
      syncGradientPreview();
    });

    el.chalColor2Picker.addEventListener('input', (e) => {
      el.chalColor2.value = e.target.value;
      syncGradientPreview();
    });
    el.chalColor2.addEventListener('input', (e) => {
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(e.target.value)) {
        el.chalColor2Picker.value = e.target.value;
      }
      syncGradientPreview();
    });

    el.chalTitle.addEventListener('input', syncGradientPreview);

    el.challengesGrid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit-chal"]');
      const deleteBtn = e.target.closest('[data-action="delete-chal"]');

      if (editBtn) {
        openEditChallengeModal(editBtn.dataset.id);
      } else if (deleteBtn) {
        openDeleteChallengeModal(deleteBtn.dataset.id, deleteBtn.dataset.title);
      }
    });

    el.challengeForm.addEventListener('submit', handleSaveChallenge);
    el.closeChallengeModalBtn.addEventListener('click', () => el.challengeModal.classList.add('hidden'));
    el.cancelChallengeModalBtn.addEventListener('click', () => el.challengeModal.classList.add('hidden'));

    el.closeDeleteChalModalBtn.addEventListener('click', () => el.deleteChallengeModal.classList.add('hidden'));
    el.cancelDeleteChalBtn.addEventListener('click', () => el.deleteChallengeModal.classList.add('hidden'));
    el.confirmDeleteChalBtn.addEventListener('click', handleConfirmDeleteChallenge);

    // Mongo Telemetry Refresh
    if (el.refreshMongoBtn) {
      el.refreshMongoBtn.addEventListener('click', () => {
        showToast('Refreshing Mongo telemetry...', 'info');
        fetchMongoTelemetry();
      });
    }

    // Options Events
    el.runDiagnosticBtn.addEventListener('click', runDiagnostic);

    // Rooms & Vivox Events
    if (el.adminCreateRoomForm) el.adminCreateRoomForm.addEventListener('submit', handleAdminCreateRoom);
    if (el.adminVivoxTokenForm) el.adminVivoxTokenForm.addEventListener('submit', handleGenerateVivoxToken);
    if (el.copyVivoxTokenBtn) el.copyVivoxTokenBtn.addEventListener('click', copyVivoxToken);
    if (el.refreshRoomsBtn) el.refreshRoomsBtn.addEventListener('click', fetchRooms);

    if (el.roomsTableBody) {
      el.roomsTableBody.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('[data-action="view-room"]');
        const deleteBtn = e.target.closest('[data-action="end-room"]');

        if (viewBtn) {
          openViewJsonModal(null, JSON.parse(decodeURIComponent(viewBtn.dataset.json)));
        } else if (deleteBtn) {
          handleEndRoom(deleteBtn.dataset.id);
        }
      });
    }

    async function handleClearAllCache(e) {
      if (e) e.preventDefault();

      if (!confirm('Are you sure you want to clear device cache memory & local sessions across ALL user devices globally?')) {
        return;
      }

      const btn1 = document.getElementById('clearAllCacheBtn');
      const btn2 = document.getElementById('globalClearCacheBtn');
      const btn3 = document.getElementById('usersClearCacheBtn');
      const btns = [btn1, btn2, btn3].filter(Boolean);

      btns.forEach(b => { b.disabled = true; });

      showToast('Clearing device cache memory across all devices...', 'info');
      const { ok, data } = await apiRequest('/api/admin/clear-all-cache', 'POST');

      btns.forEach(b => { b.disabled = false; });

      if (ok) {
        showToast('All device & system cache memory cleared successfully across all users! 🧹', 'success');
        try {
          if ('caches' in window) {
            caches.keys().then((names) => {
              names.forEach((name) => caches.delete(name));
            });
          }
        } catch (err) {}
        const statusEl = document.getElementById('cacheClearStatusText');
        if (statusEl) {
          const nowStr = new Date().toLocaleTimeString();
          statusEl.innerHTML = `<i class="fa-regular fa-clock"></i> Last cleared: ${nowStr}`;
        }
      } else {
        showToast((data && data.error) || 'Failed to clear cache memory', 'error');
      }
    }
    window.handleClearAllCache = handleClearAllCache;

    // Document-level Event Delegation for Clear Cache Buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#clearAllCacheBtn, #globalClearCacheBtn, #usersClearCacheBtn, .btn-clear-cache');
      if (btn) {
        handleClearAllCache(e);
      }
    });

    if (el.saveImgbbKeyBtn) el.saveImgbbKeyBtn.addEventListener('click', saveServerImgbbKey);

    if (el.profilePicFile) {
      el.profilePicFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) displayFilePreview(file, 'Selected file');
      });
    }

    // Drag and Drop Zone Events
    if (el.dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.dropZone.classList.add('drag-over');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.dropZone.classList.remove('drag-over');
        }, false);
      });

      el.dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            displayFilePreview(file, 'Dropped image');
            showToast('Image file dropped!', 'info');
          } else {
            showToast('Please drop an image file (PNG, JPG, WEBP, GIF).', 'error');
          }
        }
      });
    }

    // Global Clipboard Paste Event (Ctrl + V)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            displayFilePreview(blob, 'Pasted from clipboard');
            showToast('Image pasted from clipboard!', 'success');
            if (state.activeTab !== 'pictures') {
              switchTab('pictures');
            }
          }
          break;
        }
      }
    });

    if (el.imgbbUploadForm) el.imgbbUploadForm.addEventListener('submit', handleImgbbUpload);
    if (el.addDirectUrlForm) el.addDirectUrlForm.addEventListener('submit', handleAddDirectUrl);
    if (el.refreshPicturesBtn) el.refreshPicturesBtn.addEventListener('click', fetchProfilePictures);

    if (el.picturesGalleryGrid) {
      el.picturesGalleryGrid.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-action="delete-picture"]');
        if (delBtn) {
          handleDeletePicture(delBtn.dataset.url);
        }
      });
    }
  }

  // ==================== PROFILE PICTURES MANAGEMENT ====================

  async function fetchServerImgbbKey() {
    const { ok, data } = await apiRequest('/api/admin/imgbb-key');
    if (ok) {
      if (data.apiKey && el.imgbbApiKey) {
        el.imgbbApiKey.value = data.apiKey;
      }
      if (el.imgbbKeyStatusTag) {
        if (data.hasKey) {
          el.imgbbKeyStatusTag.textContent = 'Saved on Server (.env)';
          el.imgbbKeyStatusTag.className = 'badge-pill green';
        } else {
          el.imgbbKeyStatusTag.textContent = 'Key Not Set';
          el.imgbbKeyStatusTag.className = 'badge-pill amber';
        }
      }
    }
  }

  async function saveServerImgbbKey() {
    const apiKey = el.imgbbApiKey.value.trim();
    if (!apiKey) {
      showToast('Please enter an ImgBB API key to save.', 'error');
      return;
    }

    showToast('Saving API key to server .env...', 'info');
    const { ok, data } = await apiRequest('/api/admin/imgbb-key', 'POST', { apiKey });
    if (ok) {
      showToast('ImgBB API key saved to server .env file!', 'success');
      localStorage.setItem('imgbb_v2_api_key', apiKey);
      fetchServerImgbbKey();
    } else {
      showToast(data.error || 'Failed to save ImgBB API key', 'error');
    }
  }

  function displayFilePreview(file, sourceLabel = 'Selected image') {
    if (!file || !el.imagePreview || !el.imagePreviewBox) return;

    state.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      el.imagePreview.src = e.target.result;
      if (el.previewInfoTag) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        el.previewInfoTag.textContent = `✓ ${sourceLabel}: ${file.name || 'image'} (${sizeMB} MB)`;
      }
      el.imagePreviewBox.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  async function fetchProfilePictures() {
    fetchServerImgbbKey();
    if (!el.picturesGalleryGrid) return;
    el.picturesGalleryGrid.innerHTML = `
      <div class="text-center py-4 full-width">
        <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i>
        <p class="mt-2 text-sub">Loading profile pictures...</p>
      </div>
    `;

    const { ok, data } = await apiRequest('/api/admin/profile-pictures');
    if (!ok) {
      el.picturesGalleryGrid.innerHTML = `
        <div class="text-center py-4 full-width text-danger">
          <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
          <p class="mt-2">${data.error || 'Failed to load profile pictures'}</p>
        </div>
      `;
      return;
    }

    renderPicturesGallery(data.pictures || []);
  }

  function renderPicturesGallery(pictures) {
    if (el.statTotalPictures) el.statTotalPictures.textContent = pictures.length.toLocaleString();
    if (el.galleryCount) el.galleryCount.textContent = pictures.length.toLocaleString();

    if (pictures.length === 0) {
      el.picturesGalleryGrid.innerHTML = `
        <div class="text-center py-4 full-width">
          <i class="fa-solid fa-image fa-3x" style="color: var(--text-dim);"></i>
          <p class="mt-2 text-sub">No profile pictures uploaded yet. Drag & drop an image, paste from clipboard, or add a direct URL!</p>
        </div>
      `;
      return;
    }

    let html = '';
    pictures.forEach((url, idx) => {
      const encodedUrl = encodeURIComponent(url);
      html += `
        <div class="picture-card">
          <div class="picture-thumb">
            <img src="${escapeHtml(url)}" alt="Profile picture ${idx + 1}" onerror="this.src='https://via.placeholder.com/200?text=Image+Error'">
          </div>
          <div class="picture-footer">
            <div class="picture-url-box" title="${escapeHtml(url)}">
              <span class="picture-url-text">${escapeHtml(url)}</span>
              <button type="button" class="btn-icon text-cyan" title="Copy URL" onclick="navigator.clipboard.writeText('${escapeHtml(url)}'); showToast('Image URL copied!', 'info');">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm btn-block" data-action="delete-picture" data-url="${encodedUrl}">
              <i class="fa-solid fa-trash"></i> Remove Image
            </button>
          </div>
        </div>
      `;
    });

    el.picturesGalleryGrid.innerHTML = html;
  }

  async function handleImgbbUpload(e) {
    e.preventDefault();
    const file = state.selectedImageFile || (el.profilePicFile ? el.profilePicFile.files[0] : null);
    const apiKey = el.imgbbApiKey ? el.imgbbApiKey.value.trim() : '';

    if (!file) {
      showToast('Please select, drop, or paste an image file to upload.', 'error');
      return;
    }

    const originalBtnHtml = el.uploadImgbbBtn.innerHTML;
    el.uploadImgbbBtn.disabled = true;
    el.uploadImgbbBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading to ImgBB...';

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        const { ok, data } = await apiRequest('/api/admin/profile-pictures/upload-imgbb', 'POST', {
          image: base64Data,
          apiKey: apiKey
        });

        el.uploadImgbbBtn.disabled = false;
        el.uploadImgbbBtn.innerHTML = originalBtnHtml;

        if (ok) {
          showToast('Image uploaded to ImgBB and saved!', 'success');
          state.selectedImageFile = null;
          if (el.profilePicFile) el.profilePicFile.value = '';
          if (el.imagePreviewBox) el.imagePreviewBox.classList.add('hidden');
          fetchProfilePictures();
        } else {
          showToast(data.error || 'ImgBB upload failed', 'error');
        }
      };
      reader.onerror = () => {
        el.uploadImgbbBtn.disabled = false;
        el.uploadImgbbBtn.innerHTML = originalBtnHtml;
        showToast('Failed to read selected file', 'error');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      el.uploadImgbbBtn.disabled = false;
      el.uploadImgbbBtn.innerHTML = originalBtnHtml;
      showToast(err.message || 'Upload error', 'error');
    }
  }

  async function handleAddDirectUrl(e) {
    e.preventDefault();
    const url = el.directImageUrl.value.trim();
    if (!url) {
      showToast('Please enter a valid image URL.', 'error');
      return;
    }

    const { ok, data } = await apiRequest('/api/admin/profile-pictures', 'POST', { url });
    if (ok) {
      showToast('Direct image URL saved successfully!', 'success');
      el.directImageUrl.value = '';
      fetchProfilePictures();
    } else {
      showToast(data.error || 'Failed to add image URL', 'error');
    }
  }

  async function handleDeletePicture(encodedUrl) {
    const url = decodeURIComponent(encodedUrl);
    if (!confirm('Are you sure you want to remove this profile picture URL from profilePictures.json?')) {
      return;
    }

    const { ok, data } = await apiRequest('/api/admin/profile-pictures', 'DELETE', { url });
    if (ok) {
      showToast('Profile picture removed successfully', 'success');
      fetchProfilePictures();
    } else {
      showToast(data.error || 'Failed to delete profile picture', 'error');
    }
  }

  function init() {
    startClock();
    initEvents();
    checkAuth();

    // Auto refresh live Mongo Telemetry every 5 seconds
    setInterval(() => {
      if (state.token && state.activeTab === 'dashboard') {
        fetchMongoTelemetry();
      }
    }, 5000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
