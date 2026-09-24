class PlayerModel {
  final String userId;
  final String name;
  final String profileImageUrl;
  final String socketId;
  final bool isCreator;
  final bool isReady;
  final List<int> bingoCard;

  PlayerModel({
    required this.userId,
    required this.name,
    this.profileImageUrl = '',
    this.socketId = '',
    this.isCreator = false,
    this.isReady = true,
    this.bingoCard = const [],
  });

  factory PlayerModel.fromJson(Map<String, dynamic> json) {
    List<int> card = [];
    if (json['bingoCard'] != null && json['bingoCard'] is List) {
      card = (json['bingoCard'] as List).map((e) => (e as num).toInt()).toList();
    }
    return PlayerModel(
      userId: json['userId']?.toString().toUpperCase() ?? '',
      name: json['name']?.toString() ?? 'Player',
      profileImageUrl: json['profileImageUrl']?.toString() ?? '',
      socketId: json['socketId']?.toString() ?? '',
      isCreator: json['isCreator'] == true,
      isReady: json['isReady'] != false,
      bingoCard: card,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'name': name,
      'profileImageUrl': profileImageUrl,
      'socketId': socketId,
      'isCreator': isCreator,
      'isReady': isReady,
      'bingoCard': bingoCard,
    };
  }
}

class WinnerModel {
  final int position;
  final String userId;
  final String name;
  final String profileImageUrl;
  final int timeTakenSeconds;
  final String timeDisplay;

  WinnerModel({
    required this.position,
    required this.userId,
    required this.name,
    this.profileImageUrl = '',
    this.timeTakenSeconds = 0,
    this.timeDisplay = '',
  });

  factory WinnerModel.fromJson(Map<String, dynamic> json) {
    return WinnerModel(
      position: (json['position'] is num) ? (json['position'] as num).toInt() : 1,
      userId: json['userId']?.toString().toUpperCase() ?? '',
      name: json['name']?.toString() ?? 'Player',
      profileImageUrl: json['profileImageUrl']?.toString() ?? '',
      timeTakenSeconds: (json['timeTakenSeconds'] is num) ? (json['timeTakenSeconds'] as num).toInt() : 0,
      timeDisplay: json['timeDisplay']?.toString() ?? '',
    );
  }
}

class RoomModel {
  final String roomId;
  final String name;
  final String creatorId;
  final String creatorName;
  final int capacity;
  final bool isPublic;
  final bool hasPassword;
  final String gameType; // 'bingo', 'sos', 'liars_bar'
  final int boardSize;
  final String liarsMode; // 'deck', 'dice'
  final String liarsDeckVariant; // 'standard', 'devil', 'chaos'
  final String status; // 'waiting', 'playing', 'finished'
  final List<PlayerModel> players;
  final Map<String, dynamic> gameData;

  RoomModel({
    required this.roomId,
    required this.name,
    required this.creatorId,
    required this.creatorName,
    required this.capacity,
    required this.isPublic,
    this.hasPassword = false,
    this.gameType = 'bingo',
    this.boardSize = 5,
    this.liarsMode = 'deck',
    this.liarsDeckVariant = 'standard',
    this.status = 'waiting',
    this.players = const [],
    this.gameData = const {},
  });

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    List<PlayerModel> pList = [];
    if (json['players'] != null && json['players'] is List) {
      pList = (json['players'] as List)
          .map((p) => PlayerModel.fromJson(Map<String, dynamic>.from(p)))
          .toList();
    }

    return RoomModel(
      roomId: json['roomId']?.toString().toUpperCase() ?? '',
      name: json['name']?.toString() ?? 'Room',
      creatorId: json['creatorId']?.toString().toUpperCase() ?? '',
      creatorName: json['creatorName']?.toString() ?? 'Host',
      capacity: (json['capacity'] is num) ? (json['capacity'] as num).toInt() : 4,
      isPublic: json['isPublic'] != false,
      hasPassword: json['hasPassword'] == true || (json['password'] != null && json['password'].toString().isNotEmpty),
      gameType: json['gameType']?.toString().toLowerCase() ?? 'bingo',
      boardSize: (json['boardSize'] is num) ? (json['boardSize'] as num).toInt() : 5,
      liarsMode: json['liarsMode']?.toString().toLowerCase() ?? 'deck',
      liarsDeckVariant: json['liarsDeckVariant']?.toString().toLowerCase() ?? 'standard',
      status: json['status']?.toString().toLowerCase() ?? 'waiting',
      players: pList,
      gameData: json['gameData'] != null && json['gameData'] is Map
          ? Map<String, dynamic>.from(json['gameData'])
          : {},
    );
  }

  RoomModel copyWith({
    String? status,
    List<PlayerModel>? players,
    Map<String, dynamic>? gameData,
  }) {
    return RoomModel(
      roomId: roomId,
      name: name,
      creatorId: creatorId,
      creatorName: creatorName,
      capacity: capacity,
      isPublic: isPublic,
      hasPassword: hasPassword,
      gameType: gameType,
      boardSize: boardSize,
      liarsMode: liarsMode,
      liarsDeckVariant: liarsDeckVariant,
      status: status ?? this.status,
      players: players ?? this.players,
      gameData: gameData ?? this.gameData,
    );
  }
}
