import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';
import 'storage_service.dart';
import 'image_picker_service.dart';

class PlaceService {
  static String get baseUrl => AppConfig.properPlaceBackendUrl;

  // Flag to prevent infinite refresh loops
  static bool _isRefreshing = false;

  /// Attempt to refresh the access token using the refresh token
  static Future<bool> _refreshAccessToken() async {
    if (_isRefreshing) return false;
    _isRefreshing = true;

    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) {
        print('[PlaceService] No refresh token available');
        return false;
      }

      print('[PlaceService] Attempting token refresh...');
      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
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
          print('[PlaceService] Token refresh successful');
          return true;
        }
      }

      print('[PlaceService] Token refresh failed: ${response.statusCode}');
      return false;
    } catch (e) {
      print('[PlaceService] Token refresh error: $e');
      return false;
    } finally {
      _isRefreshing = false;
    }
  }

  /// Create a new site with address, description, etc.
  static Future<Map<String, dynamic>> createPlace(
    Map<String, dynamic> placeData,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.post(
        Uri.parse('$baseUrl/places'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(placeData),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final errorBody = response.body;
        print('Create place error response: $errorBody');
        throw Exception('Failed to create place: ${response.statusCode} - $errorBody');
      }
    } catch (e) {
      print('Error creating place: $e');
      rethrow;
    }
  }

  /// Update an existing site
  static Future<Map<String, dynamic>> updatePlace(
    int placeId,
    Map<String, dynamic> placeData,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.patch(
        Uri.parse('$baseUrl/places/$placeId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(placeData),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to update place: ${response.statusCode}');
      }
    } catch (e) {
      print('Error updating place: $e');
      rethrow;
    }
  }

  /// Upload photo(s) for a place
  /// [category] can be 'site' (default) or 'business'
  static Future<Map<String, dynamic>> uploadPlacePhotos(
    int placeId,
    List<File> photoFiles, {
    String category = 'site',
  }) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      // Strip EXIF data (location, etc) from photos before upload
      final cleanedFiles = await ImagePickerService.stripExifFromFiles(photoFiles);

      // Add category query parameter for business photos
      final queryParam = category == 'business' ? '?category=business' : '';
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/upload/place/$placeId$queryParam'),
      );

      request.headers['Authorization'] = 'Bearer $token';

      // Add all cleaned files to the multipart request
      for (int i = 0; i < cleanedFiles.length; i++) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'images', // Field name must match backend multer config
            cleanedFiles[i].path,
          ),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(
          'Failed to upload photos: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      print('Error uploading photos: $e');
      rethrow;
    }
  }

  /// Fetch all places for the current host
  static Future<List<dynamic>> getHostPlaces({bool isRetry = false}) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.get(
        Uri.parse('$baseUrl/places/host/my-places'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['places'] ?? [];
      } else if (response.statusCode == 401 && !isRetry) {
        // Token expired - try to refresh automatically
        print('[PlaceService] Got 401 - attempting auto-refresh');
        final refreshed = await _refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          return getHostPlaces(isRetry: true);
        }
        // Refresh failed - clear auth
        print('[PlaceService] Token refresh failed - clearing auth');
        await StorageService.clearAll();
        throw Exception('Session expired');
      } else {
        throw Exception('Failed to fetch places: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching places: $e');
      rethrow;
    }
  }

  /// Delete a place
  static Future<void> deletePlace(int placeId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.delete(
        Uri.parse('$baseUrl/places/$placeId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Failed to delete place: ${response.statusCode}');
      }
    } catch (e) {
      print('Error deleting place: $e');
      rethrow;
    }
  }

  /// Set a place unavailable for a date range or indefinitely
  static Future<Map<String, dynamic>> setPlaceUnavailable(
    int placeId, {
    required DateTime startDate,
    DateTime? endDate,
    required bool isIndefinite,
  }) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.post(
        Uri.parse('$baseUrl/places/$placeId/set-unavailable'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'startDate': startDate.toIso8601String().split('T')[0],
          'endDate': endDate != null ? endDate.toIso8601String().split('T')[0] : null,
          'isIndefinite': isIndefinite,
        }),
      );

      print('Set unavailable response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to set place unavailable: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Error setting place unavailable: $e');
      rethrow;
    }
  }

  /// Restore a place from indefinite unavailability back to available
  static Future<Map<String, dynamic>> setPlaceAvailable(int placeId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.post(
        Uri.parse('$baseUrl/places/$placeId/set-available'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      print('Set available response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to set place available: ${response.statusCode} - ${response.body}');
      }
    } catch (e) {
      print('Error setting place available: $e');
      rethrow;
    }
  }
}
