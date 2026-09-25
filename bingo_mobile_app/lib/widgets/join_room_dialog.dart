import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class JoinRoomDialog extends StatefulWidget {
  final String? initialRoomCode;
  const JoinRoomDialog({super.key, this.initialRoomCode});

  @override
  State<JoinRoomDialog> createState() => _JoinRoomDialogState();
}

class _JoinRoomDialogState extends State<JoinRoomDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _codeController;
  late TextEditingController _passwordController;

  @override
  void initState() {
    super.initState();
    _codeController = TextEditingController(text: widget.initialRoomCode ?? '');
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: const BorderSide(color: AppColors.border),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: AppColors.cyberGradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppColors.accent.withValues(alpha: 0.4),
                  blurRadius: 10,
                ),
              ],
            ),
            child: const Icon(Icons.vpn_key_rounded, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Text(
            'Join Game Arena',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ROOM CODE',
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w800,
                fontSize: 11,
                letterSpacing: 0.8,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a valid room code' : null,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 1.5),
              decoration: const InputDecoration(
                hintText: 'e.g. VIP123',
                prefixIcon: Icon(Icons.tag_rounded, color: AppColors.accent, size: 20),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'ROOM PASSWORD (IF PROTECTED)',
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.w800,
                fontSize: 11,
                letterSpacing: 0.8,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Leave empty if public match',
                prefixIcon: Icon(Icons.lock_outline_rounded, color: AppColors.gold, size: 20),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: GoogleFonts.outfit(color: AppColors.textSecondary, fontWeight: FontWeight.w700),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            gradient: AppColors.cyberGradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.accent.withValues(alpha: 0.35),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                final provider = Provider.of<GameProvider>(context, listen: false);
                provider.joinRoom(
                  roomId: _codeController.text.trim().toUpperCase(),
                  password: _passwordController.text.trim(),
                );
                Navigator.pop(context);
              }
            },
            child: Text(
              'ENTER ARENA 🎮',
              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w900),
            ),
          ),
        ),
      ],
    );
  }
}
