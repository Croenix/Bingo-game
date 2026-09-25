import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class LiarsBarView extends StatelessWidget {
  const LiarsBarView({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);
    final isPlaying = provider.currentRoom?.status == 'playing';
    final isAlive = provider.liarsIsAlive;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Table Rank Card
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              gradient: AppColors.liarsGradient,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: AppColors.danger.withValues(alpha: 0.4),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Text('👑', style: TextStyle(fontSize: 26)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CURRENT TABLE RANK',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        provider.liarsTableRank.toUpperCase(),
                        style: GoogleFonts.outfit(
                          fontSize: 19,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Matching ranks, Jokers & Devils are valid cards',
                        style: GoogleFonts.inter(fontSize: 11, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Center Pile Card
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.border),
              boxShadow: AppColors.softCardShadow,
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.style_rounded, size: 16, color: AppColors.gold),
                    const SizedBox(width: 6),
                    Text(
                      'SALOON CENTER PILE',
                      style: GoogleFonts.outfit(
                        color: AppColors.gold,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '${provider.liarsCenterPileCount} Cards Played',
                  style: GoogleFonts.outfit(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (provider.liarsLastPlay != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.history_rounded, size: 14, color: AppColors.accent),
                        const SizedBox(width: 6),
                        Text(
                          'Last: ${provider.liarsLastPlay!['playedBy']?['name'] ?? 'Player'} played ${provider.liarsLastPlay!['count']} card(s)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Pending Russian Roulette trigger warning
                if (provider.liarsPendingRoulette != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.danger, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.danger.withValues(alpha: 0.3),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('🔫', style: TextStyle(fontSize: 18)),
                            const SizedBox(width: 6),
                            Text(
                              'RUSSIAN ROULETTE TRIGGER!',
                              style: GoogleFonts.outfit(
                                color: AppColors.danger,
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${provider.liarsPendingRoulette!['losingUserName'] ?? 'Accused'} was caught bluffing and must pull the trigger!',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.9),
                            height: 1.3,
                          ),
                        ),
                        if (provider.liarsPendingRoulette!['losingUserId'] ==
                            provider.currentUser?.userId) ...[
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.danger,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              onPressed: () => provider.triggerLiarsRoulette(),
                              icon: const Icon(Icons.touch_app_rounded, color: Colors.white),
                              label: Text(
                                'PULL THE TRIGGER 💀',
                                style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Player's Hand
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.border),
              boxShadow: AppColors.softCardShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'YOUR HAND (${provider.liarsMyHand.length} cards)',
                      style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        letterSpacing: 0.5,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Selected: ${provider.liarsSelectedCardIndices.length}/3',
                        style: GoogleFonts.outfit(
                          color: AppColors.gold,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                if (provider.liarsMyHand.isEmpty) ...[
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No cards left in your hand',
                        style: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
                      ),
                    ),
                  ),
                ] else ...[
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: List.generate(provider.liarsMyHand.length, (idx) {
                      final card = provider.liarsMyHand[idx];
                      final isSelected = provider.liarsSelectedCardIndices.contains(idx);

                      return GestureDetector(
                        onTap: () {
                          if (isPlaying && isAlive) {
                            provider.toggleLiarsCardSelection(idx);
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: 72,
                          height: 102,
                          transform: isSelected ? Matrix4.translationValues(0, -6, 0) : Matrix4.identity(),
                          decoration: BoxDecoration(
                            gradient: isSelected ? AppColors.primaryGradient : null,
                            color: isSelected ? null : AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected ? Colors.white : AppColors.border,
                              width: isSelected ? 2.5 : 1.2,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppColors.primary.withValues(alpha: 0.6),
                                      blurRadius: 14,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _cardIcon(card),
                                style: const TextStyle(fontSize: 26),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                card,
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected ? Colors.white : AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ],
                const SizedBox(height: 20),

                // Action Buttons (Play Cards & Call Liar)
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: AppColors.primaryGlow(opacity: 0.35, blur: 10),
                        ),
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: isPlaying &&
                                  isAlive &&
                                  provider.isMyTurn &&
                                  provider.liarsSelectedCardIndices.isNotEmpty
                              ? () => provider.playSelectedLiarsCards()
                              : null,
                          child: Text(
                            'Play (${provider.liarsSelectedCardIndices.length}) Cards 🃏',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.danger,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: isPlaying &&
                                  isAlive &&
                                  provider.liarsLastPlay != null &&
                                  provider.liarsPendingRoulette == null
                              ? () => provider.callLiarsChallenge()
                              : null,
                          child: Text(
                            'Call Liar! 🚨',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 13),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _cardIcon(String card) {
    switch (card.toLowerCase()) {
      case 'king':
        return '👑';
      case 'queen':
        return '👸';
      case 'ace':
        return '🅰️';
      case 'joker':
        return '🃏';
      case 'devil':
        return '😈';
      case 'chaos':
        return '🌀';
      default:
        return '🎴';
    }
  }
}
