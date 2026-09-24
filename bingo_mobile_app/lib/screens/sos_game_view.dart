import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class SosGameView extends StatelessWidget {
  const SosGameView({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);
    final isPlaying = provider.currentRoom?.status == 'playing';
    final isFinished = provider.currentRoom?.status == 'finished';
    final size = provider.currentRoom?.boardSize ?? 5;
    final grid = provider.sosGrid;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Turn Banner
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: provider.isMyTurn
                  ? AppColors.emerald.withValues(alpha: 0.15)
                  : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: provider.isMyTurn ? AppColors.emerald : AppColors.border,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: provider.isMyTurn
                        ? AppColors.emerald
                        : AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  isPlaying
                      ? (provider.isMyTurn
                            ? '🎯 YOUR TURN! Place your letter on the grid'
                            : 'Waiting for ${provider.currentTurnName ?? "Opponent"}\'s turn...')
                      : (isFinished
                            ? '🏁 Game Finished!'
                            : 'Waiting for host to start...'),
                  style: TextStyle(
                    color: provider.isMyTurn
                        ? AppColors.emerald
                        : AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Scoreboard Card
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: (provider.currentRoom?.players ?? []).map((p) {
                final score = provider.sosScores[p.userId] ?? 0;
                final isCurrent = provider.currentTurnUserId == p.userId;
                return Column(
                  children: [
                    Text(
                      p.name,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isCurrent
                            ? AppColors.accent
                            : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        gradient: isCurrent ? AppColors.sosGradient : null,
                        color: isCurrent ? null : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$score SOS',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),

          // Letter Picker (S / O)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Choose Letter: ',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(width: 12),
                _letterChoiceButton('S', provider.selectedSosLetter == 'S', () {
                  provider.selectSosLetter('S');
                }),
                const SizedBox(width: 8),
                _letterChoiceButton('O', provider.selectedSosLetter == 'O', () {
                  provider.selectSosLetter('O');
                }),
              ],
            ),
          ),

          // SOS Grid
          AspectRatio(
            aspectRatio: 1.0,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border, width: 2),
              ),
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: size,
                  mainAxisSpacing: 6,
                  crossAxisSpacing: 6,
                ),
                itemCount: size * size,
                itemBuilder: (context, index) {
                  final row = index ~/ size;
                  final col = index % size;

                  dynamic cell;
                  if (grid.length > row && grid[row].length > col) {
                    cell = grid[row][col];
                  }

                  String displayLetter = '';
                  if (cell is Map) {
                    displayLetter = cell['letter']?.toString() ?? '';
                  } else if (cell is String) {
                    displayLetter = cell;
                  }

                  final isOccupied = displayLetter.isNotEmpty;

                  return GestureDetector(
                    onTap: () {
                      if (isPlaying && provider.isMyTurn && !isOccupied) {
                        provider.makeSosMove(row, col);
                      }
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      decoration: BoxDecoration(
                        color: isOccupied
                            ? AppColors.surfaceElevated
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isOccupied
                              ? AppColors.accent
                              : AppColors.border,
                          width: isOccupied ? 2 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        displayLetter,
                        style: TextStyle(
                          fontSize: size == 3 ? 32 : 22,
                          fontWeight: FontWeight.w900,
                          color: displayLetter == 'S'
                              ? AppColors.accent
                              : AppColors.gold,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _letterChoiceButton(
    String letter,
    bool isSelected,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          gradient: isSelected ? AppColors.sosGradient : null,
          color: isSelected ? null : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.accent : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          letter,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
