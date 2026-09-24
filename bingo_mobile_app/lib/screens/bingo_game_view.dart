import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Drawn Ball Banner
              if (provider.lastPickedNumber != null) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    gradient: AppColors.goldGradient,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.gold.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: const BoxDecoration(
                          color: Colors.black87,
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '${provider.lastPickedNumber}',
                          style: const TextStyle(
                            color: AppColors.gold,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'LAST PICKED NUMBER',
                              style: TextStyle(
                                color: Colors.black87,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Picked by ${provider.lastPickedBy ?? "Player"}',
                              style: const TextStyle(
                                color: Colors.black87,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // B-I-N-G-O Letters Progress Header
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
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
                    const SizedBox(height: 8),
                    Text(
                      'Lines Cleared: ${provider.completedLinesCount}/5',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: provider.completedLinesCount >= 5
                            ? AppColors.emerald
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // Turn status banner
              if (isPlaying) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: provider.isMyTurn
                        ? AppColors.emerald.withValues(alpha: 0.15)
                        : AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: provider.isMyTurn
                          ? AppColors.emerald
                          : AppColors.primary,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        provider.isMyTurn
                            ? Icons.play_arrow
                            : Icons.hourglass_top,
                        color: provider.isMyTurn
                            ? AppColors.emerald
                            : AppColors.primaryLight,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        provider.isMyTurn
                            ? '🎯 YOUR TURN! Tap a number to pick'
                            : 'Waiting for ${provider.currentTurnName ?? "Player"}\'s turn...',
                        style: TextStyle(
                          color: provider.isMyTurn
                              ? AppColors.emerald
                              : AppColors.primaryLight,
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
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border, width: 2),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black45,
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 5,
                          mainAxisSpacing: 6,
                          crossAxisSpacing: 6,
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
                          duration: const Duration(milliseconds: 200),
                          decoration: BoxDecoration(
                            gradient: isMarked
                                ? AppColors.rubyGradient
                                : (isPicked ? AppColors.goldGradient : null),
                            color: isMarked || isPicked
                                ? null
                                : AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isMarked
                                  ? AppColors.secondary
                                  : (isPicked
                                        ? AppColors.gold
                                        : AppColors.border),
                              width: isMarked || isPicked ? 2 : 1,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Text(
                                '$number',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: isMarked || isPicked
                                      ? Colors.white
                                      : AppColors.textPrimary,
                                ),
                              ),
                              if (isMarked)
                                Positioned(
                                  right: 2,
                                  bottom: 2,
                                  child: Container(
                                    padding: const EdgeInsets.all(2),
                                    decoration: const BoxDecoration(
                                      color: Colors.white24,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.check,
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

              // Game Finished Leaderboard
              if (isFinished && provider.winners.isNotEmpty) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.gold, width: 1.5),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        '🏆 BINGO WINNERS LEADERBOARD',
                        style: TextStyle(
                          color: AppColors.gold,
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...provider.winners.map(
                        (w) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Text(
                                w.position == 1 ? '🥇 #1' : '#${w.position}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.gold,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  w.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                w.timeDisplay,
                                style: const TextStyle(
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
              Colors.green,
              Colors.blue,
              Colors.pink,
              Colors.orange,
              Colors.purple,
            ],
          ),
        ),
      ],
    );
  }

  Widget _bingoLetterBadge(String letter, bool isActive) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: isActive ? AppColors.rubyGradient : null,
        color: isActive ? null : AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? AppColors.secondary : AppColors.border,
          width: isActive ? 2 : 1,
        ),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: AppColors.secondary.withValues(alpha: 0.5),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      alignment: Alignment.center,
      child: Text(
        letter,
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w900,
          color: isActive ? Colors.white : AppColors.textMuted,
        ),
      ),
    );
  }
}
