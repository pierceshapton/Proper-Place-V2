import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:proper_place/config/app_config.dart';

/// Base44 API client wrapper (mirrors React's base44Client.js)
/// Handles authentication, token management, and API calls

class Base44Client {
  static final Base44Client _instance = Base44Client._internal();
  late String _accessToken;
  late http.Client _httpClient;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  static const String _tokenKey = 'access_token';

  Base44Client._internal() {
    _httpClient = http.Client();
    _accessToken = '';
  }

  factory Base44Client() {
    return _instance;
  }

  /// Set access token (from login response) and persist to secure storage
  Future<void> setAccessToken(String token) async {
    _accessToken = token;
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  /// Load token from secure storage on app start
  Future<void> loadStoredToken() async {
    final stored = await _secureStorage.read(key: _tokenKey);
    if (stored != null && stored.isNotEmpty) {
      _accessToken = stored;
    }
  }

  /// Get current access token
  String? getAccessToken() {
    return _accessToken.isEmpty ? null : _accessToken;
  }

  /// Clear token on logout
  Future<void> clearAccessToken() async {
    _accessToken = '';
    await _secureStorage.delete(key: _tokenKey);
  }

  /// Build headers with authentication
  Map<String, String> _buildHeaders({bool includeAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
      'X-App-Id': AppConfig.base44AppId,
    };

    if (includeAuth && _accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }

    return headers;
  }

  /// Generic GET request
  Future<dynamic> get(String endpoint) async {
    final url = Uri.parse('${AppConfig.base44BackendUrl}$endpoint');

    try {
      final response = await _httpClient.get(
        url,
        headers: _buildHeaders(),
      );

      if (response.statusCode == 401 || response.statusCode == 403) {
        clearAccessToken();
        throw Base44Exception('Unauthorized', response.statusCode);
      }

      if (response.statusCode >= 400) {
        throw Base44Exception(
          'HTTP ${response.statusCode}',
          response.statusCode,
          response.body,
        );
      }

      return jsonDecode(response.body);
    } catch (e) {
      rethrow;
    }
  }

  /// Generic POST request
  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('${AppConfig.base44BackendUrl}$endpoint');

    try {
      final response = await _httpClient.post(
        url,
        headers: _buildHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 401 || response.statusCode == 403) {
        clearAccessToken();
        throw Base44Exception('Unauthorized', response.statusCode);
      }

      if (response.statusCode >= 400) {
        throw Base44Exception(
          'HTTP ${response.statusCode}',
          response.statusCode,
          response.body,
        );
      }

      return jsonDecode(response.body);
    } catch (e) {
      rethrow;
    }
  }

  /// Login with email and password (mirrors React's base44.auth.login())
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await post('/auth/login', {
        'email': email,
        'password': password,
      });

      // Store the access token from response
      if (response['access_token'] != null) {
        await setAccessToken(response['access_token']);
      }

      return response;
    } catch (e) {
    debugPrint('Login failed: $e');
      rethrow;
    }
  }

  /// Sign up with email, password, and name
  Future<Map<String, dynamic>> signup(
    String email,
    String password,
    String name,
  ) async {
    try {
      final response = await post('/auth/signup', {
        'email': email,
        'password': password,
        'name': name,
      });

      // Store the access token from response
      if (response['access_token'] != null) {
        await setAccessToken(response['access_token']);
      }

      return response;
    } catch (e) {
    debugPrint('Signup failed: $e');
      rethrow;
    }
  }

  /// Get current user (mirrors React's base44.auth.me())
  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await get('/auth/me');
      return response;
    } catch (e) {
    debugPrint('Failed to get current user: $e');
      rethrow;
    }
  }

  /// Logout (clear token)
  Future<void> logout() async {
    try {
      // Optionally notify backend
      await post('/auth/logout', {});
    } catch (e) {
    debugPrint('Logout request failed: $e');
    } finally {
      await clearAccessToken();
    }
  }

  /// Refresh token (if applicable)
  Future<String?> refreshToken(String refreshToken) async {
    try {
      final response = await post('/auth/refresh', {
        'refresh_token': refreshToken,
      });

      if (response['access_token'] != null) {
        await setAccessToken(response['access_token']);
        return response['access_token'];
      }

      return null;
    } catch (e) {
    debugPrint('Token refresh failed: $e');
      await clearAccessToken();
      return null;
    }
  }

  /// Get all places (mirrors React's base44.entities.Place.list())
  Future<List<Map<String, dynamic>>> getPlaces() async {
    try {
      final response = await get('/places');
      // API returns { data: [...] } or just [...]
      if (response is List) {
        return List<Map<String, dynamic>>.from(response);
      } else if (response is Map && response['data'] != null) {
        return List<Map<String, dynamic>>.from(response['data']);
      }
      return [];
    } catch (e) {
    debugPrint('Failed to get places: $e');
      return [];
    }
  }

  /// Get place detail by ID
  Future<Map<String, dynamic>?> getPlace(String placeId) async {
    try {
      final response = await get('/places/$placeId');
      if (response is Map) {
        return Map<String, dynamic>.from(response);
      }
      return null;
    } catch (e) {
    debugPrint('Failed to get place: $e');
      return null;
    }
  }

  /// Create a booking
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    try {
      final response = await post('/bookings', bookingData);
      return response;
    } catch (e) {
    debugPrint('Failed to create booking: $e');
      rethrow;
    }
  }

  /// Get user's bookings
  Future<List<Map<String, dynamic>>> getBookings() async {
    try {
      final response = await get('/bookings');
      if (response is List) {
        return List<Map<String, dynamic>>.from(response);
      } else if (response is Map && response['data'] != null) {
        return List<Map<String, dynamic>>.from(response['data']);
      }
      return [];
    } catch (e) {
    debugPrint('Failed to get bookings: $e');
      return [];
    }
  }

  /// Get place reviews
  Future<List<Map<String, dynamic>>> getPlaceReviews(String placeId) async {
    try {
      final response = await get('/places/$placeId/reviews');
      if (response is List) {
        return List<Map<String, dynamic>>.from(response);
      } else if (response is Map && response['data'] != null) {
        return List<Map<String, dynamic>>.from(response['data']);
      }
      return [];
    } catch (e) {
    debugPrint('Failed to get place reviews: $e');
      return [];
    }
  }
}

/// Custom exception for Base44 API errors
class Base44Exception implements Exception {
  final String message;
  final int? statusCode;
  final String? responseBody;

  Base44Exception(this.message, [this.statusCode, this.responseBody]);

  @override
  String toString() => 'Base44Exception: $message (status: $statusCode)';
}

// Singleton instance
final base44 = Base44Client();
