import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';

/// ProperPlace API client wrapper
/// Handles authentication, token management, and API calls

class ProperPlaceClient {
  static final ProperPlaceClient _instance = ProperPlaceClient._internal();
  late String _accessToken;
  late http.Client _httpClient;

  // Cached base URL to avoid repeated lookups
  static final String _baseUrl = _getBaseUrl();

  static String _getBaseUrl() {
    final url = AppConfig.properPlaceBackendUrl;
    // Verify URL is valid
    if (url.isEmpty || url.length < 10 || !url.startsWith('http')) {
      print('[ProperPlaceClient] ⚠️ Invalid base URL: "$url", using hardcoded fallback');
      return 'https://octopus-app-lxh2t.ondigitalocean.app';
    }
    return url;
  }

  ProperPlaceClient._internal() {
    _httpClient = http.Client();
    _accessToken = '';
  }

  factory ProperPlaceClient() {
    return _instance;
  }

  /// Set access token (from login response)
  void setAccessToken(String token) {
    _accessToken = token;
  }

  /// Get current access token
  String? getAccessToken() {
    return _accessToken.isEmpty ? null : _accessToken;
  }

  /// Clear token on logout
  void clearAccessToken() {
    _accessToken = '';
  }

  /// Build headers with authentication
  Map<String, String> _buildHeaders({bool includeAuth = true}) {
    final headers = {
      'Content-Type': 'application/json',
      'X-App-Id': AppConfig.properPlaceAppId,
    };

    if (includeAuth && _accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }

    return headers;
  }

  /// Generic GET request
  Future<dynamic> get(String endpoint) async {
    final url = Uri.parse('$_baseUrl$endpoint');

    try {
      final response = await _httpClient.get(
        url,
        headers: _buildHeaders(),
      );

      if (response.statusCode == 401 || response.statusCode == 403) {
        clearAccessToken();
        throw ProperPlaceException('Unauthorized', response.statusCode);
      }

      if (response.statusCode >= 400) {
        throw ProperPlaceException(
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
    final url = Uri.parse('$_baseUrl$endpoint');

    try {
      final response = await _httpClient.post(
        url,
        headers: _buildHeaders(),
        body: jsonEncode(body),
      );

      if (response.statusCode == 401 || response.statusCode == 403) {
        clearAccessToken();
        throw ProperPlaceException('Unauthorized', response.statusCode);
      }

      if (response.statusCode >= 400) {
        throw ProperPlaceException(
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

  /// Login with email and password
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await post('/auth/login', {
        'email': email,
        'password': password,
      });

      // Store the access token from response
      if (response['access_token'] != null) {
        setAccessToken(response['access_token']);
      }

      return response;
    } catch (e) {
      print('Login failed: $e');
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
        setAccessToken(response['access_token']);
      }

      return response;
    } catch (e) {
      print('Signup failed: $e');
      rethrow;
    }
  }

  /// Get current user
  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await get('/auth/me');
      return response;
    } catch (e) {
      print('Failed to get current user: $e');
      rethrow;
    }
  }

  /// Logout (clear token)
  Future<void> logout() async {
    try {
      // Optionally notify backend
      await post('/auth/logout', {});
    } catch (e) {
      print('Logout request failed: $e');
    } finally {
      clearAccessToken();
    }
  }

  /// Refresh token (if applicable)
  Future<String?> refreshToken(String refreshToken) async {
    try {
      final response = await post('/auth/refresh', {
        'refresh_token': refreshToken,
      });

      if (response['access_token'] != null) {
        setAccessToken(response['access_token']);
        return response['access_token'];
      }

      return null;
    } catch (e) {
      print('Token refresh failed: $e');
      clearAccessToken();
      return null;
    }
  }

  /// Get all places
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
      print('Failed to get places: $e');
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
      print('Failed to get place: $e');
      return null;
    }
  }

  /// Create a booking
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    try {
      final response = await post('/bookings', bookingData);
      return response;
    } catch (e) {
      print('Failed to create booking: $e');
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
      print('Failed to get bookings: $e');
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
      print('Failed to get place reviews: $e');
      return [];
    }
  }
}

/// Custom exception for ProperPlace API errors
class ProperPlaceException implements Exception {
  final String message;
  final int? statusCode;
  final String? responseBody;

  ProperPlaceException(this.message, [this.statusCode, this.responseBody]);

  @override
  String toString() => 'ProperPlaceException: $message (status: $statusCode)';
}

// Singleton instance
final properPlace = ProperPlaceClient();
