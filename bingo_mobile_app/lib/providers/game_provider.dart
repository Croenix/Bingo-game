import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../models/room_model.dart';
import '../models/challenge_model.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class GameProvider with ChangeNotifier {
  final SocketService _socketService = SocketService();
  SocketService get socketService => _socketService;

  UserModel? _currentUser;
  String _deviceId = '';
  bool _soundEnabled = true;
  bool _isLoading = false;
  String? _errorMessage;

  List<ChallengeModel> _challenges = [];
  List<RoomModel> _publicRooms = [];

  // Active Room State
  RoomModel? _currentRoom;
  List<int> _myBingoCard = [];
  final Set<int> _markedIndexes = {};
  final Set<int> _pickedNumbers = {};
  int? _lastPickedNumber;
  String? _lastPickedBy;
  int _completedLinesCount = 0;
  List<bool> _bingoLetters = [false, false, false, false, false];
  bool _hasClaimedBingo = false;
  List<WinnerModel> _winners = [];

  // Turn State
  String? _currentTurnUserId;
  String? _currentTurnName;

  // SOS State
  List<List<dynamic>> _sosGrid = [];
  Map<String, int> _sosScores = {};
  Map<String, dynamic> _sosPlayerLetters = {};
  List<dynamic> _sosCompletedLines = [];
  String _selectedSosLetter = 'S';

  // Liar's Bar State
  String _liarsTableRank = "KING'S TABLE";
  List<String> _liarsMyHand = [];
  final Set<int> _liarsSelectedCardIndices = {};
  int _liarsCenterPileCount = 0;
  Map<String, dynamic>? _liarsLastPlay;
  Map<String, dynamic>? _liarsPendingRoulette;
  List<String> _liarsRevealedCards = [];
  bool _liarsIsAlive = true;
  int _liarsChambersLeft = 6;

  StreamSubscription? _subCreated;
  StreamSubscription? _subJoined;
  StreamSubscription? _subPlayerJoined;
  StreamSubscription? _subPlayerLeft;
  StreamSubscription? _subRoomDeleted;
  StreamSubscription? _subGameStarted;
  StreamSubscription? _subNumberPicked;
  StreamSubscription? _subCardAssigned;
  StreamSubscription? _subBingoClaimed;
  StreamSubscription? _subSosMove;
  StreamSubscription? _subSosEnded;
  StreamSubscription? _subLiarsPlayed;
  StreamSubscription? _subLiarsChallenge;
  StreamSubscription? _subLiarsRoulette;
  StreamSubscription? _subBalance;
  StreamSubscription? _subError;

  // Getters
  UserModel? get currentUser => _currentUser;
  String get deviceId => _deviceId;
  bool get soundEnabled => _soundEnabled;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<ChallengeModel> get challenges => _challenges;
  List<RoomModel> get publicRooms => _publicRooms;

  RoomModel? get currentRoom => _currentRoom;
  List<int> get myBingoCard => _myBingoCard;
  Set<int> get markedIndexes => _markedIndexes;
  Set<int> get pickedNumbers => _pickedNumbers;
  int? get lastPickedNumber => _lastPickedNumber;
  String? get lastPickedBy => _lastPickedBy;
  int get completedLinesCount => _completedLinesCount;
  List<bool> get bingoLetters => _bingoLetters;
  bool get hasClaimedBingo => _hasClaimedBingo;
  List<WinnerModel> get winners => _winners;

  String? get currentTurnUserId => _currentTurnUserId;
  String? get currentTurnName => _currentTurnName;
  bool get isMyTurn =>
      _currentUser != null &&
      _currentTurnUserId != null &&
      _currentUser!.userId.toUpperCase() == _currentTurnUserId!.toUpperCase();

  bool get isHost =>
      _currentUser != null &&
      _currentRoom != null &&
      _currentUser!.userId.toUpperCase() == _currentRoom!.creatorId.toUpperCase();

  // SOS Getters
  List<List<dynamic>> get sosGrid => _sosGrid;
  Map<String, int> get sosScores => _sosScores;
  Map<String, dynamic> get sosPlayerLetters => _sosPlayerLetters;
  List<dynamic> get sosCompletedLines => _sosCompletedLines;
  String get selectedSosLetter => _selectedSosLetter;

  // Liar's Bar Getters
  String get liarsTableRank => _liarsTableRank;
  List<String> get liarsMyHand => _liarsMyHand;
  Set<int> get liarsSelectedCardIndices => _liarsSelectedCardIndices;
  int get liarsCenterPileCount => _liarsCenterPileCount;
  Map<String, dynamic>? get liarsLastPlay => _liarsLastPlay;
  Map<String, dynamic>? get liarsPendingRoulette => _liarsPendingRoulette;
  List<String> get liarsRevealedCards => _liarsRevealedCards;
  bool get liarsIsAlive => _liarsIsAlive;
  int get liarsChambersLeft => _liarsChambersLeft;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    await ApiService.initBaseUrl();
    await _initDeviceId();
    _socketService.connect();
    _setupSocketListeners();

    await autoRestoreUserSession();
    await fetchChallenges();
    await fetchPublicRooms();

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _initDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? storedId = prefs.getString('bingo_v2_device_id');
    if (storedId == null || storedId.isEmpty) {
      final rand = Random();
      storedId =
          'app_${rand.nextInt(9999999).toRadixString(36)}_${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';
      await prefs.setString('bingo_v2_device_id', storedId);
    }
    _deviceId = storedId;
    _soundEnabled = prefs.getBool('sound_enabled') ?? true;
  }

  Future<void> toggleSound() async {
    _soundEnabled = !_soundEnabled;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('sound_enabled', _soundEnabled);
    notifyListeners();
  }

  Future<void> autoRestoreUserSession() async {
    if (_deviceId.isEmpty) return;
    try {
      final user = await ApiService.getUserByDeviceId(_deviceId);
      if (user != null) {
        _currentUser = user;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> loginOrRegister({
    required String gmailId,
    required String username,
    String password = '',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await ApiService.registerOrLogin(
        gmailId: gmailId,
        username: username,
        password: password,
        deviceId: _deviceId,
      );
      _currentUser = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void logout() {
    _currentUser = null;
    notifyListeners();
  }

  Future<void> fetchChallenges() async {
    _challenges = await ApiService.fetchChallenges();
    notifyListeners();
  }

  Future<void> fetchPublicRooms() async {
    _publicRooms = await ApiService.fetchPublicRooms();
    notifyListeners();
  }

  void _setupSocketListeners() {
    _subCreated = _socketService.onRoomCreated.listen((data) {
      _handleRoomJoined(data);
    });

    _subJoined = _socketService.onRoomJoined.listen((data) {
      _handleRoomJoined(data);
    });

    _subPlayerJoined = _socketService.onPlayerJoined.listen((data) {
      if (_currentRoom != null && data['players'] != null) {
        final List<PlayerModel> pList = (data['players'] as List)
            .map((p) => PlayerModel.fromJson(Map<String, dynamic>.from(p)))
            .toList();
        _currentRoom = _currentRoom!.copyWith(players: pList);
        notifyListeners();
      }
    });

    _subPlayerLeft = _socketService.onPlayerLeft.listen((data) {
      if (_currentRoom != null && data['players'] != null) {
        final List<PlayerModel> pList = (data['players'] as List)
            .map((p) => PlayerModel.fromJson(Map<String, dynamic>.from(p)))
            .toList();
        _currentRoom = _currentRoom!.copyWith(players: pList);
        notifyListeners();
      }
    });

    _subRoomDeleted = _socketService.onRoomDeleted.listen((data) {
      _errorMessage = data['reason'] ?? 'Room was closed';
      _currentRoom = null;
      notifyListeners();
      fetchPublicRooms();
    });

    _subGameStarted = _socketService.onGameStarted.listen((data) {
      if (_currentRoom != null) {
        _currentRoom = _currentRoom!.copyWith(status: 'playing');
      }
      _currentTurnUserId = data['currentTurnUserId']?.toString();
      _currentTurnName = data['currentTurnName']?.toString();

      final gameData = data['gameData'] ?? {};
      final gameType = data['gameType'] ?? _currentRoom?.gameType ?? 'bingo';

      if (gameType == 'sos') {
        final size = data['boardSize'] ?? 5;
        _sosGrid = List.generate(size, (_) => List.filled(size, ''));
        if (data['grid'] != null && data['grid'] is List) {
          _sosGrid = List<List<dynamic>>.from(
            (data['grid'] as List).map((row) => List<dynamic>.from(row)),
          );
        }
        _sosScores = (data['scores'] != null && data['scores'] is Map)
            ? Map<String, int>.from(data['scores'])
            : {};
        _sosPlayerLetters = (data['playerLetters'] != null && data['playerLetters'] is Map)
            ? Map<String, dynamic>.from(data['playerLetters'])
            : {};
        _sosCompletedLines = data['completedSOS'] ?? [];
      } else if (gameType == 'liars_bar') {
        _liarsTableRank = gameData['tableRank']?.toString() ?? "KING'S TABLE";
        if (gameData['playerHands'] != null && _currentUser != null) {
          final hand = gameData['playerHands'][_currentUser!.userId];
          if (hand != null && hand is List) {
            _liarsMyHand = List<String>.from(hand);
          }
        }
        _liarsIsAlive = true;
        _liarsChambersLeft = 6;
        _liarsCenterPileCount = 0;
        _liarsLastPlay = null;
        _liarsPendingRoulette = null;
      }

      notifyListeners();
    });

    _subCardAssigned = _socketService.onBingoCardAssigned.listen((data) {
      if (data['bingoCard'] != null && data['bingoCard'] is List) {
        _myBingoCard = (data['bingoCard'] as List).map((e) => (e as num).toInt()).toList();
        _markedIndexes.clear();
        _pickedNumbers.clear();
        _completedLinesCount = 0;
        _bingoLetters = [false, false, false, false, false];
        _hasClaimedBingo = false;
        notifyListeners();
      }
    });

    _subNumberPicked = _socketService.onNumberPicked.listen((data) {
      final numVal = data['number'] as int?;
      if (numVal != null) {
        _lastPickedNumber = numVal;
        _lastPickedBy = data['pickedBy']?.toString() ?? 'Player';
        _pickedNumbers.add(numVal);

        // Auto mark on ticket
        final idx = _myBingoCard.indexOf(numVal);
        if (idx != -1) {
          _markedIndexes.add(idx);
          _calculateBingoProgress();
        }
      }

      _currentTurnUserId = data['nextTurnUserId']?.toString();
      _currentTurnName = data['nextTurnName']?.toString();
      notifyListeners();
    });

    _subBingoClaimed = _socketService.onBingoClaimed.listen((data) {
      if (data['leaderboard'] != null && data['leaderboard'] is List) {
        _winners = (data['leaderboard'] as List)
            .map((w) => WinnerModel.fromJson(Map<String, dynamic>.from(w)))
            .toList();
      }
      if (_currentRoom != null) {
        _currentRoom = _currentRoom!.copyWith(status: 'finished');
      }
      notifyListeners();
    });

    // SOS Move Made
    _subSosMove = _socketService.onSosMoveMade.listen((data) {
      final r = data['row'] as int?;
      final c = data['col'] as int?;
      if (r != null && c != null && _sosGrid.isNotEmpty && r < _sosGrid.length) {
        _sosGrid[r][c] = {
          'letter': data['letter'] ?? 'S',
          'letterId': data['letterId'] ?? 'S',
          'color': data['color'] ?? '#38bdf8',
          'placedBy': data['placedBy'] ?? '',
          'playerName': data['playerName'] ?? '',
        };
      }
      if (data['scores'] != null) {
        _sosScores = Map<String, int>.from(data['scores']);
      }
      if (data['completedSOS'] != null) {
        _sosCompletedLines = List<dynamic>.from(data['completedSOS']);
      }
      _currentTurnUserId = data['nextTurnUserId']?.toString();
      _currentTurnName = data['nextTurnName']?.toString();
      notifyListeners();
    });

    // SOS Game Ended
    _subSosEnded = _socketService.onSosGameEnded.listen((data) {
      if (_currentRoom != null) {
        _currentRoom = _currentRoom!.copyWith(status: 'finished');
      }
      notifyListeners();
    });

    // Liar's Bar Played Cards
    _subLiarsPlayed = _socketService.onLiarsCardsPlayed.listen((data) {
      _liarsCenterPileCount += (data['count'] as num?)?.toInt() ?? 1;
      _liarsLastPlay = {
        'playedBy': data['playedBy'],
        'count': data['count'],
        'tableRank': data['tableRank'],
      };
      _currentTurnUserId = data['nextTurnUserId']?.toString();
      _currentTurnName = data['nextTurnName']?.toString();
      _liarsSelectedCardIndices.clear();
      notifyListeners();
    });

    // Liar's Bar Challenge Resolved
    _subLiarsChallenge = _socketService.onLiarsChallengeResolved.listen((data) {
      _liarsRevealedCards = List<String>.from(data['revealedCards'] ?? []);
      _liarsPendingRoulette = Map<String, dynamic>.from(data);
      notifyListeners();
    });

    // Liar's Bar Roulette Result
    _subLiarsRoulette = _socketService.onLiarsRouletteResult.listen((data) {
      final isEliminated = data['isEliminated'] == true;
      final targetUserId = data['targetUserId']?.toString();
      if (targetUserId == _currentUser?.userId && isEliminated) {
        _liarsIsAlive = false;
      }
      _liarsPendingRoulette = null;
      _currentTurnUserId = data['nextTurnUserId']?.toString();
      _currentTurnName = data['nextTurnName']?.toString();
      notifyListeners();
    });

    // Balance update
    _subBalance = _socketService.onBalanceUpdated.listen((data) {
      if (_currentUser != null) {
        final newCoins = (data['coins'] as num?)?.toInt() ?? _currentUser!.coins;
        final newGems = (data['gems'] as num?)?.toInt() ?? _currentUser!.gems;
        _currentUser = _currentUser!.copyWith(coins: newCoins, gems: newGems);
        notifyListeners();
      }
    });

    _subError = _socketService.onError.listen((err) {
      _errorMessage = err;
      notifyListeners();
    });
  }

  void _handleRoomJoined(Map<String, dynamic> data) {
    if (data['room'] != null) {
      _currentRoom = RoomModel.fromJson(Map<String, dynamic>.from(data['room']));
    }
    if (data['myBingoCard'] != null && data['myBingoCard'] is List) {
      _myBingoCard = (data['myBingoCard'] as List).map((e) => (e as num).toInt()).toList();
    } else if (_myBingoCard.isEmpty) {
      _generateDefaultBingoCard();
    }

    _markedIndexes.clear();
    _pickedNumbers.clear();
    _completedLinesCount = 0;
    _bingoLetters = [false, false, false, false, false];
    _hasClaimedBingo = false;
    _winners.clear();

    notifyListeners();
  }

  void _generateDefaultBingoCard() {
    List<int> numbers = List.generate(25, (index) => index + 1);
    numbers.shuffle();
    _myBingoCard = numbers;
  }

  void _calculateBingoProgress() {
    int lines = 0;
    // 5 Rows
    for (int r = 0; r < 5; r++) {
      bool full = true;
      for (int c = 0; c < 5; c++) {
        if (!_markedIndexes.contains(r * 5 + c)) {
          full = false;
          break;
        }
      }
      if (full) lines++;
    }

    // 5 Cols
    for (int c = 0; c < 5; c++) {
      bool full = true;
      for (int r = 0; r < 5; r++) {
        if (!_markedIndexes.contains(r * 5 + c)) {
          full = false;
          break;
        }
      }
      if (full) lines++;
    }

    // 2 Diagonals
    if ([0, 6, 12, 18, 24].every((i) => _markedIndexes.contains(i))) lines++;
    if ([4, 8, 12, 16, 20].every((i) => _markedIndexes.contains(i))) lines++;

    _completedLinesCount = min(lines, 5);
    _bingoLetters = List.generate(5, (index) => index < _completedLinesCount);

    if (_completedLinesCount >= 5 && !_hasClaimedBingo && _currentRoom != null && _currentUser != null) {
      _hasClaimedBingo = true;
      _socketService.claimBingo(roomId: _currentRoom!.roomId, userId: _currentUser!.userId);
    }
  }

  // --- UI Action Methods ---

  void createRoom({
    required String roomName,
    required int capacity,
    String? customRoomId,
    String password = '',
    bool isPublic = true,
    String gameType = 'bingo',
    int boardSize = 5,
    String liarsMode = 'deck',
    String liarsDeckVariant = 'standard',
    String? challengeId,
  }) {
    if (_currentUser == null) return;
    _socketService.createRoom(
      userId: _currentUser!.userId,
      userName: _currentUser!.name,
      roomName: roomName,
      capacity: capacity,
      customRoomId: customRoomId,
      password: password,
      isPublic: isPublic,
      gameType: gameType,
      boardSize: boardSize,
      liarsMode: liarsMode,
      liarsDeckVariant: liarsDeckVariant,
      challengeId: challengeId,
    );
  }

  void joinRoom({required String roomId, String password = ''}) {
    if (_currentUser == null) return;
    _socketService.joinRoom(
      roomId: roomId,
      userId: _currentUser!.userId,
      userName: _currentUser!.name,
      password: password,
      profileImageUrl: _currentUser!.profileImageUrl,
    );
  }

  void leaveRoom() {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.leaveRoom(roomId: _currentRoom!.roomId, userId: _currentUser!.userId);
    _currentRoom = null;
    notifyListeners();
  }

  void startGame() {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.startGame(roomId: _currentRoom!.roomId, userId: _currentUser!.userId);
  }

  void pickBingoNumber(int number) {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.pickNumber(roomId: _currentRoom!.roomId, userId: _currentUser!.userId, number: number);
  }

  void selectSosLetter(String letter) {
    _selectedSosLetter = letter;
    notifyListeners();
  }

  void makeSosMove(int row, int col) {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.makeSosMove(
      roomId: _currentRoom!.roomId,
      userId: _currentUser!.userId,
      row: row,
      col: col,
      letter: _selectedSosLetter,
    );
  }

  void toggleLiarsCardSelection(int index) {
    if (_liarsSelectedCardIndices.contains(index)) {
      _liarsSelectedCardIndices.remove(index);
    } else {
      if (_liarsSelectedCardIndices.length < 3) {
        _liarsSelectedCardIndices.add(index);
      }
    }
    notifyListeners();
  }

  void playSelectedLiarsCards() {
    if (_currentUser == null || _currentRoom == null || _liarsSelectedCardIndices.isEmpty) return;
    final indexes = _liarsSelectedCardIndices.toList();
    _socketService.playLiarsCards(
      roomId: _currentRoom!.roomId,
      userId: _currentUser!.userId,
      cardIndexes: indexes,
    );
    // Locally remove played cards
    final sorted = [...indexes]..sort((a, b) => b.compareTo(a));
    for (final idx in sorted) {
      if (idx < _liarsMyHand.length) {
        _liarsMyHand.removeAt(idx);
      }
    }
    _liarsSelectedCardIndices.clear();
    notifyListeners();
  }

  void callLiarsChallenge() {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.callLiarsChallenge(
      roomId: _currentRoom!.roomId,
      userId: _currentUser!.userId,
    );
  }

  void triggerLiarsRoulette() {
    if (_currentUser == null || _currentRoom == null) return;
    _socketService.triggerLiarsRoulette(
      roomId: _currentRoom!.roomId,
      userId: _currentUser!.userId,
    );
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _subCreated?.cancel();
    _subJoined?.cancel();
    _subPlayerJoined?.cancel();
    _subPlayerLeft?.cancel();
    _subRoomDeleted?.cancel();
    _subGameStarted?.cancel();
    _subNumberPicked?.cancel();
    _subCardAssigned?.cancel();
    _subBingoClaimed?.cancel();
    _subSosMove?.cancel();
    _subSosEnded?.cancel();
    _subLiarsPlayed?.cancel();
    _subLiarsChallenge?.cancel();
    _subLiarsRoulette?.cancel();
    _subBalance?.cancel();
    _subError?.cancel();
    _socketService.disconnect();
    super.dispose();
  }
}
