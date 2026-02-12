import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';

class ChatService {
  static final ChatService _instance = ChatService._internal();

  factory ChatService() {
    return _instance;
  }

  ChatService._internal();

  /// Delete a contact/conversation
  Future<void> deleteContact(String contactId) async {
    try {
      final contactIdInt = int.tryParse(contactId) ?? 0;
      if (contactIdInt == 0) {
        throw Exception('Invalid contact ID');
      }

      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.delete(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/contacts/$contactIdInt'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else if (response.statusCode == 404) {
        throw Exception('Contact not found');
      } else {
        throw Exception('Failed to delete contact: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error deleting contact: $error');
      rethrow;
    }
  }

  /// Mark a contact as unread
  Future<void> markContactAsUnread(String contactId) async {
    try {
      final contactIdInt = int.tryParse(contactId) ?? 0;
      if (contactIdInt == 0) {
        throw Exception('Invalid contact ID');
      }

      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.patch(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/contacts/$contactIdInt/unread'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else if (response.statusCode == 404) {
        throw Exception('Contact not found');
      } else {
        throw Exception('Failed to mark as unread: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error marking as unread: $error');
      rethrow;
    }
  }

  /// Mark a contact as read
  Future<void> markContactAsRead(String contactId) async {
    try {
      final contactIdInt = int.tryParse(contactId) ?? 0;
      if (contactIdInt == 0) {
        throw Exception('Invalid contact ID');
      }

      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.patch(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/contacts/$contactIdInt/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else if (response.statusCode == 404) {
        throw Exception('Contact not found');
      } else {
        throw Exception('Failed to mark as read: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error marking as read: $error');
      rethrow;
    }
  }

  /// Delete a message
  Future<void> deleteMessage(String messageId) async {
    try {
      final messageIdInt = int.tryParse(messageId) ?? 0;
      if (messageIdInt == 0) {
        throw Exception('Invalid message ID');
      }

      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.delete(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/messages/$messageIdInt'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else if (response.statusCode == 404) {
        throw Exception('Message not found');
      } else {
        throw Exception('Failed to delete message: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error deleting message: $error');
      rethrow;
    }
  }
}
