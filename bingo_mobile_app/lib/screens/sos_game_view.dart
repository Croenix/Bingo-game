import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Turn Banner
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: provider.isMyTurn
                  ? AppColors.emerald.withValues(alpha: 0.15)
                  : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: provider.isMyTurn ? AppColors.emerald : AppColors.border,
                width: provider.isMyTurn ? 1.5 : 1,
              ),
              boxShadow: provider.isMyTurn
                  ? AppColors.emeraldGlow(opacity: 0.3, blur: 12)
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: provider.isMyTurn ? AppColors.emerald : AppColors.accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  isPlaying
                      ? (provider.isMyTurn
                            ? '🎯 YOUR TURN! Place S or O on the grid'
                            : 'Waiting for ${provider.currentTurnName ?? "Opponent"}\'s move...')
                      : (isFinished
                            ? '🏁 GAME OVER! Check Final Scores'
                            : 'Waiting for host to launch battle...'),
                  style: GoogleFonts.outfit(
                    color: provider.isMyTurn ? AppColors.emerald : AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // Scoreboard Card
          Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppColors.border),
              boxShadow: AppColors.softCardShadow,
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
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isCurrent ? AppColors.accent : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: isCurrent ? AppColors.sosGradient : null,
                        color: isCurrent ? null : AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isCurrent ? AppColors.accent : AppColors.borderSubtle,
                        ),
                        boxShadow: isCurrent
                            ? [
                                BoxShadow(
                                  color: AppColors.emerald.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ]
                            : null,
                      ),
                      child: Text(
                        '$score SOS',
                        style: GoogleFonts.outfit(
                          fontSize: 17,
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
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'ACTIVE LETTER:',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    letterSpacing: 0.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 14),
                _letterChoiceButton('S', provider.selectedSosLetter == 'S', () {
                  provider.selectSosLetter('S');
                }),
                const SizedBox(width: 10),
                _letterChoiceButton('O', provider.selectedSosLetter == 'O', () {
                  provider.selectSosLetter('O');
                }),
              ],
            ),
          ),

          // Tactical Grid
          AspectRatio(
            aspectRatio: 1.0,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.border, width: 1.5),
                boxShadow: AppColors.softCardShadow,
              ),
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: size,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
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
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: isOccupied ? AppColors.surfaceElevated : AppColors.surfaceElevated.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(size == 3 ? 16 : 12),
                        border: Border.all(
                          color: isOccupied
                              ? (displayLetter == 'S' ? AppColors.accent : AppColors.emerald)
                              : AppColors.borderSubtle,
                          width: isOccupied ? 2 : 1,
                        ),
                        boxShadow: isOccupied
                            ? [
                                BoxShadow(
                                  color: (displayLetter == 'S' ? AppColors.accent : AppColors.emerald).withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        displayLetter,
                        style: GoogleFonts.outfit(
                          fontSize: size == 3 ? 36 : 22,
                          fontWeight: FontWeight.w900,
                          color: displayLetter == 'S' ? AppColors.accent : AppColors.emerald,
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
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          gradient: isSelected ? AppColors.sosGradient : null,
          color: isSelected ? null : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.accent : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.emerald.withValues(alpha: 0.45),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          letter,
          style: GoogleFonts.outfit(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
