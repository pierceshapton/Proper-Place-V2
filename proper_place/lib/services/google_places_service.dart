import 'package:flutter/foundation.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class GooglePlacesService {
  // Get this from your Google Cloud Console
  static const String apiKey = 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';
  static const String baseUrl = 'https://maps.googleapis.com/maps/api';

  /// Fetch a driving route between two coordinates using the Directions API.
  static Future<DirectionsResult?> getDirections({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    try {
      final response = await http.get(
        Uri.parse(
          '$baseUrl/directions/json'
          '?origin=$originLat,$originLng'
          '&destination=$destLat,$destLng'
          '&mode=driving'
          '&key=$apiKey',
        ),
      );

      if (response.statusCode != 200) {
        debugPrint('Directions API HTTP error: ${response.statusCode}');
        return null;
      }

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      debugPrint('Directions API status: ${json['status']} | origin: $originLat,$originLng -> dest: $destLat,$destLng');
      if (json['status'] != 'OK') {
        debugPrint('Directions error_message: ${json['error_message']}');
      }
      final routes = json['routes'] as List? ?? [];
      if (routes.isEmpty) return null;

      final route = routes.first as Map<String, dynamic>;
      final overview = route['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overview?['points'] as String?;
      if (encoded == null || encoded.isEmpty) return null;

      final legs = route['legs'] as List? ?? [];
      int totalDistanceMeters = 0;
      int totalDurationSeconds = 0;
      for (final leg in legs) {
        totalDistanceMeters += ((leg['distance']?['value']) ?? 0) as int;
        totalDurationSeconds += ((leg['duration']?['value']) ?? 0) as int;
      }

      final points = decodePolyline(encoded);
      return DirectionsResult(
        polylinePoints: points,
        distanceMeters: totalDistanceMeters,
        durationSeconds: totalDurationSeconds,
      );
    } catch (e) {
      debugPrint('Error fetching directions: $e');
      return null;
    }
  }

  /// Use the Distance Matrix API to fetch drive durations (seconds) for many
  /// origin → destination pairs in a single batched request.
  /// Pairs are evaluated as (origins[i], destinations[i]). Returns null
  /// entries where no route is found. Issues each pair as a 1×1 request in
  /// parallel batches of 10 to stay within Google's 100-element limit and
  /// keep latency low.
  static Future<List<int?>> getDriveDurationsSeconds(
      List<LatLng> origins, List<LatLng> destinations) async {
    assert(origins.length == destinations.length);
    final List<int?> results = List<int?>.filled(origins.length, null);
    const int parallelism = 10;
    for (int start = 0; start < origins.length; start += parallelism) {
      final end = (start + parallelism > origins.length)
          ? origins.length
          : start + parallelism;
      final futures = <Future<void>>[];
      for (int i = start; i < end; i++) {
        final o = origins[i];
        final d = destinations[i];
        futures.add(() async {
          try {
            final response = await http.get(
              Uri.parse(
                '$baseUrl/distancematrix/json'
                '?origins=${o.latitude},${o.longitude}'
                '&destinations=${d.latitude},${d.longitude}'
                '&mode=driving'
                '&key=$apiKey',
              ),
            );
            if (response.statusCode != 200) {
              debugPrint(
                  'Distance Matrix HTTP error: ${response.statusCode}');
              return;
            }
            final json = jsonDecode(response.body) as Map<String, dynamic>;
            if (json['status'] != 'OK') {
              debugPrint(
                  'Distance Matrix status: ${json['status']} | error: ${json['error_message']}');
              return;
            }
            final rows = json['rows'] as List? ?? [];
            if (rows.isEmpty) return;
            final elements = (rows.first as Map<String, dynamic>)['elements']
                    as List? ??
                [];
            if (elements.isEmpty) return;
            final el = elements.first as Map<String, dynamic>;
            if (el['status'] == 'OK') {
              results[i] = ((el['duration']?['value']) ?? 0) as int;
            }
          } catch (e) {
            debugPrint('Distance Matrix error: $e');
          }
        }());
      }
      await Future.wait(futures);
    }
    return results;
  }

  /// Decode an encoded Google polyline string into a list of LatLng points.
  static List<LatLng> decodePolyline(String encoded) {
    final List<LatLng> points = [];
    int index = 0;
    final int len = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int b;
      int shift = 0;
      int result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final int dlat = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final int dlng = ((result & 1) != 0) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }

  /// Search for places by text query
  static Future<List<PlacePrediction>> searchPlaces(String input) async {
    if (input.isEmpty) return [];

    try {
      final encodedInput = Uri.encodeQueryComponent(input);
      final response = await http.get(
        Uri.parse(
          '$baseUrl/place/autocomplete/json?input=$encodedInput&key=$apiKey&components=country:uk&types=address',
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

/// Result of a Directions API request.
class DirectionsResult {
  final List<LatLng> polylinePoints;
  final int distanceMeters;
  final int durationSeconds;

  const DirectionsResult({
    required this.polylinePoints,
    required this.distanceMeters,
    required this.durationSeconds,
  });
}
