import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../models/challenge_model.dart';
import '../models/room_model.dart';
import '../theme/app_theme.dart';
import '../widgets/create_room_dialog.dart';
import '../widgets/join_room_dialog.dart';
import '../widgets/profile_dialog.dart';

class LobbyScreen extends StatefulWidget {
  const LobbyScreen({super.key});

  @override
  State<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends State<LobbyScreen> {
  String _selectedCategory = 'all';

  void _openCreateRoom([String gameType = 'bingo', String? challengeId]) {
    showDialog(
      context: context,
      builder: (_) => CreateRoomDialog(
        initialGameType: gameType,
        initialChallengeId: challengeId,
      ),
    );
  }

  void _openJoinRoom([String? code]) {
    showDialog(
      context: context,
      builder: (_) => JoinRoomDialog(initialRoomCode: code),
    );
  }

  void _openProfile() {
    showDialog(context: context, builder: (_) => const ProfileDialog());
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);
    final user = provider.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 2,
        titleSpacing: 12,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text('🎮', style: TextStyle(fontSize: 16)),
            ),
            const SizedBox(width: 6),
            const Flexible(
              child: Text(
                'ARENA',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
        actions: [
          // Currency Pills
          if (user != null) ...[
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: 0.4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🪙', style: TextStyle(fontSize: 11)),
                  const SizedBox(width: 3),
                  Text(
                    '${user.coins}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.gold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.emerald.withValues(alpha: 0.4),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('💎', style: TextStyle(fontSize: 11)),
                  const SizedBox(width: 3),
                  Text(
                    '${user.gems}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.emerald,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 2),
          ],

          // Sound Toggle Button
          IconButton(
            padding: const EdgeInsets.all(8),
            constraints: const BoxConstraints(),
            icon: Icon(
              provider.soundEnabled ? Icons.volume_up : Icons.volume_off,
              size: 20,
              color: provider.soundEnabled
                  ? AppColors.accent
                  : AppColors.textMuted,
            ),
            onPressed: () => provider.toggleSound(),
          ),

          // Avatar / Profile
          if (user != null)
            GestureDetector(
              onTap: _openProfile,
              child: Padding(
                padding: const EdgeInsets.only(right: 14, left: 4),
                child: CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.primary,
                  child: ClipOval(
                    child: user.profileImageUrl.contains('.svg')
                        ? SvgPicture.network(
                            user.profileImageUrl,
                            width: 32,
                            height: 32,
                            fit: BoxFit.cover,
                            placeholderBuilder: (_) => const Icon(
                              Icons.person,
                              size: 18,
                              color: Colors.white,
                            ),
                          )
                        : Image.network(
                            user.profileImageUrl,
                            width: 32,
                            height: 32,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.person,
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await provider.fetchChallenges();
          await provider.fetchPublicRooms();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Welcome Banner
              _buildHeroBanner(),
              const SizedBox(height: 24),

              // Game Modes Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '🎯 Choose Game Mode',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.purple.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.purple.withValues(alpha: 0.5),
                      ),
                    ),
                    child: const Text(
                      '3 Live Games',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.purple,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Category Filter Tabs
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _categoryFilterPill('all', '🌟 All Modes'),
                    const SizedBox(width: 8),
                    _categoryFilterPill('numbers', '🎲 Numbers & Board'),
                    const SizedBox(width: 8),
                    _categoryFilterPill('strategy', '🧠 Mind & Strategy'),
                    const SizedBox(width: 8),
                    _categoryFilterPill('party', '🍷 Party & Bluffing'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Game Cards Grid / List
              if (_selectedCategory == 'all' || _selectedCategory == 'numbers')
                _buildGameLaunchCard(
                  title: 'Bingo Arena',
                  type: '🎲 BINGO CLASSIC',
                  tag: '🔥 POPULAR',
                  desc: '5x5 Number grid racing! Mark numbers as drawn and complete B-I-N-G-O lines first.',
                  specs: '⏱️ 3-5 Min  •  👥 2-10 Players',
                  chips: ['🎲 5x5 Grid', '⚡ Line Racing', '🏆 Auto-Draw'],
                  gradient: AppColors.bingoGradient,
                  onQuickPlay: () => _openCreateRoom('bingo'),
                  onCreateRoom: () => _openCreateRoom('bingo'),
                ),

              if (_selectedCategory == 'all' || _selectedCategory == 'strategy')
                _buildGameLaunchCard(
                  title: 'SOS Grid Master',
                  type: '🔤 SOS STRATEGY',
                  tag: '⚡ FAST',
                  desc: 'Turn-based tactical letter placement! Place \'S\' or \'O\' to outsmart opponent and form SOS combos.',
                  specs: '⏱️ 2-4 Min  •  👥 2-3 Players',
                  chips: ['🔤 3x3 / 5x5 Grid', '⚔️ 1v1 Battle', '💥 Combos'],
                  gradient: AppColors.sosGradient,
                  onQuickPlay: () => _openCreateRoom('sos'),
                  onCreateRoom: () => _openCreateRoom('sos'),
                ),

              if (_selectedCategory == 'all' || _selectedCategory == 'party')
                _buildGameLaunchCard(
                  title: 'Liar\'s Bar',
                  type: '🍷 LIAR\'S BAR',
                  tag: '💀 HIGH STAKES',
                  desc: 'High-stakes deception & bluffing! Play cards face-down, challenge liars, and survive Russian Roulette.',
                  specs: '⏱️ 5-8 Min  •  👥 2-4 Players',
                  chips: ['🃏 Bluffing', '🎭 Deception', '🔫 Revolver'],
                  gradient: AppColors.liarsGradient,
                  onQuickPlay: () => _openCreateRoom('liars_bar'),
                  onCreateRoom: () => _openCreateRoom('liars_bar'),
                ),

              const SizedBox(height: 24),

              // Featured Challenges Section
              _buildChallengesSection(provider),
              const SizedBox(height: 24),

              // Active Public Rooms Section
              _buildPublicRoomsSection(provider),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroBanner() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.35),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Welcome to Game Arena! 🎮',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Play real-time multiplayer Bingo, SOS Strategy, and Liar\'s Bar with friends!',
            style: TextStyle(fontSize: 13, color: Colors.white70, height: 1.4),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.primaryDark,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _openCreateRoom('bingo'),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text(
                    'Create Room',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white70, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _openJoinRoom(),
                  icon: const Icon(Icons.vpn_key, size: 16),
                  label: const Text(
                    'Join Code',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _categoryFilterPill(String key, String label) {
    final isSelected = _selectedCategory == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primaryLight : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildGameLaunchCard({
    required String title,
    required String type,
    required String tag,
    required String desc,
    required String specs,
    required List<String> chips,
    required LinearGradient gradient,
    required VoidCallback onQuickPlay,
    required VoidCallback onCreateRoom,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                type,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  color: AppColors.accent,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tag,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.danger,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            desc,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            specs,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            children: chips
                .map(
                  (c) => Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      c,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: onQuickPlay,
                  child: const Text(
                    '⚡ Quick Play',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 16,
                  ),
                ),
                onPressed: onCreateRoom,
                child: const Text(
                  '➕ Room',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChallengesSection(GameProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '🏆 Featured Challenges',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            IconButton(
              icon: const Icon(
                Icons.refresh,
                size: 18,
                color: AppColors.textMuted,
              ),
              onPressed: () => provider.fetchChallenges(),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (provider.challenges.isEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            alignment: Alignment.center,
            child: const Text(
              'No active challenges found',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
        ] else ...[
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.challenges.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final challenge = provider.challenges[index];
              return _challengeCard(challenge);
            },
          ),
        ],
      ],
    );
  }

  Widget _challengeCard(ChallengeModel c) {
    return GestureDetector(
      onTap: () => _openCreateRoom('bingo', c.id),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Text(c.icon, style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Entry: ${c.entryCoin > 0 ? "${c.entryCoin} 🪙" : "Free"}  •  Prize: ${c.rewardCoin} 🪙',
                    style: const TextStyle(
                      color: AppColors.gold,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: () => _openCreateRoom('bingo', c.id),
              child: const Text(
                'Play',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPublicRoomsSection(GameProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Text(
                  '🎮 Active Public Rooms',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${provider.publicRooms.length}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryLight,
                    ),
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(
                Icons.refresh,
                size: 18,
                color: AppColors.textMuted,
              ),
              onPressed: () => provider.fetchPublicRooms(),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (provider.publicRooms.isEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Text('🎲', style: TextStyle(fontSize: 32)),
                const SizedBox(height: 8),
                const Text(
                  'No active public rooms right now',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _openCreateRoom('bingo'),
                  child: const Text(
                    'Create First Room 🚀',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ] else ...[
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: provider.publicRooms.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final room = provider.publicRooms[index];
              return _roomListItem(room);
            },
          ),
        ],
      ],
    );
  }

  Widget _roomListItem(RoomModel room) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              room.gameType == 'sos'
                  ? '🔤'
                  : (room.gameType == 'liars_bar' ? '🍷' : '🎲'),
              style: const TextStyle(fontSize: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      room.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    if (room.hasPassword) ...[
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.lock,
                        size: 12,
                        color: AppColors.textMuted,
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Host: ${room.creatorName}  •  Players: ${room.players.length}/${room.capacity}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => _openJoinRoom(room.roomId),
            child: const Text(
              'Join',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
