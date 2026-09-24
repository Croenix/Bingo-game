import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/game_provider.dart';
import 'theme/app_theme.dart';
import 'screens/splash_auth_screen.dart';
import 'screens/lobby_screen.dart';
import 'screens/game_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final gameProvider = GameProvider();
  await gameProvider.init();

  runApp(BingoMobileApp(gameProvider: gameProvider));
}

class BingoMobileApp extends StatelessWidget {
  final GameProvider? gameProvider;
  const BingoMobileApp({super.key, this.gameProvider});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        if (gameProvider != null)
          ChangeNotifierProvider.value(value: gameProvider!)
        else
          ChangeNotifierProvider(create: (_) => GameProvider()..init()),
      ],
      child: MaterialApp(
        title: 'Game Arena',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const RootScreenRouter(),
      ),
    );
  }
}

class RootScreenRouter extends StatelessWidget {
  const RootScreenRouter({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<GameProvider>(context);

    // If an error alert message is set, show a floating SnackBar
    if (provider.errorMessage != null && provider.errorMessage!.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage!),
            backgroundColor: AppColors.danger,
            action: SnackBarAction(
              label: 'OK',
              textColor: Colors.white,
              onPressed: () => provider.clearError(),
            ),
          ),
        );
        provider.clearError();
      });
    }

    if (provider.isLoading && provider.currentUser == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    // Active in a Game Room
    if (provider.currentRoom != null) {
      return const GameScreen();
    }

    // Authenticated -> Lobby
    if (provider.currentUser != null) {
      return const LobbyScreen();
    }

    // Unauthenticated -> Auth Screen
    return const SplashAuthScreen();
  }
}
