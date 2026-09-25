import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
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
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: AppColors.emerald, size: 20),
            const SizedBox(width: 10),
            Text(
              'Room Code #$code copied to clipboard! 📋',
              style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
        backgroundColor: AppColors.surfaceElevated,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppColors.primary),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _confirmLeave(BuildContext context, GameProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.border),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              'Leave Arena?',
              style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        content: Text(
          provider.isHost
              ? 'Warning: You are the Room Host! Leaving will dismiss the room for all players.'
              : 'Are you sure you want to leave this game room? Your active progress will be abandoned.',
          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Stay in Game',
              style: GoogleFonts.outfit(color: AppColors.textSecondary, fontWeight: FontWeight.w700),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              provider.leaveRoom();
            },
            child: Text(
              'Leave Match',
              style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 13),
            ),
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
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final isHost = provider.isHost;
    final isWaiting = room.status == 'waiting';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppColors.surface.withValues(alpha: 0.95),
        elevation: 0,
        titleSpacing: 8,
        title: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
              onPressed: () => _confirmLeave(context, provider),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    room.name,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _copyRoomCode(context, room.roomId),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '#${room.roomId}',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              color: AppColors.primaryLight,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        const Icon(
                          Icons.copy_rounded,
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
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
              child: Container(
                decoration: BoxDecoration(
                  gradient: AppColors.emeraldGradient,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: AppColors.emeraldGlow(opacity: 0.4, blur: 10),
                ),
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => provider.startGame(),
                  icon: const Icon(Icons.play_arrow_rounded, size: 18, color: Colors.white),
                  label: Text(
                    'START GAME',
                    style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 20),
            onPressed: () => _confirmLeave(context, provider),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Agora Live Voice Chat Control Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              border: const Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                // Voice Status Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: provider.voiceService.isJoined
                        ? AppColors.emerald.withValues(alpha: 0.15)
                        : (provider.voiceService.isConnecting
                            ? AppColors.gold.withValues(alpha: 0.15)
                            : AppColors.surface),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: provider.voiceService.isJoined
                          ? AppColors.emerald.withValues(alpha: 0.6)
                          : (provider.voiceService.isConnecting
                              ? AppColors.gold.withValues(alpha: 0.6)
                              : AppColors.border),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: provider.voiceService.isJoined
                              ? AppColors.emerald
                              : (provider.voiceService.isConnecting ? AppColors.gold : AppColors.textMuted),
                          boxShadow: provider.voiceService.isJoined
                              ? [BoxShadow(color: AppColors.emerald.withValues(alpha: 0.8), blurRadius: 6)]
                              : null,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        provider.voiceService.isJoined
                            ? '🎙️ SPATIAL AUDIO LIVE'
                            : (provider.voiceService.isConnecting ? 'CONNECTING...' : 'VOICE READY'),
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: provider.voiceService.isJoined
                              ? AppColors.emerald
                              : (provider.voiceService.isConnecting ? AppColors.gold : AppColors.textMuted),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),

                // Mic Toggle Button
                InkWell(
                  onTap: () => provider.toggleVoiceMic(),
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: provider.voiceService.isMicMuted
                          ? AppColors.danger.withValues(alpha: 0.15)
                          : AppColors.emerald.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: provider.voiceService.isMicMuted
                            ? AppColors.danger.withValues(alpha: 0.6)
                            : AppColors.emerald.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          provider.voiceService.isMicMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                          size: 14,
                          color: provider.voiceService.isMicMuted ? AppColors.danger : AppColors.emerald,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          provider.voiceService.isMicMuted ? 'Muted' : 'Live Mic',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: provider.voiceService.isMicMuted ? AppColors.danger : AppColors.emerald,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Speaker Toggle Button
                InkWell(
                  onTap: () => provider.toggleVoiceSpeaker(),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: provider.voiceService.isSpeakerMuted
                          ? AppColors.danger.withValues(alpha: 0.15)
                          : AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: provider.voiceService.isSpeakerMuted
                            ? AppColors.danger.withValues(alpha: 0.6)
                            : AppColors.primary.withValues(alpha: 0.6),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          provider.voiceService.isSpeakerMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                          size: 14,
                          color: provider.voiceService.isSpeakerMuted ? AppColors.danger : AppColors.primaryLight,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          provider.voiceService.isSpeakerMuted ? 'Muted' : 'Audio On',
                          style: GoogleFonts.outfit(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: provider.voiceService.isSpeakerMuted ? AppColors.danger : AppColors.primaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Players Horizontal Roster Strip
          Container(
            height: 84,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: room.players.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final player = room.players[index];
                final isCurrentTurn = provider.currentTurnUserId == player.userId;
                final isPlayerHost = room.creatorId == player.userId;
                final isSpeaking = provider.isPlayerSpeaking(player.userId);
                final isMicMuted = provider.isPlayerMicMuted(player.userId);

                return Column(
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSpeaking
                                  ? AppColors.emerald
                                  : (isCurrentTurn
                                      ? AppColors.primaryLight
                                      : (isPlayerHost ? AppColors.gold : AppColors.border)),
                              width: isSpeaking ? 3.0 : (isCurrentTurn ? 2.5 : 1.5),
                            ),
                            boxShadow: isSpeaking
                                ? [
                                    BoxShadow(
                                      color: AppColors.emerald.withValues(alpha: 0.7),
                                      blurRadius: 10,
                                      spreadRadius: 2,
                                    )
                                  ]
                                : null,
                            color: AppColors.surfaceElevated,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            player.name.isNotEmpty ? player.name[0].toUpperCase() : 'P',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w900,
                              fontSize: 17,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        if (isPlayerHost)
                          const Positioned(
                            top: -6,
                            right: -3,
                            child: Text('👑', style: TextStyle(fontSize: 13)),
                          ),
                        // Voice mic indicator badge
                        Positioned(
                          bottom: -2,
                          right: -2,
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: isMicMuted ? AppColors.surfaceElevated : AppColors.surface,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isMicMuted ? AppColors.danger : AppColors.emerald,
                                width: 1.2,
                              ),
                            ),
                            child: Text(
                              isMicMuted ? '🔇' : (isSpeaking ? '🔊' : '🎙️'),
                              style: const TextStyle(fontSize: 9),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    SizedBox(
                      width: 54,
                      child: Text(
                        player.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isSpeaking
                              ? AppColors.emerald
                              : (isCurrentTurn ? AppColors.primaryLight : AppColors.textSecondary),
                        ),
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
