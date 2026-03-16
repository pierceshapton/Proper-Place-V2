import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_service.dart';

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialized in this isolate if configured
  debugPrint('[Push] Background message: ${message.notification?.title}');
}

class PushNotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;
  static String? _deviceToken;

  /// Initialize push notifications. Call after Firebase.initializeApp().
  /// Returns false if Firebase is not configured (graceful degradation).
  static Future<bool> initialize() async {
    if (_initialized) return true;

    try {
      // Request permission
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        debugPrint('[Push] Notification permission denied');
        return false;
      }

      debugPrint('[Push] Permission status: ${settings.authorizationStatus}');

      // Set up background handler
      FirebaseMessaging.onBackgroundMessage(
          _firebaseMessagingBackgroundHandler);

      // Initialize local notifications for foreground display
      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );
      await _localNotifications.initialize(initSettings);

      // Create notification channel for Android
      const channel = AndroidNotificationChannel(
        'proper_place_notifications',
        'Proper Place',
        description: 'Notifications from Proper Place',
        importance: Importance.high,
      );
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle notification taps
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Get device token
      if (Platform.isIOS) {
        _deviceToken = await _messaging.getAPNSToken().timeout(
              const Duration(seconds: 5),
              onTimeout: () => null,
            );
        // FCM token is needed for sending via Firebase Admin
        _deviceToken = await _messaging.getToken();
      } else {
        _deviceToken = await _messaging.getToken();
      }

      debugPrint('[Push] Device token: ${_deviceToken?.substring(0, 20)}...');

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _deviceToken = newToken;
        _registerTokenWithBackend(newToken);
      });

      _initialized = true;
      return true;
    } catch (e) {
      debugPrint('[Push] Initialization failed: $e');
      return false;
    }
  }

  /// Register the device token with the backend. Call after login.
  static Future<void> registerToken() async {
    if (_deviceToken == null) {
      // Try to get token again
      try {
        _deviceToken = await _messaging.getToken();
      } catch (e) {
        debugPrint('[Push] Could not get device token: $e');
        return;
      }
    }
    if (_deviceToken != null) {
      await _registerTokenWithBackend(_deviceToken!);
    }
  }

  /// Remove device token from backend. Call on logout.
  static Future<void> unregisterToken() async {
    if (_deviceToken == null) return;
    try {
      await ApiService.delete(
        endpoint: '/auth/device-token',
        body: {'token': _deviceToken},
      );
      debugPrint('[Push] Device token unregistered');
    } catch (e) {
      debugPrint('[Push] Failed to unregister token: $e');
    }
  }

  static Future<void> _registerTokenWithBackend(String token) async {
    try {
      await ApiService.post(
        endpoint: '/auth/device-token',
        body: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
      );
      debugPrint('[Push] Device token registered with backend');
    } catch (e) {
      debugPrint('[Push] Failed to register token: $e');
    }
  }

  static void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('[Push] Foreground message: ${message.notification?.title}');

    final notification = message.notification;
    if (notification == null) return;

    // Show as local notification since app is in foreground
    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
        android: AndroidNotificationDetails(
          'proper_place_notifications',
          'Proper Place',
          channelDescription: 'Notifications from Proper Place',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
    );
  }

  static void _handleNotificationTap(RemoteMessage message) {
    debugPrint('[Push] Notification tapped: ${message.data}');
    // Navigation based on notification type can be added here
  }

  /// Get current device token (for debugging).
  static String? get deviceToken => _deviceToken;
}
