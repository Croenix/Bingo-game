import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';
import 'bingo_game_view.dart';
import 'sos_game_view.dart';
import 'liars_bar_view.dart';

class GameScreen extends StatelessWidget {
  const GameScreen({super.key});

  void _copyRoomCode(BuildContext context, String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Room Code $code copied to clipboard! 📋'),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _confirmLeave(BuildContext context, GameProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surfaceElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Leave Room?',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          provider.isHost
              ? 'Warning: You are the Room Host! Leaving will permanently delete the room.'
              : 'Are you sure you want to leave this game room?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Stay',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () {
              Navigator.pop(ctx);
              provider.leaveRoom();
            },
            child: const Text('Leave Room'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);
    final room = provider.currentRoom;

    if (room == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final isHost = provider.isHost;
    final isWaiting = room.status == 'waiting';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppColors.surface,
        title: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios, size: 18),
              onPressed: () => _confirmLeave(context, provider),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    room.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _copyRoomCode(context, room.roomId),
                    child: Row(
                      children: [
                        Text(
                          'Code: ${room.roomId}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.copy,
                          size: 11,
                          color: AppColors.primaryLight,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (isHost && isWaiting)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.emerald,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 0,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () => provider.startGame(),
                icon: const Icon(Icons.play_arrow, size: 16),
                label: const Text(
                  'Start',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: AppColors.danger),
            onPressed: () => _confirmLeave(context, provider),
          ),
        ],
      ),
      body: Column(
        children: [
          // Players Horizontal Strip
          Container(
            height: 76,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: room.players.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final player = room.players[index];
                final isCurrentTurn =
                    provider.currentTurnUserId == player.userId;
                final isPlayerHost = room.creatorId == player.userId;

                return Column(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isCurrentTurn
                                  ? AppColors.emerald
                                  : (isPlayerHost
                                        ? AppColors.gold
                                        : AppColors.border),
                              width: isCurrentTurn ? 2.5 : 1.5,
                            ),
                            color: AppColors.surfaceElevated,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            player.name.isNotEmpty
                                ? player.name[0].toUpperCase()
                                : 'P',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        if (isPlayerHost)
                          const Positioned(
                            top: -4,
                            right: -2,
                            child: Text('👑', style: TextStyle(fontSize: 12)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      player.name,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isCurrentTurn
                            ? AppColors.emerald
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // Active Game Mode View
          Expanded(child: _buildGameView(room.gameType)),
        ],
      ),
    );
  }

  Widget _buildGameView(String gameType) {
    switch (gameType.toLowerCase()) {
      case 'sos':
        return const SosGameView();
      case 'liars_bar':
        return const LiarsBarView();
      case 'bingo':
      default:
        return const BingoGameView();
    }
  }
}
