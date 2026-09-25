import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class CreateRoomDialog extends StatefulWidget {
  final String initialGameType;
  final String? initialChallengeId;

  const CreateRoomDialog({
    super.key,
    this.initialGameType = 'bingo',
    this.initialChallengeId,
  });

  @override
  State<CreateRoomDialog> createState() => _CreateRoomDialogState();
}

class _CreateRoomDialogState extends State<CreateRoomDialog> {
  final _formKey = GlobalKey<FormState>();
  late String _gameType;
  late TextEditingController _nameController;
  late TextEditingController _customCodeController;
  late TextEditingController _passwordController;
  int _capacity = 4;
  int _boardSize = 5;
  String _liarsVariant = 'standard';
  bool _isPublic = true;
  String? _selectedChallengeId;

  @override
  void initState() {
    super.initState();
    _gameType = widget.initialGameType;
    _selectedChallengeId = widget.initialChallengeId;
    _nameController = TextEditingController(
      text:
          '${_gameType.toUpperCase()} Arena #${100 + (DateTime.now().millisecond % 900)}',
    );
    _customCodeController = TextEditingController();
    _passwordController = TextEditingController();

    if (_gameType == 'sos') {
      _capacity = 2;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _customCodeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onGameTypeChanged(String newType) {
    setState(() {
      _gameType = newType;
      _nameController.text =
          '${_gameType.toUpperCase()} Arena #${100 + (DateTime.now().millisecond % 900)}';
      if (_gameType == 'sos') {
        _capacity = 2;
      } else if (_capacity < 2) {
        _capacity = 4;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final challenges = Provider.of<GameProvider>(context).challenges;

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
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: AppColors.primaryGlow(opacity: 0.4, blur: 8),
            ),
            child: const Icon(
              Icons.add_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Host New Arena',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w900),
          ),
        ],
      ),
      content: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Game Type Selector Tabs
              Text(
                'GAME MODE',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _gameTypeTab('bingo', '🎲 Bingo', AppColors.primary),
                  const SizedBox(width: 6),
                  _gameTypeTab('sos', '🔤 SOS', AppColors.accent),
                  const SizedBox(width: 6),
                  _gameTypeTab('liars_bar', '🍷 Liar\'s', AppColors.danger),
                ],
              ),
              const SizedBox(height: 16),

              // Room Name
              Text(
                'ARENA ROOM NAME',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Please enter a room name'
                    : null,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'e.g. Champions Lounge',
                  prefixIcon: Icon(
                    Icons.sports_esports_outlined,
                    color: AppColors.primaryLight,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Custom Room Code & Password
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CUSTOM CODE (OPT)',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: 0.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _customCodeController,
                          textCapitalization: TextCapitalization.characters,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          decoration: const InputDecoration(
                            hintText: 'e.g. VIP888',
                            prefixIcon: Icon(
                              Icons.tag_rounded,
                              color: AppColors.accent,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PASSWORD (OPT)',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: 0.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: true,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          decoration: const InputDecoration(
                            hintText: 'Private pin',
                            prefixIcon: Icon(
                              Icons.lock_outline_rounded,
                              color: AppColors.gold,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Capacity & Options
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MAX PLAYERS',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: 0.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<int>(
                              value: _capacity,
                              isExpanded: true,
                              dropdownColor: AppColors.surfaceElevated,
                              items: (_gameType == 'sos'
                                      ? [2, 3]
                                      : [2, 3, 4, 5, 6, 8, 10])
                                  .map(
                                    (c) => DropdownMenuItem(
                                      value: c,
                                      child: Text(
                                        '$c Players',
                                        style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                                      ),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) {
                                if (v != null) setState(() => _capacity = v);
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_gameType == 'sos') ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'GRID SIZE',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                              letterSpacing: 0.5,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<int>(
                                value: _boardSize,
                                isExpanded: true,
                                dropdownColor: AppColors.surfaceElevated,
                                items: const [
                                  DropdownMenuItem(
                                    value: 3,
                                    child: Text('3x3 Grid', style: TextStyle(fontSize: 13)),
                                  ),
                                  DropdownMenuItem(
                                    value: 5,
                                    child: Text('5x5 Grid', style: TextStyle(fontSize: 13)),
                                  ),
                                ],
                                onChanged: (v) {
                                  if (v != null) setState(() => _boardSize = v);
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (_gameType == 'liars_bar') ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'DECK VARIANT',
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                              letterSpacing: 0.5,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _liarsVariant,
                                isExpanded: true,
                                dropdownColor: AppColors.surfaceElevated,
                                items: const [
                                  DropdownMenuItem(
                                    value: 'standard',
                                    child: Text('Standard', style: TextStyle(fontSize: 13)),
                                  ),
                                  DropdownMenuItem(
                                    value: 'devil',
                                    child: Text('Devil Card', style: TextStyle(fontSize: 13)),
                                  ),
                                  DropdownMenuItem(
                                    value: 'chaos',
                                    child: Text('Chaos Mode', style: TextStyle(fontSize: 13)),
                                  ),
                                ],
                                onChanged: (v) {
                                  if (v != null) {
                                    setState(() => _liarsVariant = v);
                                  }
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 14),

              // Challenges Dropdown (if available)
              if (challenges.isNotEmpty) ...[
                Text(
                  'LINKED QUEST BOUNTY (OPTIONAL)',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String?>(
                      value: _selectedChallengeId,
                      isExpanded: true,
                      dropdownColor: AppColors.surfaceElevated,
                      hint: const Text('Casual Game (No Bounty)', style: TextStyle(fontSize: 13)),
                      items: [
                        const DropdownMenuItem(
                          value: null,
                          child: Text('Casual Play (Free Entry)', style: TextStyle(fontSize: 13)),
                        ),
                        ...challenges.map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text(
                              '${c.icon} ${c.title} (🪙 +${c.rewardCoin})',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                      onChanged: (v) => setState(() => _selectedChallengeId = v),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Public Switch
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: SwitchListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                  title: Text(
                    'List in Public Lobby',
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    'Allow players across the arena to join',
                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                  ),
                  value: _isPublic,
                  activeThumbColor: AppColors.primary,
                  onChanged: (v) => setState(() => _isPublic = v),
                ),
              ),
            ],
          ),
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
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(14),
            boxShadow: AppColors.primaryGlow(opacity: 0.4, blur: 10),
          ),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            ),
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                final provider = Provider.of<GameProvider>(
                  context,
                  listen: false,
                );
                provider.createRoom(
                  roomName: _nameController.text.trim(),
                  capacity: _capacity,
                  customRoomId: _customCodeController.text.trim().isNotEmpty
                      ? _customCodeController.text.trim().toUpperCase()
                      : null,
                  password: _passwordController.text.trim(),
                  isPublic: _isPublic,
                  gameType: _gameType,
                  boardSize: _boardSize,
                  liarsMode: 'deck',
                  liarsDeckVariant: _liarsVariant,
                  challengeId: _selectedChallengeId,
                );
                Navigator.pop(context);
              }
            },
            child: Text(
              'LAUNCH ARENA 🚀',
              style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 13),
            ),
          ),
        ),
      ],
    );
  }

  Widget _gameTypeTab(String type, String label, Color color) {
    final isSelected = _gameType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onGameTypeChanged(type),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.2) : AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? color : AppColors.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
