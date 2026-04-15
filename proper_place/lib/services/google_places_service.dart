import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class GooglePlacesService {
  // Get this from your Google Cloud Console
  static const String apiKey = 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';
  static const String baseUrl = 'https://maps.googleapis.com/maps/api';

  /// Search for places by text query
  static Future<List<PlacePrediction>> searchPlaces(String input) async {
    if (input.isEmpty) return [];

    try {
      final encodedInput = Uri.encodeQueryComponent(input);
      final response = await http.get(
        Uri.parse(
          '$baseUrl/place/autocomplete/json?input=$encodedInput&key=$apiKey&components=country:uk',
        ),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final predictions = (json['predictions'] as List)
            .map((p) => PlacePrediction.fromJson(p))
            .toList();
        return predictions;
      }
      return [];
    } catch (e) {
    debugPrint('Error searching places: $e');
      return [];
    }
  }

  /// Get detailed information about a place (including lat/lng)
  static Future<PlaceDetails?> getPlaceDetails(String placeId) async {
    try {
      final encodedPlaceId = Uri.encodeQueryComponent(placeId);
      final response = await http.get(
        Uri.parse(
          '$baseUrl/place/details/json?place_id=$encodedPlaceId&fields=formatted_address,geometry,address_components&key=$apiKey',
        ),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return PlaceDetails.fromJson(json['result']);
      }
      return null;
    } catch (e) {
    debugPrint('Error getting place details: $e');
      return null;
    }
  }
}

class PlacePrediction {
  final String placeId;
  final String description;
  final String mainText;
  final String secondaryText;

  PlacePrediction({
    required this.placeId,
    required this.description,
    required this.mainText,
    required this.secondaryText,
  });

  factory PlacePrediction.fromJson(Map<String, dynamic> json) {
    return PlacePrediction(
      placeId: json['place_id'] ?? '',
      description: json['description'] ?? '',
      mainText: json['structured_formatting']?['main_text'] ?? '',
      secondaryText: json['structured_formatting']?['secondary_text'] ?? '',
    );
  }
}

class PlaceDetails {
  final String formattedAddress;
  final double latitude;
  final double longitude;
  final String city;
  final String country;

  PlaceDetails({
    required this.formattedAddress,
    required this.latitude,
    required this.longitude,
    required this.city,
    required this.country,
  });

  factory PlaceDetails.fromJson(Map<String, dynamic> json) {
    final geometry = json['geometry'] ?? {};
    final location = geometry['location'] ?? {};
    
    // Extract city and country from address components
    String city = '';
    String country = '';
    final components = json['address_components'] as List? ?? [];
    
    for (var component in components) {
      final types = component['types'] as List? ?? [];
      final longName = component['long_name'] ?? '';
      
      // Try multiple city type options in order of preference
      if (city.isEmpty) {
        if (types.contains('locality')) {
          city = longName;
        } else if (types.contains('postal_town')) {
          city = longName;
        } else if (types.contains('administrative_area_level_2')) {
          city = longName;
        } else if (types.contains('administrative_area_level_3')) {
          city = longName;
        }
      }
      
      if (types.contains('country')) {
        country = longName;
      }
    }

    return PlaceDetails(
      formattedAddress: json['formatted_address'] ?? '',
      latitude: (location['lat'] ?? 0.0).toDouble(),
      longitude: (location['lng'] ?? 0.0).toDouble(),
      city: city,
      country: country,
    );
  }
}
