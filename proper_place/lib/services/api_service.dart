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

  /// Get the full API base URL from config
  static String get _baseUrl {
    final url = AppConfig.properPlaceBackendUrl;
    // Verify URL is not empty or just "base"
    if (url.isEmpty || url.length < 10 || !url.startsWith('http')) {
      print('[ApiService] ⚠️ Invalid base URL: "$url", using hardcoded fallback');
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

  /// Attempt to refresh the access token using the refresh token
  static Future<bool> _refreshAccessToken() async {
    if (_isRefreshing) return false;
    _isRefreshing = true;

    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) {
        print('[ApiService] No refresh token available');
        return false;
      }

      print('[ApiService] Attempting token refresh...');
      final url = Uri.parse('$_baseUrl/auth/refresh');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': refreshToken}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final newAccessToken = data['access_token'];
        final newRefreshToken = data['refresh_token'];

        if (newAccessToken != null) {
          await StorageService.saveToken(newAccessToken);
          if (newRefreshToken != null) {
            await StorageService.saveRefreshToken(newRefreshToken);
          }
          print('[ApiService] Token refresh successful');
          return true;
        }
      }

      print('[ApiService] Token refresh failed: ${response.statusCode}');
      return false;
    } catch (e) {
      print('[ApiService] Token refresh error: $e');
      return false;
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
          print('[ApiService] Got 401 - attempting auto-refresh');
          final refreshed = await _refreshAccessToken();
          if (refreshed) {
            // Retry the original request with new token
            return _request(
              method: method,
              endpoint: endpoint,
              body: body,
              headers: headers,
              isRetry: true,
            );
          }
          // Refresh failed - clear auth
          print('[ApiService] Token refresh failed - clearing auth');
          await StorageService.clearAll();
        }
        throw ApiException(
          statusCode: response.statusCode,
          message: data['message'] ?? 'Request failed',
          errors: data['errors'] as List<dynamic>?,
        );
      }
    } on io.SocketException catch (e) {
      print('[ApiService._request] [ERROR] SocketException: ${e.message}');
      print('[ApiService._request] [ERROR] Attempted URL: $_baseUrl');
      throw ApiException(
        statusCode: 0,
        message: 'Network error: ${e.message}',
      );
    } on TimeoutException catch (e) {
      print('[ApiService._request] [ERROR] TimeoutException: ${e.message}');
      throw ApiException(
        statusCode: 0,
        message: e.message,
      );
    } on FormatException catch (e) {
      print('[ApiService._request] [ERROR] FormatException: ${e.message}');
      throw ApiException(
        statusCode: 0,
        message: 'Invalid response format: ${e.message}',
      );
    } catch (e) {
      print('[ApiService._request] [ERROR] Unexpected error: $e');
      print('[ApiService._request] [ERROR] Attempted base URL: $_baseUrl');
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
    required String email,
    required String password,
  }) async {
    return _request(
      method: 'POST',
      endpoint: _authLoginEndpoint,
      body: {
        'email': email,
        'password': password,
      },
    );
  }

  /// Sign up new user
  /// Returns: { access_token, user_id, email, name, role, message }
  static Future<Map<String, dynamic>> signup({
    required String email,
    required String name,
    required String password,
    required String confirmPassword,
  }) async {
    return _request(
      method: 'POST',
      endpoint: _authSignupEndpoint,
      body: {
        'email': email,
        'name': name,
        'password': password,
        'confirmPassword': confirmPassword,
      },
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
      print('Error fetching facilities: $e');
      rethrow;
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
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/bookings',
      body: {
        'place_id': int.tryParse(placeId) ?? placeId,
        'check_in_date': checkIn,
        'check_out_date': checkOut,
        if (vanRegistration != null) 'van_registration': vanRegistration,
      },
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

  /// Create payment intent with Stripe
  static Future<Map<String, dynamic>> createPaymentIntent({
    required int amount,
    required String currency,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/create-intent',
      body: {
        'amount': amount,
        'currency': currency,
      },
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
      },
    );
  }

  /// Refund a payment
  static Future<Map<String, dynamic>> refundPayment({
    required String paymentIntentId,
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/payments/refund',
      body: {
        'paymentIntentId': paymentIntentId,
      },
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
  }) async {
    return _request(
      method: 'POST',
      endpoint: '/host-applications',
      body: {
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
      },
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
