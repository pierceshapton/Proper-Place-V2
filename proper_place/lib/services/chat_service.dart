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
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
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
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
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
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
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
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
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

  /// Fetch all conversations for the current user
  Future<List<Map<String, dynamic>>> getConversations() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      print('[ChatService] Fetching conversations from ${AppConfig.properPlaceBackendUrl}/chat/conversations');
      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/conversations'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      print('[ChatService] Response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final conversations = List<Map<String, dynamic>>.from(data['conversations'] ?? []);
        print('[ChatService] Successfully fetched ${conversations.length} conversations');
        return conversations;
      } else if (response.statusCode == 401) {
        // Token invalid/expired - clear it so user gets redirected to login
        print('[ChatService] Token invalid/expired - clearing stored token');
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
      } else {
        print('[ChatService] Error response body: ${response.body}');
        throw Exception('Failed to fetch conversations: ${response.statusCode} - ${response.body}');
      }
    } catch (error) {
      print('[ChatService] Error fetching conversations: $error');
      rethrow;
    }
  }

  /// Fetch all messages with a specific user
  Future<List<Map<String, dynamic>>> getMessagesWithUser(int otherUserId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/conversations/$otherUserId/messages'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['messages'] ?? []);
      } else if (response.statusCode == 401) {
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
      } else {
        throw Exception('Failed to fetch messages: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error fetching messages: $error');
      rethrow;
    }
  }

  /// Fetch all messages for a specific booking
  Future<List<Map<String, dynamic>>> getMessagesByBooking(int bookingId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/bookings/$bookingId/messages'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['messages'] ?? []);
      } else if (response.statusCode == 401) {
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
      } else {
        throw Exception('Failed to fetch messages: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error fetching booking messages: $error');
      rethrow;
    }
  }

  /// Send a message to another user
  Future<Map<String, dynamic>> sendMessage({
    required int receiverId,
    required String content,
    int? bookingId,
    String? attachmentUrl,
  }) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final body = {
        'receiverId': receiverId,
        'content': content,
      };
      if (bookingId != null) body['bookingId'] = bookingId;
      if (attachmentUrl != null) body['attachmentUrl'] = attachmentUrl;

      final response = await http.post(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/messages'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(body),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        return Map<String, dynamic>.from(data['message']);
      } else if (response.statusCode == 401) {
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
      } else {
        throw Exception('Failed to send message: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error sending message: $error');
      rethrow;
    }
  }

  /// Mark all messages from a user as read
  Future<void> markConversationAsRead(int otherUserId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No auth token found');
      }

      final response = await http.put(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/chat/conversations/$otherUserId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return;
      } else if (response.statusCode == 401) {
        await StorageService.clearUserData();
        throw Exception('Session expired - please log in again');
      } else {
        throw Exception('Failed to mark conversation as read: ${response.statusCode}');
      }
    } catch (error) {
      print('[ChatService] Error marking conversation as read: $error');
      rethrow;
    }
  }
}
