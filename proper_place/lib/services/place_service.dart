import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';
import 'storage_service.dart';

class PlaceService {
  static String get baseUrl => AppConfig.properPlaceBackendUrl;

  /// Create a new site with address, description, etc.
  static Future<Map<String, dynamic>> createPlace(
    Map<String, dynamic> placeData,
  ) async {
    try {
      final token = await StorageService.getString('access_token');
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
      final token = await StorageService.getString('access_token');
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
  static Future<Map<String, dynamic>> uploadPlacePhotos(
    int placeId,
    List<File> photoFiles,
  ) async {
    try {
      final token = await StorageService.getString('access_token');
      if (token == null) throw Exception('No authentication token found');

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/upload/place/$placeId'),
      );

      request.headers['Authorization'] = 'Bearer $token';

      // Add all files to the multipart request
      for (int i = 0; i < photoFiles.length; i++) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'images', // Field name must match backend multer config
            photoFiles[i].path,
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
  static Future<List<dynamic>> getHostPlaces() async {
    try {
      final token = await StorageService.getString('access_token');
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
      final token = await StorageService.getString('access_token');
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
}
