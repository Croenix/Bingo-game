import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../models/challenge_model.dart';
import '../models/room_model.dart';
import '../models/user_model.dart';
import '../theme/app_theme.dart';
import '../widgets/create_room_dialog.dart';
import '../widgets/join_room_dialog.dart';
import '../widgets/profile_dialog.dart';

class LobbyScreen extends StatefulWidget {
  const LobbyScreen({super.key});

  @override
  State<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends State<LobbyScreen> with TickerProviderStateMixin {
  late PageController _featuredPageController;
  int _currentFeaturedPage = 0;
  Timer? _featuredAutoScrollTimer;

  late PageController _questsPageController;
  int _currentQuestPage = 0;
  Timer? _questsAutoScrollTimer;

  String _selectedGameFilter = 'all';

  final List<Map<String, dynamic>> _featuredGames = [
    {
      'gameType': 'bingo',
      'title': 'Bingo Arena Classic',
      'category': '🎲 BINGO ARENA',
      'tag': '🔥 #1 POPULAR',
      'livePlayers': '1.4k Online',
      'tagline': 'Real-time 5x5 Number grid racing! Mark numbers and shout BINGO.',
      'specs': '⏱️ 3-5 Min  •  👥 2-10P',
      'gradient': AppColors.bingoGradient,
      'accentColor': AppColors.primary,
      'glowColor': const Color(0xFF6366F1),
      'iconEmoji': '🎲',
      'coverImage': 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
    },
    {
      'gameType': 'sos',
      'title': 'SOS Grid Master',
      'category': '🔤 SOS STRATEGY',
      'tag': '⚡ 1v1 DUEL',
      'livePlayers': '850 in Battles',
      'tagline': 'Tactical turn-based grid battle! Chain explosive S-O-S combos.',
      'specs': '⏱️ 2-4 Min  •  👥 2P',
      'gradient': AppColors.sosGradient,
      'accentColor': AppColors.accent,
      'glowColor': const Color(0xFF06B6D4),
      'iconEmoji': '🧠',
      'coverImage': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    },
    {
      'gameType': 'liars_bar',
      'title': 'Liar\'s Bar Saloon',
      'category': '🍷 LIAR\'S BAR',
      'tag': '💀 HIGH STAKES',
      'livePlayers': '1.1k in Saloon',
      'tagline': 'Psychological bluffing & high stakes! Catch liars & survive Russian Roulette.',
      'specs': '⏱️ 5-8 Min  •  👥 2-4P',
      'gradient': AppColors.liarsGradient,
      'accentColor': AppColors.danger,
      'glowColor': const Color(0xFFDC2626),
      'iconEmoji': '🃏',
      'coverImage': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800&auto=format&fit=crop&q=80',
    },
  ];

  final List<ChallengeModel> _fallbackQuests = [
    ChallengeModel(
      id: 'quest-bingo-1',
      title: 'Bingo Speedrun Champion',
      description: 'Clear 5 BINGO lines in under 3 minutes to earn bonus coins.',
      category: 'Bingo Classic',
      entryCoin: 0,
      rewardCoin: 500,
      gradientStart: '#6366F1',
      gradientEnd: '#8B5CF6',
      icon: '🏆',
      coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    ),
    ChallengeModel(
      id: 'quest-sos-2',
      title: 'SOS Tactical Grandmaster',
      description: 'Form 4+ SOS combos in a single match to claim bonus gems.',
      category: 'SOS Strategy',
      entryCoin: 50,
      rewardCoin: 850,
      gradientStart: '#0EA5E9',
      gradientEnd: '#10B981',
      icon: '🧠',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    ),
    ChallengeModel(
      id: 'quest-liars-3',
      title: 'Saloon Bluff King',
      description: 'Catch 2 liars & survive Russian Roulette with 0 deaths.',
      category: 'Liar\'s Bar',
      entryCoin: 100,
      rewardCoin: 1500,
      gradientStart: '#DC2626',
      gradientEnd: '#F43F5E',
      icon: '👑',
      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _featuredPageController = PageController(viewportFraction: 0.90);
    _questsPageController = PageController(viewportFraction: 0.88);

    _startFeaturedAutoScroll();
    _startQuestsAutoScroll();
  }

  void _startFeaturedAutoScroll() {
    _featuredAutoScrollTimer?.cancel();
    _featuredAutoScrollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_featuredPageController.hasClients) {
        final nextPage = (_currentFeaturedPage + 1) % _featuredGames.length;
        _featuredPageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 550),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  void _startQuestsAutoScroll() {
    _questsAutoScrollTimer?.cancel();
    _questsAutoScrollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_questsPageController.hasClients) {
        final count = _getEffectiveQuests().length;
        if (count > 1) {
          final nextPage = (_currentQuestPage + 1) % count;
          _questsPageController.animateToPage(
            nextPage,
            duration: const Duration(milliseconds: 550),
            curve: Curves.easeInOutCubic,
          );
        }
      }
    });
  }

  List<ChallengeModel> _getEffectiveQuests() {
    final provider = Provider.of<GameProvider>(context, listen: false);
    return provider.challenges.isNotEmpty ? provider.challenges : _fallbackQuests;
  }

  @override
  void dispose() {
    _featuredAutoScrollTimer?.cancel();
    _questsAutoScrollTimer?.cancel();
    _featuredPageController.dispose();
    _questsPageController.dispose();
    super.dispose();
  }

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
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.surfaceElevated,
          onRefresh: () async {
            await Future.wait([
              provider.fetchChallenges(),
              provider.fetchPublicRooms(),
            ]);
          },
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // 1. Sleek Modern Gaming Header HUD
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                  child: _buildTopPlayerHud(user),
                ),
              ),

              // 2. Quick Action Dock (3 Modern Glass Tiles)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _buildQuickActionDock(),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 22)),

              // 3. Featured Games Section Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _buildSectionHeader(
                    title: 'FEATURED MODES',
                    badge: 'LIVE MATCHES',
                    badgeColor: AppColors.primary,
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // 4. Featured Games Carousel Deck
              SliverToBoxAdapter(
                child: _buildFeaturedGamesDeck(),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 10)),

              // 5. Featured Carousel Page Indicators
              SliverToBoxAdapter(
                child: _buildPageIndicators(
                  count: _featuredGames.length,
                  activeIndex: _currentFeaturedPage,
                  onTap: (idx) => _featuredPageController.animateToPage(
                    idx,
                    duration: const Duration(milliseconds: 350),
                    curve: Curves.easeInOut,
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              // 6. Daily Quests & Bounties Section Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _buildSectionHeader(
                    title: 'DAILY BOUNTIES',
                    badge: '${_getEffectiveQuests().length} AVAILABLE',
                    badgeColor: AppColors.gold,
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // 7. Daily Quests Horizontal Stream
              SliverToBoxAdapter(
                child: _buildQuestsStream(),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              // 8. Public Lobbies Header & Filter Tabs
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildSectionHeader(
                            title: 'ACTIVE LOBBIES',
                            badge: '${provider.publicRooms.length} ROOMS',
                            badgeColor: AppColors.accent,
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 20, color: AppColors.accent),
                            onPressed: () => provider.fetchPublicRooms(),
                            visualDensity: VisualDensity.compact,
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _buildGameFilterTabs(),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 12)),

              // 9. Public Rooms List
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 60),
                sliver: _buildPublicRoomsList(provider),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Top Player Dashboard HUD ---
  Widget _buildTopPlayerHud(UserModel? user) {
    final int userLevel = user != null ? (1 + (user.coins / 500).floor()).clamp(1, 99) : 1;
    final String initialChar = (user?.name.isNotEmpty == true) ? user!.name[0].toUpperCase() : '👾';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // User Profile Pill (Tap to open passport)
        GestureDetector(
          onTap: _openProfile,
          child: Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar with Glowing Ring
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppColors.primaryGradient,
                    boxShadow: AppColors.primaryGlow(opacity: 0.4, blur: 8),
                  ),
                  child: ClipOval(
                    child: user?.profileImageUrl != null && user!.profileImageUrl.isNotEmpty
                        ? (user.profileImageUrl.contains('.svg')
                            ? SvgPicture.network(
                                user.profileImageUrl,
                                fit: BoxFit.cover,
                                placeholderBuilder: (_) => const Icon(Icons.person, size: 18, color: Colors.white),
                              )
                            : Image.network(
                                user.profileImageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Center(
                                  child: Text(
                                    initialChar,
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                                  ),
                                ),
                              ))
                        : Center(
                            child: Text(
                              initialChar,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 8),

                // Name & Level
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      user?.name ?? 'Player',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: Colors.white,
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'LVL $userLevel',
                            style: GoogleFonts.outfit(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Online',
                          style: GoogleFonts.inter(fontSize: 10, color: AppColors.emeraldLight, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                const Icon(Icons.keyboard_arrow_right_rounded, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 4),
              ],
            ),
          ),
        ),

        // Wallets (Coins & Gems)
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildWalletChip(
              icon: '🪙',
              amount: '${user?.coins ?? 0}',
              color: AppColors.gold,
            ),
            const SizedBox(width: 6),
            _buildWalletChip(
              icon: '💎',
              amount: '${user?.gems ?? 0}',
              color: AppColors.accent,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWalletChip({required String icon, required String amount, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(icon, style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 4),
          Text(
            amount,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  // --- Quick Action Dock (3 Glass Tiles) ---
  Widget _buildQuickActionDock() {
    return Row(
      children: [
        // 1. Host Game
        Expanded(
          child: _buildActionTile(
            title: 'Host Arena',
            subtitle: 'Create Room',
            icon: Icons.add_circle_rounded,
            gradient: AppColors.primaryGradient,
            glowColor: AppColors.primary,
            onTap: () => _openCreateRoom('bingo'),
          ),
        ),
        const SizedBox(width: 8),

        // 2. Join Code
        Expanded(
          child: _buildActionTile(
            title: 'Join Code',
            subtitle: 'Enter PIN',
            icon: Icons.pin_rounded,
            gradient: AppColors.cyberGradient,
            glowColor: AppColors.accent,
            onTap: () => _openJoinRoom(),
          ),
        ),
        const SizedBox(width: 8),

        // 3. Quick Play
        Expanded(
          child: _buildActionTile(
            title: 'Quick Play',
            subtitle: 'Auto Match',
            icon: Icons.bolt_rounded,
            gradient: AppColors.goldGradient,
            glowColor: AppColors.gold,
            onTap: () => _openCreateRoom('bingo'),
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required LinearGradient gradient,
    required Color glowColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.cardGlass.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          boxShadow: [
            BoxShadow(
              color: glowColor.withValues(alpha: 0.12),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: gradient,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: glowColor.withValues(alpha: 0.4),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 16),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.outfit(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w500,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Featured Games Deck ---
  Widget _buildFeaturedGamesDeck() {
    return SizedBox(
      height: 250,
      child: PageView.builder(
        controller: _featuredPageController,
        physics: const BouncingScrollPhysics(),
        onPageChanged: (idx) => setState(() => _currentFeaturedPage = idx),
        itemCount: _featuredGames.length,
        itemBuilder: (context, index) {
          final game = _featuredGames[index];
          final isCurrent = index == _currentFeaturedPage;

          return AnimatedScale(
            scale: isCurrent ? 1.0 : 0.94,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            child: _buildFeaturedGameCard(game, isCurrent),
          );
        },
      ),
    );
  }

  Widget _buildFeaturedGameCard(Map<String, dynamic> game, bool isCurrent) {
    final String title = game['title'];
    final String category = game['category'];
    final String tag = game['tag'];
    final String livePlayers = game['livePlayers'];
    final String tagline = game['tagline'];
    final LinearGradient gradient = game['gradient'];
    final Color accentColor = game['accentColor'];
    final Color glowColor = game['glowColor'];
    final String iconEmoji = game['iconEmoji'];
    final String gameType = game['gameType'];
    final String coverImage = game['coverImage'] ?? '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCurrent ? accentColor.withValues(alpha: 0.5) : Colors.white.withValues(alpha: 0.1),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: isCurrent ? 0.35 : 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
          const BoxShadow(
            color: Color(0x70000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // 1. Poster Artwork Backdrop
            Positioned.fill(
              child: coverImage.isNotEmpty
                  ? Image.network(
                      coverImage,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _buildBackdropFallback(accentColor, iconEmoji),
                    )
                  : _buildBackdropFallback(accentColor, iconEmoji),
            ),

            // 2. Obsidian Gradient Scrim
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Color(0x55080C15),
                      Color(0x99080C15),
                      Color(0xF50B111E),
                    ],
                    stops: [0.0, 0.45, 0.9],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // 3. Specular Sheen
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.white.withValues(alpha: 0.16),
                        Colors.white.withValues(alpha: 0.03),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.3, 0.65],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                ),
              ),
            ),

            // 4. Card Content
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top Row (Category Badge + Live Badge)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Category
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated.withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                        ),
                        child: Text(
                          category,
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                            letterSpacing: 0.5,
                            color: Colors.white,
                          ),
                        ),
                      ),

                      // Live Players
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 5,
                              height: 5,
                              decoration: const BoxDecoration(
                                color: AppColors.emerald,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              livePlayers,
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: AppColors.emeraldLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Bottom Info & Action
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.outfit(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: accentColor.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              tag,
                              style: GoogleFonts.outfit(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: accentColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        tagline,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Buttons
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Container(
                              height: 38,
                              decoration: BoxDecoration(
                                gradient: gradient,
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: accentColor.withValues(alpha: 0.4),
                                    blurRadius: 8,
                                  ),
                                ],
                              ),
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: EdgeInsets.zero,
                                ),
                                onPressed: () => _openCreateRoom(gameType),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'PLAY NOW',
                                      style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                    ),
                                    const SizedBox(width: 4),
                                    const Text('⚡', style: TextStyle(fontSize: 11)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            flex: 2,
                            child: Container(
                              height: 38,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                              ),
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side: BorderSide.none,
                                  padding: EdgeInsets.zero,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: () => _openCreateRoom(gameType),
                                child: Text(
                                  'Host',
                                  style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Daily Quests Stream ---
  Widget _buildQuestsStream() {
    final quests = _getEffectiveQuests();

    return SizedBox(
      height: 148,
      child: PageView.builder(
        controller: _questsPageController,
        physics: const BouncingScrollPhysics(),
        onPageChanged: (idx) => setState(() => _currentQuestPage = idx),
        itemCount: quests.length,
        itemBuilder: (context, idx) {
          final quest = quests[idx];
          return _buildCompactQuestCard(quest);
        },
      ),
    );
  }

  Widget _buildCompactQuestCard(ChallengeModel ch) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardGlass.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        boxShadow: AppColors.softCardShadow,
      ),
      child: Row(
        children: [
          // Icon Avatar
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: AppColors.goldGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppColors.gold.withValues(alpha: 0.3),
                  blurRadius: 8,
                ),
              ],
            ),
            alignment: Alignment.center,
            child: Text(ch.icon, style: const TextStyle(fontSize: 22)),
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        ch.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '+${ch.rewardCoin} 🪙',
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: AppColors.gold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  ch.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),

                // Accept CTA
                GestureDetector(
                  onTap: () => _openCreateRoom('bingo', ch.id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'ACCEPT BOUNTY',
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_forward_rounded, size: 10, color: Colors.white),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Game Filter Tabs ---
  Widget _buildGameFilterTabs() {
    final filters = [
      {'id': 'all', 'label': 'All Games'},
      {'id': 'bingo', 'label': '🎲 Bingo'},
      {'id': 'sos', 'label': '🧠 SOS'},
      {'id': 'liars_bar', 'label': '🍷 Liar\'s Bar'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: filters.map((f) {
          final isSelected = _selectedGameFilter == f['id'];
          return GestureDetector(
            onTap: () => setState(() => _selectedGameFilter = f['id']!),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: isSelected ? AppColors.primaryGradient : null,
                color: isSelected ? null : AppColors.surfaceElevated.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primaryLight : Colors.white.withValues(alpha: 0.08),
                ),
              ),
              child: Text(
                f['label']!,
                style: GoogleFonts.outfit(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- Public Rooms List ---
  Widget _buildPublicRoomsList(GameProvider provider) {
    final rooms = provider.publicRooms.where((r) {
      if (_selectedGameFilter == 'all') return true;
      return r.gameType == _selectedGameFilter;
    }).toList();

    if (rooms.isEmpty) {
      return SliverToBoxAdapter(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              const Text('🎮', style: TextStyle(fontSize: 32)),
              const SizedBox(height: 8),
              Text(
                'No public rooms active',
                style: GoogleFonts.outfit(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Create a room to start playing with friends!',
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, idx) {
          final room = rooms[idx];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _buildPublicRoomTile(room),
          );
        },
        childCount: rooms.length,
      ),
    );
  }

  Widget _buildPublicRoomTile(RoomModel room) {
    final isFull = room.players.length >= room.capacity;
    final isPlaying = room.status == 'playing';

    Color gameColor = AppColors.primary;
    if (room.gameType == 'sos') gameColor = AppColors.accent;
    if (room.gameType == 'liars_bar') gameColor = AppColors.danger;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardGlass.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        boxShadow: AppColors.softCardShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: gameColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: gameColor.withValues(alpha: 0.35)),
            ),
            alignment: Alignment.center,
            child: Text(
              room.gameType == 'bingo' ? '🎲' : (room.gameType == 'sos' ? '🧠' : '🃏'),
              style: const TextStyle(fontSize: 18),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        room.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    if (room.hasPassword) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.lock_rounded, size: 12, color: AppColors.gold),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      'Host: ${room.creatorName}',
                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: isPlaying ? AppColors.warning.withValues(alpha: 0.15) : AppColors.emerald.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        isPlaying ? 'PLAYING' : 'WAITING',
                        style: GoogleFonts.outfit(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          color: isPlaying ? AppColors.warning : AppColors.emerald,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${room.players.length}/${room.capacity} Players',
                style: GoogleFonts.outfit(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: isFull ? AppColors.danger : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 4),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isFull || isPlaying ? AppColors.surfaceElevated : AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  minimumSize: const Size(56, 28),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: (isFull || isPlaying) ? null : () => _openJoinRoom(room.roomId),
                child: Text(
                  'JOIN',
                  style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w900),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Shared Section Header Widget ---
  Widget _buildSectionHeader({
    required String title,
    required String badge,
    required Color badgeColor,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 3.5,
          height: 16,
          decoration: BoxDecoration(
            color: badgeColor,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 15,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.5,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: badgeColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
          ),
          child: Text(
            badge,
            style: GoogleFonts.outfit(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: badgeColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPageIndicators({
    required int count,
    required int activeIndex,
    required Function(int) onTap,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (index) {
        final isSelected = index == activeIndex;
        return GestureDetector(
          onTap: () => onTap(index),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 3),
            width: isSelected ? 18 : 6,
            height: 5,
            decoration: BoxDecoration(
              gradient: isSelected ? AppColors.primaryGradient : null,
              color: isSelected ? null : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildBackdropFallback(Color accentColor, String emoji) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            accentColor.withValues(alpha: 0.4),
            AppColors.surfaceElevated,
            AppColors.background,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          emoji,
          style: TextStyle(fontSize: 80, color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
    );
  }
}
