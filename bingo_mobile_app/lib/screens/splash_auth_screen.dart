import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class SplashAuthScreen extends StatefulWidget {
  const SplashAuthScreen({super.key});

  @override
  State<SplashAuthScreen> createState() => _SplashAuthScreenState();
}

class _SplashAuthScreenState extends State<SplashAuthScreen>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _gmailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
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
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    provider.errorMessage ?? 'Authentication failed. Please check details.',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
      body: Stack(
        children: [
          // Ambient Animated Background Glows
          AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              return Stack(
                children: [
                  Positioned(
                    top: -100 + (_animController.value * 40),
                    right: -80,
                    child: Container(
                      width: 320,
                      height: 320,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.primary.withValues(alpha: 0.35),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 50 - (_animController.value * 50),
                    left: -100,
                    child: Container(
                      width: 350,
                      height: 350,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.accent.withValues(alpha: 0.25),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 280 + (_animController.value * 30),
                    left: 40,
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.secondary.withValues(alpha: 0.15),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),

          // Main Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Brand Icon Badge
                    Container(
                      width: 86,
                      height: 86,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.5),
                            blurRadius: 28,
                            offset: const Offset(0, 10),
                          ),
                          BoxShadow(
                            color: AppColors.accent.withValues(alpha: 0.3),
                            blurRadius: 16,
                            offset: const Offset(0, -2),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 74,
                            height: 74,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ),
                          const Text('🎮', style: TextStyle(fontSize: 42)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // App Title & Tagline
                    ShaderMask(
                      shaderCallback: (bounds) => AppColors.cyberGradient.createShader(bounds),
                      child: Text(
                        'GAME ARENA',
                        style: GoogleFonts.outfit(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.0,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Next-Gen Multiplayer • Voice Chat • Live Tournaments',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Feature Badges
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildFeaturePill('⚡ Real-time Sync', AppColors.primary),
                          const SizedBox(width: 8),
                          _buildFeaturePill('🎙️ Live Voice Chat', AppColors.accent),
                          const SizedBox(width: 8),
                          _buildFeaturePill('🏆 Ranked Battles', AppColors.gold),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Luxury Login Card
                    Container(
                      padding: const EdgeInsets.all(26),
                      decoration: BoxDecoration(
                        color: AppColors.cardGlass,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.1),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.45),
                            blurRadius: 24,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Enter The Arena',
                                      style: GoogleFonts.outfit(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Create or sign in to your gamer profile',
                                      style: GoogleFonts.inter(
                                        color: AppColors.textMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.emerald.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: AppColors.emerald.withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: const Text(
                                    'ONLINE',
                                    style: TextStyle(
                                      color: AppColors.emerald,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 22),

                            // Gmail Field
                            _buildInputLabel('GMAIL ADDRESS', Icons.alternate_email),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _gmailController,
                              keyboardType: TextInputType.emailAddress,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  return 'Enter your email address';
                                }
                                if (!v.contains('@')) return 'Enter a valid email address';
                                return null;
                              },
                              decoration: InputDecoration(
                                hintText: 'player@gmail.com',
                                prefixIcon: const Icon(
                                  Icons.email_outlined,
                                  color: AppColors.primaryLight,
                                  size: 20,
                                ),
                                suffixIcon: _gmailController.text.isNotEmpty
                                    ? const Icon(Icons.check_circle, color: AppColors.emerald, size: 18)
                                    : null,
                              ),
                            ),
                            const SizedBox(height: 18),

                            // Username Field
                            _buildInputLabel('GAMER USERNAME', Icons.badge_outlined),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _usernameController,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              validator: (v) => (v == null || v.trim().isEmpty)
                                  ? 'Enter your player nickname'
                                  : null,
                              decoration: const InputDecoration(
                                hintText: 'e.g. ApexLegend',
                                prefixIcon: Icon(
                                  Icons.sports_esports_outlined,
                                  color: AppColors.accent,
                                  size: 20,
                                ),
                              ),
                            ),
                            const SizedBox(height: 18),

                            // Password Field
                            _buildInputLabel('PASSWORD (OPTIONAL)', Icons.lock_outline),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              decoration: InputDecoration(
                                hintText: 'Leave empty for quick guest access',
                                prefixIcon: const Icon(
                                  Icons.lock_clock_outlined,
                                  color: AppColors.gold,
                                  size: 20,
                                ),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                    color: AppColors.textMuted,
                                    size: 20,
                                  ),
                                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                ),
                              ),
                            ),
                            const SizedBox(height: 26),

                            // Enter Arena Button
                            Container(
                              width: double.infinity,
                              height: 54,
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: AppColors.primaryGlow(opacity: 0.4, blur: 16),
                              ),
                              child: ElevatedButton(
                                onPressed: provider.isLoading ? null : _handleLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: provider.isLoading
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          color: Colors.white,
                                          strokeWidth: 2.5,
                                        ),
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            'ENTER ARENA',
                                            style: GoogleFonts.outfit(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 1.0,
                                              color: Colors.white,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                                        ],
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),
                    Text(
                      'By entering, you agree to Fair Play & Arena Rules',
                      style: GoogleFonts.inter(
                        color: AppColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputLabel(String label, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w700,
            fontSize: 11,
            letterSpacing: 0.8,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturePill(String text, Color accentColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          color: AppColors.textPrimary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
