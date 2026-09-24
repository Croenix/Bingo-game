import 'package:flutter/material.dart';
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Table Rank Card
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: AppColors.liarsGradient,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: AppColors.danger.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const Text('👑', style: TextStyle(fontSize: 30)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CURRENT TABLE RANK',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: Colors.white70,
                        ),
                      ),
                      Text(
                        provider.liarsTableRank.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      const Text(
                        'Matching rank & Jokers/Devils are valid',
                        style: TextStyle(fontSize: 11, color: Colors.white70),
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
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                const Text(
                  '🃏 SALOON TABLE PILE',
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '${provider.liarsCenterPileCount} Cards Played',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.gold,
                  ),
                ),
                if (provider.liarsLastPlay != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Last: ${provider.liarsLastPlay!['playedBy']?['name'] ?? 'Player'} played ${provider.liarsLastPlay!['count']} card(s)',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],

                // Pending Russian Roulette trigger warning
                if (provider.liarsPendingRoulette != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.danger),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          '🔫 RUSSIAN ROULETTE TRIGGER!',
                          style: TextStyle(
                            color: AppColors.danger,
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${provider.liarsPendingRoulette!['losingUserName'] ?? 'Loser'} must pull the trigger!',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.white70,
                          ),
                        ),
                        if (provider.liarsPendingRoulette!['losingUserId'] ==
                            provider.currentUser?.userId) ...[
                          const SizedBox(height: 10),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.danger,
                            ),
                            onPressed: () => provider.triggerLiarsRoulette(),
                            icon: const Icon(Icons.touch_app),
                            label: const Text('PULL THE TRIGGER 💀'),
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
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'YOUR HAND (${provider.liarsMyHand.length} cards)',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      'Selected: ${provider.liarsSelectedCardIndices.length}/3',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (provider.liarsMyHand.isEmpty) ...[
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text(
                        'No cards in hand',
                        style: TextStyle(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                ] else ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: List.generate(provider.liarsMyHand.length, (idx) {
                      final card = provider.liarsMyHand[idx];
                      final isSelected = provider.liarsSelectedCardIndices
                          .contains(idx);

                      return GestureDetector(
                        onTap: () {
                          if (isPlaying && isAlive) {
                            provider.toggleLiarsCardSelection(idx);
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: 68,
                          height: 96,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.border,
                              width: isSelected ? 2.5 : 1,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppColors.primary.withValues(
                                        alpha: 0.5,
                                      ),
                                      blurRadius: 8,
                                    ),
                                  ]
                                : null,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _cardIcon(card),
                                style: const TextStyle(fontSize: 22),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                card,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ],
                const SizedBox(height: 16),

                // Action Buttons (Play Cards & Call Liar)
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed:
                            isPlaying &&
                                isAlive &&
                                provider.isMyTurn &&
                                provider.liarsSelectedCardIndices.isNotEmpty
                            ? () => provider.playSelectedLiarsCards()
                            : null,
                        child: Text(
                          'Play (${provider.liarsSelectedCardIndices.length}) 🃏',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.danger,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed:
                            isPlaying &&
                                isAlive &&
                                provider.liarsLastPlay != null &&
                                provider.liarsPendingRoulette == null
                            ? () => provider.callLiarsChallenge()
                            : null,
                        child: const Text('Call Liar! 🔍'),
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
