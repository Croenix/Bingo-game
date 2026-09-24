import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import 'api_service.dart';

class SocketService {
  socket_io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;
  String? get socketId => _socket?.id;

  // Event stream controllers for UI and Provider subscriptions
  final _roomCreatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _roomJoinedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _playerJoinedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _playerLeftController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _roomDeletedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _gameStartedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _numberPickedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _bingoCardAssignedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _bingoClaimedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _sosMoveMadeController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _sosGameEndedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _liarsCardsPlayedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _liarsChallengeResolvedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _liarsRouletteResultController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _balanceUpdatedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _errorController = StreamController<String>.broadcast();

  Stream<Map<String, dynamic>> get onRoomCreated =>
      _roomCreatedController.stream;
  Stream<Map<String, dynamic>> get onRoomJoined => _roomJoinedController.stream;
  Stream<Map<String, dynamic>> get onPlayerJoined =>
      _playerJoinedController.stream;
  Stream<Map<String, dynamic>> get onPlayerLeft => _playerLeftController.stream;
  Stream<Map<String, dynamic>> get onRoomDeleted =>
      _roomDeletedController.stream;
  Stream<Map<String, dynamic>> get onGameStarted =>
      _gameStartedController.stream;
  Stream<Map<String, dynamic>> get onNumberPicked =>
      _numberPickedController.stream;
  Stream<Map<String, dynamic>> get onBingoCardAssigned =>
      _bingoCardAssignedController.stream;
  Stream<Map<String, dynamic>> get onBingoClaimed =>
      _bingoClaimedController.stream;
  Stream<Map<String, dynamic>> get onSosMoveMade =>
      _sosMoveMadeController.stream;
  Stream<Map<String, dynamic>> get onSosGameEnded =>
      _sosGameEndedController.stream;
  Stream<Map<String, dynamic>> get onLiarsCardsPlayed =>
      _liarsCardsPlayedController.stream;
  Stream<Map<String, dynamic>> get onLiarsChallengeResolved =>
      _liarsChallengeResolvedController.stream;
  Stream<Map<String, dynamic>> get onLiarsRouletteResult =>
      _liarsRouletteResultController.stream;
  Stream<Map<String, dynamic>> get onBalanceUpdated =>
      _balanceUpdatedController.stream;
  Stream<String> get onError => _errorController.stream;

  void connect() {
    if (_socket != null && _isConnected) return;

    final uri = ApiService.baseUrl;
    _socket = socket_io.io(
      uri,
      socket_io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      // print('⚡ Socket Connected: ${_socket?.id}');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      // print('❌ Socket Disconnected');
    });

    _socket!.onConnectError((err) {
      _isConnected = false;
    });

    // Register server event listeners
    _socket!.on('room_created', (data) {
      if (data is Map)
        _roomCreatedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room_joined', (data) {
      if (data is Map)
        _roomJoinedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('player_joined', (data) {
      if (data is Map)
        _playerJoinedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('player_left', (data) {
      if (data is Map)
        _playerLeftController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room_deleted', (data) {
      if (data is Map)
        _roomDeletedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('game_started', (data) {
      if (data is Map)
        _gameStartedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('number_picked', (data) {
      if (data is Map)
        _numberPickedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('bingo_card_assigned', (data) {
      if (data is Map)
        _bingoCardAssignedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('bingo_claimed', (data) {
      if (data is Map)
        _bingoClaimedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('sos_move_made', (data) {
      if (data is Map)
        _sosMoveMadeController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('sos_game_ended', (data) {
      if (data is Map)
        _sosGameEndedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('liars_cards_played', (data) {
      if (data is Map)
        _liarsCardsPlayedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('liars_challenge_resolved', (data) {
      if (data is Map)
        _liarsChallengeResolvedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('liars_roulette_result', (data) {
      if (data is Map)
        _liarsRouletteResultController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('user_balance_updated', (data) {
      if (data is Map)
        _balanceUpdatedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('room_error', (data) {
      if (data is Map && data['error'] != null) {
        _errorController.add(data['error'].toString());
      } else if (data is String) {
        _errorController.add(data);
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  // --- Emitters ---

  void createRoom({
    required String userId,
    required String userName,
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
    _socket?.emit('create_room', {
      'userId': userId,
      'userName': userName,
      'name': roomName,
      'roomName': roomName,
      'capacity': capacity,
      'customRoomId': customRoomId,
      'password': password,
      'isPublic': isPublic,
      'gameType': gameType,
      'boardSize': boardSize,
      'liarsMode': liarsMode,
      'liarsDeckVariant': liarsDeckVariant,
      'challengeId': ?challengeId,
    });
  }

  void joinRoom({
    required String roomId,
    required String userId,
    required String userName,
    String password = '',
    String profileImageUrl = '',
  }) {
    _socket?.emit('join_room', {
      'roomId': roomId,
      'userId': userId,
      'userName': userName,
      'password': password,
      'profileImageUrl': profileImageUrl,
    });
  }

  void leaveRoom({required String roomId, required String userId}) {
    _socket?.emit('leave_room', {'roomId': roomId, 'userId': userId});
  }

  void startGame({required String roomId, required String userId}) {
    _socket?.emit('start_game', {'roomId': roomId, 'userId': userId});
  }

  // Bingo Pick Number
  void pickNumber({
    required String roomId,
    required String userId,
    required int number,
  }) {
    _socket?.emit('pick_number', {
      'roomId': roomId,
      'userId': userId,
      'number': number,
    });
  }

  // Bingo Claim Win
  void claimBingo({required String roomId, required String userId}) {
    _socket?.emit('claim_bingo', {'roomId': roomId, 'userId': userId});
  }

  // SOS Move
  void makeSosMove({
    required String roomId,
    required String userId,
    required int row,
    required int col,
    required String letter,
  }) {
    _socket?.emit('sos_make_move', {
      'roomId': roomId,
      'userId': userId,
      'row': row,
      'col': col,
      'letter': letter,
    });
  }

  // Liar's Bar Play Cards
  void playLiarsCards({
    required String roomId,
    required String userId,
    required List<int> cardIndexes,
  }) {
    _socket?.emit('liars_play_cards', {
      'roomId': roomId,
      'userId': userId,
      'cardIndexes': cardIndexes,
    });
  }

  // Liar's Bar Challenge Liar
  void callLiarsChallenge({required String roomId, required String userId}) {
    _socket?.emit('liars_call_liar_deck', {'roomId': roomId, 'userId': userId});
  }

  // Liar's Bar Trigger Russian Roulette
  void triggerLiarsRoulette({required String roomId, required String userId}) {
    _socket?.emit('liars_trigger_roulette', {
      'roomId': roomId,
      'userId': userId,
    });
  }
}
