import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/user_model.dart';
import '../models/room_model.dart';
import '../models/challenge_model.dart';

class ApiService {
  // Live Production Server URL
  static const String baseUrl = 'https://bingo-server-937q.onrender.com';

  static Future<void> initBaseUrl() async {
    // Fixed to live production server
  }

  // Health check
  static Future<bool> checkHealth() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/health'))
          .timeout(const Duration(seconds: 4));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // User Profile by Device ID
  static Future<UserModel?> getUserByDeviceId(String deviceId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/users/device/${Uri.encodeComponent(deviceId)}'),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true && data['user'] != null) {
          return UserModel.fromJson(data['user']);
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // Login / Register User
  static Future<UserModel> registerOrLogin({
    required String gmailId,
    required String username,
    String password = '',
    required String deviceId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/users'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'gmailId': gmailId,
        'username': username,
        'name': username,
        'password': password,
        'deviceId': deviceId,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 || response.statusCode == 201) {
      if (data['ok'] == true && data['user'] != null) {
        return UserModel.fromJson(data['user']);
      }
    }
    throw Exception(data['error'] ?? 'Failed to authenticate');
  }

  // Fetch Active Challenges
  static Future<List<ChallengeModel>> fetchChallenges() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/challenges'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['challenges'] != null && data['challenges'] is List) {
          return (data['challenges'] as List)
              .map((c) => ChallengeModel.fromJson(c))
              .toList();
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // Fetch Public Rooms
  static Future<List<RoomModel>> fetchPublicRooms() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/rooms'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['rooms'] != null && data['rooms'] is List) {
          return (data['rooms'] as List)
              .map((r) => RoomModel.fromJson(r))
              .toList();
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}
