class ChallengeModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final int entryCoin;
  final String entryCurrencyType;
  final int rewardCoin;
  final String rewardCurrencyType;
  final int maxPlayers;
  final String gradientStart;
  final String gradientEnd;
  final String icon;
  final bool isActive;

  ChallengeModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.entryCoin,
    this.entryCurrencyType = 'coins',
    required this.rewardCoin,
    this.rewardCurrencyType = 'coins',
    this.maxPlayers = 4,
    this.gradientStart = '#6366F1',
    this.gradientEnd = '#8B5CF6',
    this.icon = '🎯',
    this.isActive = true,
  });

  factory ChallengeModel.fromJson(Map<String, dynamic> json) {
    return ChallengeModel(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? 'Challenge',
      description: json['description'] ?? '',
      category: json['category'] ?? 'Standard',
      entryCoin: (json['entryCoin'] is num) ? (json['entryCoin'] as num).toInt() : 0,
      entryCurrencyType: json['entryCurrencyType'] ?? 'coins',
      rewardCoin: (json['rewardCoin'] is num) ? (json['rewardCoin'] as num).toInt() : 0,
      rewardCurrencyType: json['rewardCurrencyType'] ?? 'coins',
      maxPlayers: (json['maxPlayers'] is num) ? (json['maxPlayers'] as num).toInt() : 4,
      gradientStart: json['gradientStart'] ?? '#6366F1',
      gradientEnd: json['gradientEnd'] ?? '#8B5CF6',
      icon: json['icon'] ?? '🎯',
      isActive: json['isActive'] != false,
    );
  }
}
