import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:permission_handler/permission_handler.dart';
import 'api_service.dart';

class AgoraVoiceService extends ChangeNotifier {
  static final AgoraVoiceService _instance = AgoraVoiceService._internal();
  factory AgoraVoiceService() => _instance;
  AgoraVoiceService._internal();

  RtcEngine? _engine;
  String? _currentChannelId;
  int _localNumericUid = 0;

  bool _isInitialized = false;
  bool _isJoined = false;
  bool _isMicMuted = false;
  bool _isSpeakerMuted = false;
  bool _isConnecting = false;

  final Set<int> _remoteUids = {};
  final Map<int, int> _speakingVolumes = {}; // uid -> volume level (0-255)

  // Getters
  bool get isInitialized => _isInitialized;
  bool get isJoined => _isJoined;
  bool get isMicMuted => _isMicMuted;
  bool get isSpeakerMuted => _isSpeakerMuted;
  bool get isConnecting => _isConnecting;
  String? get currentChannelId => _currentChannelId;
  int get localNumericUid => _localNumericUid;
  Set<int> get remoteUids => Set.unmodifiable(_remoteUids);
  Map<int, int> get speakingVolumes => Map.unmodifiable(_speakingVolumes);

  /// Converts any string userId to a deterministic positive 31-bit integer UID
  static int getNumericUid(String userId) {
    if (userId.trim().isEmpty) {
      return DateTime.now().millisecondsSinceEpoch % 1000000 + 1;
    }
    int hash = 0;
    final clean = userId.trim().toUpperCase();
    for (int i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.codeUnitAt(i)) & 0x7FFFFFFF;
    }
    return hash == 0 ? 1 : hash;
  }

  /// Request microphone permission
  Future<bool> requestMicPermission() async {
    if (kIsWeb) return true;
    try {
      final status = await Permission.microphone.request();
      return status.isGranted;
    } catch (e) {
      debugPrint('[AgoraVoice] Permission check error: $e');
      return true;
    }
  }

  /// Join Agora Voice Channel for a room
  Future<bool> joinRoomVoiceChannel({
    required String roomId,
    required String userId,
  }) async {
    if (roomId.trim().isEmpty) return false;

    final channelName = roomId.trim().toUpperCase();
    _localNumericUid = getNumericUid(userId);

    // If already in this channel and connected, nothing to do
    if (_isJoined && _currentChannelId == channelName && _engine != null) {
      return true;
    }

    _isConnecting = true;
    notifyListeners();

    try {
      await leaveChannel();

      // Request microphone permissions
      final hasMic = await requestMicPermission();
      if (!hasMic) {
        debugPrint('[AgoraVoice] Microphone permission not granted');
      }

      // 1. Fetch dynamic Agora configuration and token exclusively from the server API
      final tokenRes = await ApiService.fetchAgoraToken(
        channelName: channelName,
        uid: _localNumericUid,
      );

      if (tokenRes == null ||
          tokenRes['ok'] != true ||
          tokenRes['appId'] == null ||
          (tokenRes['appId'] as String).trim().isEmpty) {
        debugPrint('[AgoraVoice] Agora credentials not configured on backend server (.env AGORA_APP_ID)');
        _isConnecting = false;
        notifyListeners();
        return false;
      }

      final String appId = (tokenRes['appId'] as String).trim();
      final String? token = tokenRes['token'];

      // 2. Create and initialize RtcEngine using server-provided App ID
      _engine = createAgoraRtcEngine();
      await _engine!.initialize(
        RtcEngineContext(
          appId: appId,
          channelProfile: ChannelProfileType.channelProfileCommunication,
        ),
      );

      _isInitialized = true;

      // Register event listeners
      _engine!.registerEventHandler(
        RtcEngineEventHandler(
          onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
            debugPrint('[AgoraVoice] Joined channel: ${connection.channelId} with UID: ${connection.localUid}');
            _isJoined = true;
            _isConnecting = false;
            _currentChannelId = connection.channelId;
            notifyListeners();
          },
          onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
            debugPrint('[AgoraVoice] Remote user joined: $remoteUid');
            _remoteUids.add(remoteUid);
            notifyListeners();
          },
          onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
            debugPrint('[AgoraVoice] Remote user left: $remoteUid');
            _remoteUids.remove(remoteUid);
            _speakingVolumes.remove(remoteUid);
            notifyListeners();
          },
          onAudioVolumeIndication: (RtcConnection connection, List<AudioVolumeInfo> speakers, int totalVolume, int speakerNumber) {
            _speakingVolumes.clear();
            for (final speaker in speakers) {
              if (speaker.uid != null && speaker.volume != null && speaker.volume! > 5) {
                final uidKey = speaker.uid == 0 ? _localNumericUid : speaker.uid!;
                _speakingVolumes[uidKey] = speaker.volume!;
              }
            }
            notifyListeners();
          },
          onTokenPrivilegeWillExpire: (RtcConnection connection, String token) async {
            debugPrint('[AgoraVoice] Token privilege will expire, renewing token...');
            try {
              final renewRes = await ApiService.fetchAgoraToken(
                channelName: channelName,
                uid: _localNumericUid,
              );
              if (renewRes != null && renewRes['token'] != null) {
                await _engine?.renewToken(renewRes['token']);
              }
            } catch (e) {
              debugPrint('[AgoraVoice] Token renew error: $e');
            }
          },
          onError: (ErrorCodeType err, String msg) {
            debugPrint('[AgoraVoice] RTC Error: $err - $msg');
          },
        ),
      );

      // Enable audio and volume indication
      await _engine!.enableAudio();
      await _engine!.enableAudioVolumeIndication(
        interval: 250,
        smooth: 3,
        reportVad: true,
      );

      // Set audio scenario for high quality game voice chat
      await _engine!.setAudioProfile(
        profile: AudioProfileType.audioProfileDefault,
        scenario: AudioScenarioType.audioScenarioGameStreaming,
      );

      // Join the RTC channel
      const options = ChannelMediaOptions(
        clientRoleType: ClientRoleType.clientRoleBroadcaster,
        channelProfile: ChannelProfileType.channelProfileCommunication,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      );

      await _engine!.joinChannel(
        token: token ?? '',
        channelId: channelName,
        uid: _localNumericUid,
        options: options,
      );

      _isMicMuted = false;
      _isSpeakerMuted = false;
      _currentChannelId = channelName;
      _isConnecting = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[AgoraVoice] Failed to join voice channel: $e');
      _isConnecting = false;
      _isJoined = false;
      notifyListeners();
      return false;
    }
  }

  /// Toggle Microphone Mute State
  Future<bool> toggleMic() async {
    if (_engine == null || !_isJoined) return false;
    _isMicMuted = !_isMicMuted;
    try {
      await _engine!.muteLocalAudioStream(_isMicMuted);
      notifyListeners();
      return _isMicMuted;
    } catch (e) {
      debugPrint('[AgoraVoice] Error toggling mic: $e');
      return _isMicMuted;
    }
  }

  /// Toggle Speaker Mute State
  Future<bool> toggleSpeaker() async {
    if (_engine == null || !_isJoined) return false;
    _isSpeakerMuted = !_isSpeakerMuted;
    try {
      await _engine!.muteAllRemoteAudioStreams(_isSpeakerMuted);
      notifyListeners();
      return _isSpeakerMuted;
    } catch (e) {
      debugPrint('[AgoraVoice] Error toggling speaker: $e');
      return _isSpeakerMuted;
    }
  }

  /// Check if a user is currently speaking
  bool isSpeaking(dynamic identifier) {
    if (identifier == null) return false;
    int numericUid;
    if (identifier is int) {
      numericUid = identifier;
    } else {
      numericUid = getNumericUid(identifier.toString());
    }
    return (_speakingVolumes[numericUid] ?? 0) > 10;
  }

  /// Leave the voice channel and release resources
  Future<void> leaveChannel() async {
    _currentChannelId = null;
    _isJoined = false;
    _isConnecting = false;
    _remoteUids.clear();
    _speakingVolumes.clear();

    if (_engine != null) {
      try {
        await _engine!.leaveChannel();
        await _engine!.release();
      } catch (e) {
        debugPrint('[AgoraVoice] Error releasing engine: $e');
      }
      _engine = null;
    }

    _isInitialized = false;
    notifyListeners();
  }
}
