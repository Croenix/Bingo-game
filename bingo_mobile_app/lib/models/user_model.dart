class UserModel {
  final String id;
  final String userId;
  final String name;
  final String username;
  final String gmailId;
  final String deviceId;
  final int coins;
  final int gems;
  final String profileImageUrl;

  UserModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.username,
    required this.gmailId,
    required this.deviceId,
    required this.coins,
    required this.gems,
    required this.profileImageUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final uId = json['userId'] ?? json['id'] ?? 'BGO-0000';
    final nameVal = json['name'] ?? json['username'] ?? 'Player';
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      userId: uId,
      name: nameVal,
      username: json['username'] ?? nameVal,
      gmailId: json['gmailId'] ?? '',
      deviceId: json['deviceId'] ?? '',
      coins: (json['coins'] is num) ? (json['coins'] as num).toInt() : 1000,
      gems: (json['gems'] is num) ? (json['gems'] as num).toInt() : 0,
      profileImageUrl: json['profileImageUrl'] ??
          'https://api.dicebear.com/7.x/bottts/svg?seed=$uId',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'userId': userId,
      'name': name,
      'username': username,
      'gmailId': gmailId,
      'deviceId': deviceId,
      'coins': coins,
      'gems': gems,
      'profileImageUrl': profileImageUrl,
    };
  }

  UserModel copyWith({
    String? name,
    String? username,
    String? gmailId,
    int? coins,
    int? gems,
    String? profileImageUrl,
  }) {
    return UserModel(
      id: id,
      userId: userId,
      name: name ?? this.name,
      username: username ?? this.username,
      gmailId: gmailId ?? this.gmailId,
      deviceId: deviceId,
      coins: coins ?? this.coins,
      gems: gems ?? this.gems,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
    );
  }
}
