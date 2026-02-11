import 'package:flutter/material.dart';
import 'notification_service.dart';

/// Global notification state management
class NotificationManager extends ChangeNotifier {
  static final NotificationManager _instance = NotificationManager._internal();
  final NotificationService _notificationService = NotificationService();

  Map<String, int> _badgeCounts = {};
  bool _isLoading = false;

  factory NotificationManager() {
    return _instance;
  }

  NotificationManager._internal();

  Map<String, int> get badgeCounts => _badgeCounts;
  bool get isLoading => _isLoading;

  /// Load notification counts and notify listeners
  Future<void> loadNotificationCounts() async {
    try {
      _isLoading = true;
      notifyListeners();

      final counts = await _notificationService.getNotificationCounts();
      
      _badgeCounts = {
        'unreadMessages': (counts['unreadMessages'] as int?) ?? 0,
        'pendingBookings': (counts['pendingBookings'] as int?) ?? 0,
        'pendingHostApplications': (counts['pendingHostApplications'] as int?) ?? 0,
        'pendingApprovals': (counts['pendingApprovals'] as int?) ?? 0,
        'siteSubmissions': (counts['siteSubmissions'] as int?) ?? 0,
      };

      _isLoading = false;
      notifyListeners();
    } catch (error) {
      print('[NotificationManager] Error loading notification counts: $error');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Mark a message as read
  Future<void> markMessageAsRead(int messageId) async {
    try {
      await _notificationService.markMessageAsRead(messageId);
      // Refresh counts after marking message as read
      await loadNotificationCounts();
    } catch (error) {
      print('[NotificationManager] Error marking message as read: $error');
    }
  }

  /// Mark all messages from a sender as read
  Future<void> markAllMessagesFromSenderAsRead(int senderId) async {
    try {
      await _notificationService.markAllMessagesFromSenderAsRead(senderId);
      // Refresh counts after marking messages as read
      await loadNotificationCounts();
    } catch (error) {
      print('[NotificationManager] Error marking all messages as read: $error');
    }
  }

  /// Refresh notification counts manually
  Future<void> refresh() => loadNotificationCounts();
}
