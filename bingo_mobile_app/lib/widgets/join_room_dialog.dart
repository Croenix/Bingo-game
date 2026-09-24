import 'package:flutter/material.dart';
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
      backgroundColor: AppColors.surfaceElevated,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: AppColors.border),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.key, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          const Text('Join Game Room', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter 6-Character Room Code:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _codeController,
              textCapitalization: TextCapitalization.characters,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a valid room code' : null,
              decoration: const InputDecoration(
                hintText: 'e.g. VIP123 or ABCDEF',
                prefixIcon: Icon(Icons.tag, color: AppColors.textMuted),
              ),
            ),
            const SizedBox(height: 14),
            const Text('Room Password (if protected):', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                hintText: 'Leave empty if public',
                prefixIcon: Icon(Icons.lock_outline, color: AppColors.textMuted),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
        ),
        ElevatedButton(
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
          child: const Text('Join Arena 🎮'),
        ),
      ],
    );
  }
}
