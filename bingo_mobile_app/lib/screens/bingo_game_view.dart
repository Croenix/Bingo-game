import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class BingoGameView extends StatefulWidget {
  const BingoGameView({super.key});

  @override
  State<BingoGameView> createState() => _BingoGameViewState();
}

class _BingoGameViewState extends State<BingoGameView> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(
      duration: const Duration(seconds: 4),
    );
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);
    final isPlaying = provider.currentRoom?.status == 'playing';
    final isFinished = provider.currentRoom?.status == 'finished';

    if (provider.hasClaimedBingo) {
      _confettiController.play();
    }

    return Stack(
      children: [
        SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Drawn Ball Banner
              if (provider.lastPickedNumber != null) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: AppColors.goldGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: AppColors.goldGlow(opacity: 0.4, blur: 14),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5),
                          boxShadow: const [
                            BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3)),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${provider.lastPickedNumber}',
                          style: GoogleFonts.outfit(
                            color: AppColors.goldLight,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'LAST DRAWN NUMBER',
                              style: GoogleFonts.outfit(
                                color: const Color(0xFF451A03),
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Called by ${provider.lastPickedBy ?? "Host"}',
                              style: GoogleFonts.inter(
                                color: const Color(0xFF78350F),
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${provider.pickedNumbers.length} DRAWN',
                          style: GoogleFonts.outfit(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF451A03),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // B-I-N-G-O Letters Progress Header
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppColors.softCardShadow,
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _bingoLetterBadge('B', provider.bingoLetters[0]),
                        _bingoLetterBadge('I', provider.bingoLetters[1]),
                        _bingoLetterBadge('N', provider.bingoLetters[2]),
                        _bingoLetterBadge('G', provider.bingoLetters[3]),
                        _bingoLetterBadge('O', provider.bingoLetters[4]),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.linear_scale_rounded, size: 16, color: AppColors.accent),
                            const SizedBox(width: 6),
                            Text(
                              'Lines Completed: ',
                              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                            ),
                            Text(
                              '${provider.completedLinesCount}/5',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: provider.completedLinesCount >= 5 ? AppColors.emerald : AppColors.gold,
                              ),
                            ),
                          ],
                        ),
                        if (provider.hasClaimedBingo)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: AppColors.goldGradient,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '🎉 BINGO CLAIMED!',
                              style: GoogleFonts.outfit(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // Turn Status Banner
              if (isPlaying) ...[
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
                        ? AppColors.emeraldGlow(opacity: 0.25, blur: 10)
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
                        provider.isMyTurn
                            ? '🎯 YOUR TURN! Tap any number on your card'
                            : 'Waiting for ${provider.currentTurnName ?? "Player"}\'s pick...',
                        style: GoogleFonts.outfit(
                          color: provider.isMyTurn ? AppColors.emerald : AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // 5x5 Bingo Grid Board
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
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 5,
                      mainAxisSpacing: 8,
                      crossAxisSpacing: 8,
                    ),
                    itemCount: provider.myBingoCard.length == 25 ? 25 : 0,
                    itemBuilder: (context, index) {
                      final number = provider.myBingoCard[index];
                      final isMarked = provider.markedIndexes.contains(index);
                      final isPicked = provider.pickedNumbers.contains(number);

                      return GestureDetector(
                        onTap: () {
                          if (isPlaying && provider.isMyTurn && !isPicked) {
                            provider.pickBingoNumber(number);
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          decoration: BoxDecoration(
                            gradient: isMarked
                                ? AppColors.rubyGradient
                                : (isPicked ? AppColors.goldGradient : null),
                            color: isMarked || isPicked ? null : AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isMarked
                                  ? AppColors.secondary
                                  : (isPicked ? AppColors.gold : AppColors.borderSubtle),
                              width: isMarked || isPicked ? 2 : 1,
                            ),
                            boxShadow: isMarked
                                ? [
                                    BoxShadow(
                                      color: AppColors.secondary.withValues(alpha: 0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Text(
                                '$number',
                                style: GoogleFonts.outfit(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: isMarked || isPicked ? Colors.white : AppColors.textPrimary,
                                ),
                              ),
                              if (isMarked)
                                Positioned(
                                  right: 3,
                                  bottom: 3,
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(
                                      color: Colors.white30,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.check_rounded,
                                      size: 10,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              // Bingo Victory Banner if completed
              if (provider.hasClaimedBingo || provider.completedLinesCount >= 5) ...[
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  decoration: BoxDecoration(
                    gradient: AppColors.goldGradient,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: AppColors.goldGlow(opacity: 0.5, blur: 16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('🎉', style: TextStyle(fontSize: 22)),
                      const SizedBox(width: 8),
                      Text(
                        'BINGO COMPLETED! 5 LINES CLEARED 🏆',
                        style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                          color: const Color(0xFF451A03),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Game Finished Leaderboard
              if (isFinished && provider.winners.isNotEmpty) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppColors.gold, width: 1.5),
                    boxShadow: AppColors.goldGlow(opacity: 0.3, blur: 12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('🏆', style: TextStyle(fontSize: 20)),
                          const SizedBox(width: 8),
                          Text(
                            'MATCH WINNERS',
                            style: GoogleFonts.outfit(
                              color: AppColors.gold,
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ...provider.winners.map(
                        (w) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: w.position == 1 ? AppColors.gold : AppColors.border,
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(
                                w.position == 1 ? '🥇 #1' : (w.position == 2 ? '🥈 #2' : '#${w.position}'),
                                style: GoogleFonts.outfit(
                                  fontWeight: FontWeight.w900,
                                  color: w.position == 1 ? AppColors.gold : AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  w.name,
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              Text(
                                w.timeDisplay,
                                style: GoogleFonts.inter(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        // Confetti Celebration
        Align(
          alignment: Alignment.topCenter,
          child: ConfettiWidget(
            confettiController: _confettiController,
            blastDirectionality: BlastDirectionality.explosive,
            shouldLoop: false,
            colors: const [
              AppColors.gold,
              AppColors.primary,
              AppColors.secondary,
              AppColors.emerald,
              AppColors.accent,
            ],
          ),
        ),
      ],
    );
  }

  Widget _bingoLetterBadge(String letter, bool isActive) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: isActive ? AppColors.rubyGradient : null,
        color: isActive ? null : AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isActive ? AppColors.secondary : AppColors.border,
          width: isActive ? 2 : 1,
        ),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: AppColors.secondary.withValues(alpha: 0.55),
                  blurRadius: 12,
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
          color: isActive ? Colors.white : AppColors.textMuted,
        ),
      ),
    );
  }
}
