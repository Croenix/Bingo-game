import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class SplashAuthScreen extends StatefulWidget {
  const SplashAuthScreen({super.key});

  @override
  State<SplashAuthScreen> createState() => _SplashAuthScreenState();
}

class _SplashAuthScreenState extends State<SplashAuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _gmailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _gmailController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final provider = Provider.of<GameProvider>(context, listen: false);
      final success = await provider.loginOrRegister(
        gmailId: _gmailController.text.trim(),
        username: _usernameController.text.trim(),
        password: _passwordController.text.trim(),
      );
      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Login failed'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo & Header
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.4),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Text('🎮', style: TextStyle(fontSize: 36)),
                ),
                const SizedBox(height: 16),
                const Text(
                  'GAME ARENA',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Multiplayer Bingo, SOS Strategy & Liar\'s Bar',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 32),

                // Card Box
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.border),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black38,
                        blurRadius: 16,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Join The Arena',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Enter your gaming details to play',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Gmail ID
                        const Text(
                          'Gmail Address',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _gmailController,
                          keyboardType: TextInputType.emailAddress,
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Enter your Gmail address';
                            }
                            if (!v.contains('@')) return 'Enter a valid email';
                            return null;
                          },
                          decoration: const InputDecoration(
                            hintText: 'player@gmail.com',
                            prefixIcon: Icon(
                              Icons.email_outlined,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Username
                        const Text(
                          'Gaming Username',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _usernameController,
                          validator: (v) => (v == null || v.trim().isEmpty)
                              ? 'Enter your gamer name'
                              : null,
                          decoration: const InputDecoration(
                            hintText: 'e.g. ShadowHunter',
                            prefixIcon: Icon(
                              Icons.person_outline,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Password (optional)
                        const Text(
                          'Password (Optional)',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            hintText: 'Account password',
                            prefixIcon: Icon(
                              Icons.lock_outline,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Enter Arena Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: provider.isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: provider.isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text(
                                    'ENTER ARENA 🚀',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
