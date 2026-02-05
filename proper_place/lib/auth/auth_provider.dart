import 'package:proper_place/api/base44_client.dart';

/// Abstract auth provider interface
/// This allows swapping auth implementations (Base44 -> custom backend) without changing UI code
abstract class AuthProvider {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<Map<String, dynamic>> signup(String email, String password, String name);
  Future<void> logout();
  Future<Map<String, dynamic>?> checkAuthStatus();
  String? getAccessToken();
}

/// Base44 implementation of auth using the Base44Client
class Base44AuthProvider implements AuthProvider {
  final Base44Client _client = Base44Client();

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _client.login(email, password);
      return response;
    } catch (e) {
      print('Base44AuthProvider.login error: $e');
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> signup(
    String email,
    String password,
    String name,
  ) async {
    try {
      final response = await _client.signup(email, password, name);
      return response;
    } catch (e) {
      print('Base44AuthProvider.signup error: $e');
      rethrow;
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _client.logout();
    } catch (e) {
      print('Base44AuthProvider.logout error: $e');
    }
  }

  @override
  Future<Map<String, dynamic>?> checkAuthStatus() async {
    try {
      final user = await _client.getCurrentUser();
      return user;
    } catch (e) {
      print('Base44AuthProvider.checkAuthStatus error: $e');
      return null;
    }
  }

  @override
  String? getAccessToken() {
    return _client.getAccessToken();
  }
}

/// Future: Custom auth provider when moving away from Base44
// class CustomBackendAuthProvider implements AuthProvider {
//   @override
//   Future<Map<String, dynamic>> login(String email, String password) async {
//     // Your custom backend implementation
//   }
//   // ... other methods
// }
