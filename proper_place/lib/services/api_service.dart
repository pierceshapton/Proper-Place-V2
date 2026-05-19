import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io' as io;
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';

/// Centralized API service for all backend calls
/// Uses AppConfig to get the API base URL
class ApiService {
  static const String _authLoginEndpoint = '/auth/login';
  static const String _authSignupEndpoint = '/auth/signup';
  static const String _authUserEndpoint = '/auth/user';
  static const String _authForgotPasswordEndpoint = '/auth/forgot-password';

  /// Get the full API base URL from config
  static String get _baseUrl {
    final url = AppConfig.properPlaceBackendUrl;
    // Verify URL is not empty or just "base"
    if (url.isEmpty || url.length < 10 || !url.startsWith('http')) {
    debugPrint('[ApiService] ⚠️ Invalid base URL: "$url", using hardcoded fallback');
      return 'https://octopus-app-lxh2t.ondigitalocean.app';
    }
    return url;
  }

  /// Build full endpoint URL
  static String _buildUrl(String endpoint) {
    return '$_baseUrl$endpoint';
  }

  // Flag to prevent infinite refresh loops
  static bool _isRefreshing = false;

  /// Result of a refresh attempt.
  /// - success: got a new access token, retry the original request.
  /// - rejected: server explicitly told us the refresh token is invalid; safe to clear auth.
  /// - failed: transient (network/timeout/5xx) — DO NOT clear auth, just surface the error.
  static Future<_RefreshResult> _refreshAccessToken() async {
    if (_isRefreshing) return _RefreshResult.failed;
    _isRefreshing = true;

    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) {
    debugPrint('[ApiService] No refresh token available');
        return _RefreshResult.rejected;
      }

    debugPrint('[ApiService] Attempting token refresh...');
      final url = Uri.parse('$_baseUrl/auth/refresh');
      final http.Response response;
      try {
        response = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'refresh_token': refreshToken}),
        ).timeout(const Duration(seconds: 15));
      } catch (e) {
    debugPrint('[ApiService] Token refresh transient error: $e');
        return _RefreshResult.failed;
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final newAccessToken = data['access_token'];
        final newRefreshToken = data['refresh_token'];

        if (newAccessToken != null) {
          await StorageService.saveToken(newAccessToken);
          if (newRefreshToken != null) {
            await StorageService.saveRefreshToken(newRefreshToken);
          }
    debugPrint('[ApiService] Token refresh successful');
          return _RefreshResult.success;
        }
        return _RefreshResult.failed;
      }

      // Only treat 401/403 as a real rejection (refresh token invalid/revoked).
      // 5xx, 502, 503, 504, 0 etc. are transient — keep the user logged in.
      if (response.statusCode == 401 || response.statusCode == 403) {
    debugPrint('[ApiService] Refresh token rejected (${response.statusCode})');
        return _RefreshResult.rejected;
      }

    debugPrint('[ApiService] Token refresh failed transiently: ${response.statusCode}');
      return _RefreshResult.failed;
    } catch (e) {
    debugPrint('[ApiService] Token refresh error: $e');
      return _RefreshResult.failed;
    } finally {
      _isRefreshing = false;
    }
  }

  /// Generic request method with error handling and auto-refresh
  static Future<Map<String, dynamic>> _request({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    bool isRetry = false,
  }) async {
    try {
      final fullUrl = _buildUrl(endpoint);
      final url = Uri.parse(fullUrl);
      
      // Fetch token and add to headers for authenticated endpoints
      final token = await StorageService.getToken();

      late http.Response response;

      if (method == 'POST') {
        response = await http.post(
          url,
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            ...?headers,
          },
          body: body != null ? jsonEncode(body) : null,
        ).timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timeout after 30 seconds'),
        );
      } else if (method == 'GET') {
        response = await http.get(
          url,
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            ...?headers,
          },
        ).timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timeout after 30 seconds'),
        );
      } else if (method == 'DELETE') {
        response = await http.delete(
          url,
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            ...?headers,
          },
          body: body != null ? jsonEncode(body) : null,
        ).timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timeout after 30 seconds'),
        );
      } else if (method == 'PATCH') {
        response = await http.patch(
          url,
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            ...?headers,
          },
          body: body != null ? jsonEncode(body) : null,
        ).timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timeout after 30 seconds'),
        );
      } else if (method == 'PUT') {
        response = await http.put(
          url,
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
            ...?headers,
          },
          body: body != null ? jsonEncode(body) : null,
        ).timeout(
          const Duration(seconds: 30),
          onTimeout: () => throw TimeoutException('Request timeout after 30 seconds'),
        );
      } else {
        throw Exception('Unsupported HTTP method: $method');
      }

      // Parse response
      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return data;
      } else {
        // Handle 401 - try to refresh token automatically
        if (response.statusCode == 401 && !isRetry) {
    debugPrint('[ApiService] Got 401 - attempting auto-refresh');
          final refreshResult = await _refreshAccessToken();
          if (refreshResult == _RefreshResult.success) {
            // Retry the original request with new token
            return _request(
              method: method,
              endpoint: endpoint,
              body: body,
              headers: headers,
              isRetry: true,
            );
          }
          // Only clear auth if refresh was EXPLICITLY rejected by the server.
          // Transient failures (network, timeout, 5xx) must NOT log the user out.
          if (refreshResult == _RefreshResult.rejected) {
    debugPrint('[ApiService] Refresh token rejected by server - clearing auth');
            await StorageService.clearAll();
          } else {
    debugPrint('[ApiService] Refresh transiently failed - keeping auth, surfacing error');
          }
        }
        throw ApiException(
          statusCode: response.statusCode,
          message: data['message'] ?? 'Request failed',
          errors: data['errors'] as List<dynamic>?,
        );
      }
    } on io.SocketException catch (e) {
    debugPrint('[ApiService._request] [ERROR] SocketException: ${e.message}');
    debugPrint('[ApiService._request] [ERROR] Attempted URL: $_baseUrl');
      throw ApiException(
        statusCode: 0,
        message: 'Network error: ${e.message}',
      );
    } on TimeoutException catch (e) {
    debugPrint('[ApiService._request] [ERROR] TimeoutException: ${e.message}');
      throw ApiException(
        statusCode: 0,
        message: e.message,
      );
    } on FormatException catch (e) {
    debugPrint('[ApiService._request] [ERROR] FormatException: ${e.message}');
      throw ApiException(
        statusCode: 0,
        message: 'Invalid response format: ${e.message}',
      );
    } catch (e) {
    debugPrint('[ApiService._request] [ERROR] Unexpected error: $e');
    debugPrint('[ApiService._request] [ERROR] Attempted base URL: $_baseUrl');
      throw ApiException(
        statusCode: 0,
        message: 'Unexpected error: ${e.toString()}',
      );
    }
  }

  /// Generic POST helper for use by other services
  static Future<Map<String, dynamic>> post({
    required String endpoint,
    Map<String, dynamic>? body,
  }) {
    return _request(method: 'POST', endpoint: endpoint, body: body);
  }

  /// Generic DELETE helper for use by other services
  static Future<Map<String, dynamic>> delete({
    required String endpoint,
    Map<String, dynamic>? body,
  }) {
    return _request(method: 'DELETE', endpoint: endpoint, body: body);
  }

  /// Login user
  /// Returns: { access_token, user_id, email, name, role, message }
  static Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
  }) async {
    return _request(
      method: 'POST',
      endpoint: _authLoginEndpoint,
      body: {
        'identifier': identifier,
        'password': password,
      },
    );
  }

  /// Check if a username is available (returns true if available)
  static Future<bool> checkUsernameAvailable(String username) async {
    final result = await _request(
      method: 'GET',
      endpoint: '/auth/check-username?username=${Uri.encodeComponent(username)}',
    );
    return result['available'] == true;
  }

  /// Sign up new user
  /// Returns: { access_token, user_id, email, name, role, message }
  static Future<Map<String, dynamic>> signup({
    required String username,
    required String email,
    required String name,
    required String password,
    required String confirmPassword,
    String? referralCode,
    String? vehicleRegistration,
  }) async {
    final body = <String, dynamic>{
      'username': username,
      'email': email,
      'name': name,
      'password': password,
      'confirmPassword': confirmPassword,
    };
    if (referralCode != null && referralCode.isNotEmpty) {
      body['referral_code'] = referralCode;
    }
    if (vehicleRegistration != null && vehicleRegistration.isNotEmpty) {
      body['vehicle_registration'] = vehicleRegistration;
    }
    return _request(
      method: 'POST',
      endpoint: _authSignupEndpoint,
      body: body,
    );
  }

  /// Get user info
  static Future<Map<String, dynamic>> getUser({
    required String userId,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '$_authUserEndpoint/$userId',
    );
  }

  /// Permanently delete the authenticated user's account
  static Future<Map<String, dynamic>> deleteAccount({
    required String userId,
  }) async {
    return _request(
      method: 'DELETE',
      endpoint: '/users/$userId',
    );
  }

  /// Request password reset email
  static Future<Map<String, dynamic>> forgotPassword({
    required String email,
  }) async {
    return _request(
      method: 'POST',
      endpoint: _authForgotPasswordEndpoint,
      body: {'email': email},
    );
  }

  /// Get all approved places
  static Future<List<dynamic>> getApprovedPlaces() async {
    try {
      final response = await _request(
        method: 'GET',
        endpoint: '/places',
      );
      final places = response['places'] ?? [];
      
      // Cache the places for offline use
      await StorageService.cachePlaces(jsonEncode(places));
      
      return places;
    } catch (e) {
      // If offline or error, try to load cached places
      final cachedJson = await StorageService.getCachedPlaces();
      if (cachedJson != null && cachedJson.isNotEmpty) {
        return jsonDecode(cachedJson) as List<dynamic>;
      }
      rethrow;
    }
  }

  /// Get places in bounding box
  static Future<List<dynamic>> getPlacesInBounds({
    required double minLat,
    required double maxLat,
    required double minLng,
    required double maxLng,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places/bounds?minLat=$minLat&maxLat=$maxLat&minLng=$minLng&maxLng=$maxLng',
    );
    return response['places'] ?? [];
  }

  /// Get single place details
  static Future<Map<String, dynamic>> getPlaceById({
    required String placeId,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places/$placeId',
    );
    return response['place'] ?? {};
  }

  /// Submit new place (host only)
  static Future<Map<String, dynamic>> submitPlace({
    required String name,
    required String description,
    required double locationLat,
    required double locationLng,
    required String address,
    required double pricePerNight,
    required String placeType,
    String? imageUrl,
    String? amenities,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/places',
      body: {
        'name': name,
        'description': description,
        'locationLat': locationLat,
        'locationLng': locationLng,
        'address': address,
        'pricePerNight': pricePerNight,
        'placeType': placeType,
        'imageUrl': imageUrl,
        'amenities': amenities,
      },
    );
  }

  /// Get available facilities from config
  static Future<List<String>> getFacilities() async {
    try {
      final response = await _request(
        method: 'GET',
        endpoint: '/config/facilities',
      );
      if (response['facilities'] != null) {
        return List<String>.from(response['facilities']);
      }
      return [];
    } catch (e) {
    debugPrint('Error fetching facilities: $e');
      rethrow;
    }
  }

  /// Get app config (feature flags + numeric settings) from backend app_settings table.
  /// Edit via SQL: UPDATE app_settings SET value = '10' WHERE key = 'min_price_per_night';
  static Future<Map<String, dynamic>> getAppConfig() async {
    try {
      final response = await _request(
        method: 'GET',
        endpoint: '/config/features',
      );
      return Map<String, dynamic>.from(response);
    } catch (e) {
      debugPrint('Error fetching app config: $e');
      return {'referral_enabled': false, 'min_price_per_night': 5};
    }
  }

  /// Get feature flags from backend app_settings table.
  /// Toggle via SQL: UPDATE app_settings SET value = 'true' WHERE key = 'referral_enabled';
  static Future<Map<String, bool>> getFeatureFlags() async {
    try {
      final response = await _request(
        method: 'GET',
        endpoint: '/config/features',
      );
      return response.map((k, v) => MapEntry(k, v == true));
    } catch (e) {
      debugPrint('Error fetching feature flags: $e');
      return {'referral_enabled': false};
    }
  }

  /// Get host's places
  static Future<List<dynamic>> getHostPlaces() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places/host/my-places',
    );
    return response['places'] ?? [];
  }

  /// Get pending places (admin only)
  static Future<List<dynamic>> getPendingPlaces() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places/admin/pending',
    );
    return response['places'] ?? [];
  }

  /// Get approved places (admin view)
  static Future<List<dynamic>> getAdminApprovedPlaces() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places?approval_status=approved',
    );
    return response['places'] ?? [];
  }

  /// Get rejected places (admin view)
  static Future<List<dynamic>> getAdminRejectedPlaces() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/places?approval_status=rejected',
    );
    return response['places'] ?? [];
  }

  /// Approve place (admin only)
  static Future<Map<String, dynamic>> approvePlace({
    required String placeId,
    String? notes,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/places/$placeId/approve',
      body: {'notes': notes ?? ''},
    );
  }

  /// Reject place (admin only)
  static Future<Map<String, dynamic>> rejectPlace({
    required String placeId,
    required String reason,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/places/$placeId/reject',
      body: {'reason': reason},
    );
  }

  /// Delete place (admin only)
  static Future<Map<String, dynamic>> deletePlace({
    required String placeId,
  }) async {
    return _request(
      method: 'DELETE',
      endpoint: '/places/$placeId',
    );
  }

  /// Reopen/unreject place (admin only - moves rejected place back to pending)
  static Future<Map<String, dynamic>> reopenPlace({
    required String placeId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/places/$placeId/reopen',
    );
  }

  /// Get bookings for a place (public availability data)
  static Future<List<dynamic>> getBookingsForPlace({
    required String placeId,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/bookings/place/$placeId',
    );
    return response['bookings'] ?? [];
  }

  /// Host: Get all bookings for the host's places (with guest info)
  static Future<List<dynamic>> getHostBookings({String? status}) async {
    String endpoint = '/bookings/host/my-bookings';
    if (status != null && status.isNotEmpty) {
      endpoint += '?status=${Uri.encodeComponent(status)}';
    }
    final response = await _request(
      method: 'GET',
      endpoint: endpoint,
    );
    return response['bookings'] ?? [];
  }

  /// Host: Mark all bookings as seen
  static Future<void> markHostBookingsSeen() async {
    await _request(
      method: 'PUT',
      endpoint: '/bookings/host/mark-seen',
    );
  }

  /// Admin: Get all bookings system-wide
  static Future<List<dynamic>> getAllBookings({String? status}) async {
    String endpoint = '/bookings/all';
    if (status != null && status.isNotEmpty) {
      endpoint += '?status=${Uri.encodeComponent(status)}';
    }
    debugPrint('[ApiService] getAllBookings calling $endpoint');
    final response = await _request(
      method: 'GET',
      endpoint: endpoint,
    );
    debugPrint('[ApiService] getAllBookings response keys: ${response.keys.toList()}');
    debugPrint('[ApiService] getAllBookings bookings count: ${(response['bookings'] as List?)?.length ?? 'null'}');
    return response['bookings'] ?? [];
  }

  /// Create a new booking
  static Future<Map<String, dynamic>> createBooking({
    required String placeId,
    required String guestId,
    required String checkIn,
    required String checkOut,
    required double totalPrice,
    String? vanRegistration,
    String? paymentIntentId,
    String? connectedAccountId,
    bool electricHookup = false,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/bookings',
      body: {
        'place_id': int.tryParse(placeId) ?? placeId,
        'check_in_date': checkIn,
        'check_out_date': checkOut,
        if (vanRegistration != null) 'van_registration': vanRegistration,
        if (paymentIntentId != null) 'paymentIntentId': paymentIntentId,
        if (connectedAccountId != null) 'connectedAccountId': connectedAccountId,
        'electric_hookup': electricHookup,
      },
    );
  }

  /// Mark a booking as completed and trigger payment capture on the backend.
  static Future<Map<String, dynamic>> completeBooking({
    required String bookingId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/bookings/$bookingId/complete',
    );
  }

  /// Get availability for a place
  static Future<Map<String, dynamic>> getAvailability({
    required String placeId,
    required String startDate,
    required String endDate,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/bookings/availability/$placeId?startDate=$startDate&endDate=$endDate',
    );
    return response['availability'] ?? {};
  }

  /// Get guest's bookings
  static Future<List<dynamic>> getGuestBookings({
    required String guestId,
  }) async {
    try {
      // Use the authenticated /bookings endpoint which returns current user's bookings
      // The guestId parameter is ignored since the backend uses the authenticated user
      final response = await _request(
        method: 'GET',
        endpoint: '/bookings',
      );
      final rawBookings = response['bookings'] ?? [];
      
      // Normalize booking field names to match UI expectations
      final bookings = rawBookings.map((booking) {
        return {
          'booking_id': booking['id'],
          'user_id': booking['user_id'],
          'place_id': booking['place_id'],
          'pub_id': booking['pub_id'],
          'host_id': booking['host_id'],
          'host_name': booking['host_name'],
          'booking_ref': booking['booking_ref'],
          'check_in': booking['check_in_date'],
          'check_out': booking['check_out_date'],
          'check_in_date': booking['check_in_date'],
          'check_out_date': booking['check_out_date'],
          'check_in_time': booking['check_in_time'] ?? '12:00',
          'check_out_time': booking['check_out_time'] ?? '12:00',
          'number_of_nights': booking['number_of_nights'],
          'total_price': booking['total_price'],
          'status': booking['status'],
          'van_registration': booking['van_registration'],
          'contact_phone': booking['contact_phone'],
          'special_requests': booking['special_requests'],
          'created_at': booking['created_at'],
          'updated_at': booking['updated_at'],
        };
      }).toList();
      
      // Cache the bookings for offline use
      await StorageService.cacheBookings(jsonEncode(bookings));
      
      return bookings;
    } catch (e) {
      // If offline or error, try to load cached bookings
      final cachedJson = await StorageService.getCachedBookings();
      if (cachedJson != null && cachedJson.isNotEmpty) {
        return jsonDecode(cachedJson) as List<dynamic>;
      }
      rethrow;
    }
  }

  /// Cancel a booking
  static Future<Map<String, dynamic>> cancelBooking({
    required String bookingId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/bookings/$bookingId/cancel',
    );
  }

  /// Host approves a pending booking
  static Future<Map<String, dynamic>> approveBooking({
    required String bookingId,
  }) async {
    return _request(
      method: 'PUT',
      endpoint: '/bookings/$bookingId/approve',
    );
  }

  /// Host rejects a pending booking
  static Future<Map<String, dynamic>> rejectBooking({
    required String bookingId,
  }) async {
    return _request(
      method: 'PUT',
      endpoint: '/bookings/$bookingId/reject',
    );
  }

  /// Get extension requests for a booking
  static Future<List<dynamic>> getBookingExtensions({
    required String bookingId,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/bookings/$bookingId/extensions',
    );
    return response['extensions'] ?? [];
  }

  /// Host approves an extension request
  static Future<Map<String, dynamic>> approveExtension({
    required String extensionId,
  }) async {
    return _request(
      method: 'PUT',
      endpoint: '/bookings/extensions/$extensionId/approve',
    );
  }

  /// Host rejects an extension request
  static Future<Map<String, dynamic>> rejectExtension({
    required String extensionId,
    String? reason,
  }) async {
    return _request(
      method: 'PUT',
      endpoint: '/bookings/extensions/$extensionId/reject',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  /// Create payment intent with Stripe Connect direct charge.
  /// Returns clientSecret, paymentIntentId, connectedAccountId (may be null
  /// if the host has not yet completed Connect onboarding), and captureMethod
  /// ('manual' = held until checkout, 'automatic' = charged immediately).
  static Future<Map<String, dynamic>> createPaymentIntent({
    required int amount,
    required String currency,
    String? placeId,
    DateTime? checkOutDate,
  }) async {
    final body = <String, dynamic>{
      'amount': amount,
      'currency': currency,
    };
    if (placeId != null) {
      body['place_id'] = placeId;
    }
    if (checkOutDate != null) {
      body['check_out_date'] = checkOutDate.toIso8601String();
    }
    return _request(
      method: 'POST',
      endpoint: '/payments/create-intent',
      body: body,
    );
  }

  /// Confirm payment and create booking
  static Future<Map<String, dynamic>> confirmPaymentAndCreateBooking({
    required String paymentIntentId,
    required String placeId,
    required String guestId,
    required String checkIn,
    required String checkOut,
    required double totalPrice,
    String? connectedAccountId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/confirm-and-book',
      body: {
        'paymentIntentId': paymentIntentId,
        'placeId': placeId,
        'guestId': guestId,
        'checkIn': checkIn,
        'checkOut': checkOut,
        'totalPrice': totalPrice,
        if (connectedAccountId != null) 'connectedAccountId': connectedAccountId,
      },
    );
  }

  /// Refund a payment
  static Future<Map<String, dynamic>> refundPayment({
    required String paymentIntentId,
    String? connectedAccountId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/refund',
      body: {
        'paymentIntentId': paymentIntentId,
        if (connectedAccountId != null) 'connectedAccountId': connectedAccountId,
      },
    );
  }

  /// Start Stripe Connect onboarding for a host. Returns the Stripe-hosted URL
  /// the user must open to enter their bank/identity details.
  static Future<Map<String, dynamic>> getConnectOnboardingUrl({
    required String userId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/connect/onboard',
      body: {'userId': userId},
    );
  }

  /// Check whether a host has completed Stripe Connect onboarding.
  static Future<Map<String, dynamic>> getConnectStatus({
    required String userId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/connect/status',
      body: {'userId': userId},
    );
  }

  /// Submit host application
  static Future<Map<String, dynamic>> submitHostApplication({
    required String userId,
    required String contactName,
    required String email,
    required String phone,
    required String businessDescription,
    required String address,
    required double latitude,
    required double longitude,
    required String businessType,
    required int vanSpaces,
    String? referralCode,
  }) async {
    final body = <String, dynamic>{
      'user_id': userId,
      'contact_name': contactName,
      'email': email,
      'phone': phone,
      'business_description': businessDescription,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'business_type': businessType,
      'van_spaces': vanSpaces,
    };
    if (referralCode != null && referralCode.isNotEmpty) {
      body['referral_code'] = referralCode;
    }
    return _request(
      method: 'POST',
      endpoint: '/host-applications',
      body: body,
    );
  }

  /// Get host application status
  static Future<Map<String, dynamic>> getHostApplicationStatus({
    required String userId,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '/host-applications/$userId',
    );
  }

  // ==================== ADMIN HOST APPLICATION METHODS ====================

  /// Get users for admin management
  static Future<List<dynamic>> getAdminUsers() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/admin/users?limit=200',
    );
    return response['users'] ?? [];
  }

  /// Get detailed user data (including booking history)
  static Future<Map<String, dynamic>> getAdminUserDetails({
    required int userId,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '/admin/users/$userId',
    );
  }

  /// Update user role
  static Future<Map<String, dynamic>> updateAdminUserRole({
    required int userId,
    required String role,
  }) async {
    return _request(
      method: 'PATCH',
      endpoint: '/admin/users/$userId/role',
      body: {'role': role},
    );
  }

  /// Permanently delete a user account
  static Future<Map<String, dynamic>> deleteAdminUser({
    required int userId,
  }) async {
    return _request(
      method: 'DELETE',
      endpoint: '/admin/users/$userId',
    );
  }

  /// Get all host applications (admin only)
  static Future<List<dynamic>> getHostApplications({String status = 'all'}) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/admin/host-applications?status=$status',
    );
    return response['applications'] ?? [];
  }

  /// Approve host application (admin only)
  static Future<Map<String, dynamic>> approveHostApplication({
    required int applicationId,
    String? adminNotes,
  }) async {
    return _request(
      method: 'PATCH',
      endpoint: '/admin/host-applications/$applicationId/approve',
      body: {'admin_notes': adminNotes ?? ''},
    );
  }

  /// Reject host application (admin only)
  static Future<Map<String, dynamic>> rejectHostApplication({
    required int applicationId,
    String? adminNotes,
  }) async {
    return _request(
      method: 'PATCH',
      endpoint: '/admin/host-applications/$applicationId/reject',
      body: {'admin_notes': adminNotes ?? ''},
    );
  }

  // ==================== GUEST REVIEW METHODS ====================

  /// Rate a guest after a completed booking (host only)
  static Future<Map<String, dynamic>> createGuestReview({
    required int bookingId,
    required int rating,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/bookings/$bookingId/guest-review',
      body: {'rating': rating},
    );
  }

  /// Get average guest rating for a user
  static Future<Map<String, dynamic>> getGuestRating({
    required int userId,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '/bookings/guest-rating/$userId',
    );
  }

  // ==================== REFERRAL METHODS ====================

  /// Get or create referral code for current host
  static Future<String> getReferralCode() async {
    final response = await _request(
      method: 'GET',
      endpoint: '/referrals/code',
    );
    return response['referral_code'] ?? '';
  }

  /// Set up Stripe Connect for payout — returns onboarding URL
  static Future<String> setupPayoutAccount() async {
    final response = await _request(
      method: 'POST',
      endpoint: '/referrals/connect/setup',
    );
    return response['url'] ?? '';
  }

  /// Check Stripe Connect payout status
  static Future<Map<String, dynamic>> getPayoutStatus() async {
    return _request(
      method: 'GET',
      endpoint: '/referrals/connect/status',
    );
  }

  /// Retry pending referral payouts
  static Future<Map<String, dynamic>> retryPendingPayouts() async {
    return _request(
      method: 'POST',
      endpoint: '/referrals/connect/retry-payouts',
    );
  }

  // ==================== REVIEW METHODS ====================

  /// Get reviews for a place
  static Future<List<dynamic>> getPlaceReviews({
    required String placeId,
  }) async {
    final response = await _request(
      method: 'GET',
      endpoint: '/reviews/places/$placeId/reviews',
    );
    return response['reviews'] ?? [];
  }

  /// Create a review for a place
  static Future<Map<String, dynamic>> createPlaceReview({
    required String placeId,
    required int rating,
    required String comment,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/reviews/places/$placeId',
      body: {
        'rating': rating,
        'comment': comment,
      },
    );
  }

  /// Update a review
  static Future<Map<String, dynamic>> updateReview({
    required String reviewId,
    int? rating,
    String? comment,
  }) async {
    final body = <String, dynamic>{};
    if (rating != null) body['rating'] = rating;
    if (comment != null) body['comment'] = comment;

    return _request(
      method: 'PATCH',
      endpoint: '/reviews/$reviewId',
      body: body,
    );
  }

  /// Delete a review
  static Future<Map<String, dynamic>> deleteReview({
    required String reviewId,
  }) async {
    return _request(
      method: 'DELETE',
      endpoint: '/reviews/$reviewId',
    );
  }

  /// Submit contact message
  static Future<Map<String, dynamic>> submitContact({
    required int userId,
    required String userEmail,
    required String category,
    required String subject,
    required String message,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/contacts/submit',
      body: {
        'userId': userId,
        'userEmail': userEmail,
        'category': category,
        'subject': subject,
        'message': message,
      },
    );
  }

  /// Get all contact messages (admin only)
  static Future<Map<String, dynamic>> getContacts({
    String status = 'new',
    int limit = 50,
    int offset = 0,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '/contacts?status=$status&limit=$limit&offset=$offset',
    );
  }

  /// Get single contact message (admin only)
  static Future<Map<String, dynamic>> getContact({
    required String contactId,
  }) async {
    return _request(
      method: 'GET',
      endpoint: '/contacts/$contactId',
    );
  }

  /// Update contact message (admin only)
  static Future<Map<String, dynamic>> updateContact({
    required String contactId,
    String? status,
    String? adminNotes,
  }) async {
    final body = <String, dynamic>{};
    if (status != null) body['status'] = status;
    if (adminNotes != null) body['adminNotes'] = adminNotes;
    
    return _request(
      method: 'PATCH',
      endpoint: '/contacts/$contactId',
      body: body,
    );
  }

  /// Get auto-message templates for a place
  static Future<Map<String, dynamic>> getAutoMessageTemplates({required int placeId}) async {
    return _request(
      method: 'GET',
      endpoint: '/auto-messages/place/$placeId',
    );
  }

  /// Save auto-message templates for a place
  static Future<Map<String, dynamic>> saveAutoMessageTemplates({
    required int placeId,
    required List<Map<String, dynamic>> templates,
  }) async {
    return _request(
      method: 'PUT',
      endpoint: '/auto-messages/place/$placeId',
      body: {'templates': templates},
    );
  }

  /// Get the API base URL (useful for debugging)
  static String getBaseUrl() => _baseUrl;

  /// Check if host has accepted the contract
  static Future<Map<String, dynamic>> getHostContractStatus() async {
    return _request(
      method: 'GET',
      endpoint: '/auth/host-contract-status',
    );
  }

  /// Accept the host contract with signature
  static Future<Map<String, dynamic>> acceptHostContract({
    required String version,
    required String signatureData,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/auth/accept-host-contract',
      body: {'version': version, 'signature_data': signatureData},
    );
  }

  /// Get onboarding status for current host
  static Future<Map<String, dynamic>> getOnboardingStatus() async {
    return _request(
      method: 'GET',
      endpoint: '/auth/onboarding-status',
    );
  }

  /// Resend email verification link
  static Future<Map<String, dynamic>> resendVerification() async {
    return _request(
      method: 'POST',
      endpoint: '/auth/resend-verification',
    );
  }

  /// Get current user profile (includes `verified` field)
  static Future<Map<String, dynamic>> getCurrentUser() async {
    return _request(
      method: 'GET',
      endpoint: '/auth/me',
    );
  }
}

/// Result of attempting to refresh the access token.
enum _RefreshResult {
  /// New access token issued; retry the original request.
  success,

  /// Refresh token explicitly rejected (401/403) or missing. Auth must be cleared.
  rejected,

  /// Transient failure (network, timeout, 5xx). Keep auth, surface the error.
  failed,
}

/// Custom exception for API errors
class ApiException implements Exception {
  final int statusCode;
  final String message;
  final List<dynamic>? errors;

  ApiException({
    required this.statusCode,
    required this.message,
    this.errors,
  });

  @override
  String toString() => message;

  String get errorMessage {
    if (errors != null && errors!.isNotEmpty) {
      return errors!.join(', ');
    }
    return message;
  }

  bool get isNetworkError => statusCode == 0;
  bool get isUnauthorized => statusCode == 401;
  bool get isConflict => statusCode == 409;
  bool get isNotFound => statusCode == 404;
}

// Extension for timeout exception
class TimeoutException implements Exception {
  final String message;
  TimeoutException(this.message);

  @override
  String toString() => message;
}

// Extension for socket exception
class SocketException implements Exception {
  final String message;
  SocketException(this.message);

  @override
  String toString() => message;
}
