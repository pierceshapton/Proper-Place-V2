import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();

  factory NotificationService() {
    return _instance;
  }

  NotificationService._internal();

  /// Get all notification counts
  Future<Map<String, dynamic>> getNotificationCounts() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.get(
        Uri.parse('${AppConfig.base44BackendUrl}/notifications/counts'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else {
        throw Exception('Failed to get notification counts: ${response.statusCode}');
      }
    } catch (error) {
      print('[NotificationService] Error getting notification counts: $error');
      rethrow;
    }
  }

  /// Mark a specific message as read
  Future<void> markMessageAsRead(int messageId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.patch(
        Uri.parse('${AppConfig.base44BackendUrl}/notifications/messages/$messageId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        print('[NotificationService] Failed to mark message as read: ${response.statusCode}');
      }
    } catch (error) {
      print('[NotificationService] Error marking message as read: $error');
      // Don't rethrow - this is not critical
    }
  }

  /// Mark all messages from a sender as read
  Future<void> markAllMessagesFromSenderAsRead(int senderId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.patch(
        Uri.parse('${AppConfig.base44BackendUrl}/notifications/messages/read-all'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'senderId': senderId}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        print('[NotificationService] Failed to mark all messages as read: ${response.statusCode}');
      }
    } catch (error) {
      print('[NotificationService] Error marking all messages as read: $error');
      // Don't rethrow - this is not critical
    }
  }

  /// Get count of unread messages
  Future<int> getUnreadMessageCount() async {
    try {
      final counts = await getNotificationCounts();
      return counts['unreadMessages'] ?? 0;
    } catch (error) {
      print('[NotificationService] Error getting unread message count: $error');
      return 0;
    }
  }

  /// Get count of pending bookings
  Future<int> getPendingBookingCount() async {
    try {
      final counts = await getNotificationCounts();
      return counts['pendingBookings'] ?? 0;
    } catch (error) {
      print('[NotificationService] Error getting pending booking count: $error');
      return 0;
    }
  }

  /// Get count of pending host applications
  Future<int> getPendingHostApplicationCount() async {
    try {
      final counts = await getNotificationCounts();
      return counts['pendingHostApplications'] ?? 0;
    } catch (error) {
      print('[NotificationService] Error getting pending host application count: $error');
      return 0;
    }
  }

  /// Get count of pending approvals (for admins)
  Future<int> getPendingApprovalsCount() async {
    try {
      final counts = await getNotificationCounts();
      return counts['pendingApprovals'] ?? 0;
    } catch (error) {
      print('[NotificationService] Error getting pending approvals count: $error');
      return 0;
    }
  }

  /// Get count of pending site submissions (for hosts)
  Future<int> getSiteSubmissionsCount() async {
    try {
      final counts = await getNotificationCounts();
      return counts['siteSubmissions'] ?? 0;
    } catch (error) {
      print('[NotificationService] Error getting site submissions count: $error');
      return 0;
    }
  }
}
