import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

/// UK regions with bounding boxes for offline map data
class OfflineRegion {
  final String id;
  final String name;
  final String description;
  final double minLat, maxLat, minLng, maxLng;

  const OfflineRegion({
    required this.id,
    required this.name,
    required this.description,
    required this.minLat,
    required this.maxLat,
    required this.minLng,
    required this.maxLng,
  });

  bool containsPlace(double lat, double lng) {
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }
}

class OfflineService {
  static const String _downloadedRegionsKey = 'offline_downloaded_regions';
  static const String _lastSyncKey = 'offline_last_sync_';

  /// All UK regions — covering the entire UK with memorable travel names
  static const List<OfflineRegion> ukRegions = [
    OfflineRegion(
      id: 'scottish_highlands',
      name: 'Scottish Highlands',
      description: 'Inverness, Fort William, Loch Ness, Skye',
      minLat: 56.4, maxLat: 58.7, minLng: -7.5, maxLng: -2.5,
    ),
    OfflineRegion(
      id: 'scottish_lowlands',
      name: 'Central & Southern Scotland',
      description: 'Edinburgh, Glasgow, Stirling, Borders',
      minLat: 54.8, maxLat: 56.4, minLng: -6.5, maxLng: -1.8,
    ),
    OfflineRegion(
      id: 'lake_district_north',
      name: 'Lake District & North East',
      description: 'Cumbria, Newcastle, Durham, Northumberland',
      minLat: 53.8, maxLat: 55.8, minLng: -3.8, maxLng: -1.4,
    ),
    OfflineRegion(
      id: 'yorkshire',
      name: 'Yorkshire & The Humber',
      description: 'York, Leeds, Sheffield, the Dales & Moors',
      minLat: 53.3, maxLat: 54.5, minLng: -2.6, maxLng: -0.1,
    ),
    OfflineRegion(
      id: 'north_west',
      name: 'North West England',
      description: 'Manchester, Liverpool, Lancashire, Blackpool',
      minLat: 53.0, maxLat: 54.3, minLng: -3.8, maxLng: -2.0,
    ),
    OfflineRegion(
      id: 'north_wales',
      name: 'North Wales',
      description: 'Snowdonia, Anglesey, Conwy, Llandudno',
      minLat: 52.5, maxLat: 53.5, minLng: -5.3, maxLng: -2.8,
    ),
    OfflineRegion(
      id: 'mid_wales',
      name: 'Mid & West Wales',
      description: 'Brecon Beacons, Pembrokeshire, Ceredigion',
      minLat: 51.4, maxLat: 52.5, minLng: -5.5, maxLng: -2.8,
    ),
    OfflineRegion(
      id: 'east_midlands',
      name: 'East Midlands',
      description: 'Peak District, Nottingham, Lincoln, Leicester',
      minLat: 52.3, maxLat: 53.5, minLng: -2.0, maxLng: 0.2,
    ),
    OfflineRegion(
      id: 'west_midlands',
      name: 'West Midlands',
      description: 'Birmingham, Cotswolds, Shropshire, Warwick',
      minLat: 51.9, maxLat: 53.0, minLng: -3.2, maxLng: -1.2,
    ),
    OfflineRegion(
      id: 'east_anglia',
      name: 'East Anglia',
      description: 'Norfolk Broads, Suffolk, Cambridge, Essex',
      minLat: 51.5, maxLat: 53.0, minLng: 0.0, maxLng: 1.8,
    ),
    OfflineRegion(
      id: 'south_wales',
      name: 'South Wales',
      description: 'Cardiff, Swansea, Gower, Vale of Glamorgan',
      minLat: 51.3, maxLat: 51.9, minLng: -5.3, maxLng: -2.6,
    ),
    OfflineRegion(
      id: 'south_west',
      name: 'South West England',
      description: 'Cornwall, Devon, Dorset, Somerset, Bristol',
      minLat: 50.0, maxLat: 51.6, minLng: -5.8, maxLng: -2.0,
    ),
    OfflineRegion(
      id: 'south_central',
      name: 'South Central England',
      description: 'New Forest, Salisbury, Bath, Wiltshire, Oxford',
      minLat: 50.6, maxLat: 52.0, minLng: -2.0, maxLng: -0.5,
    ),
    OfflineRegion(
      id: 'south_east',
      name: 'South East England',
      description: 'Kent, Sussex, Surrey, Hampshire, Brighton',
      minLat: 50.5, maxLat: 51.6, minLng: -1.5, maxLng: 1.5,
    ),
    OfflineRegion(
      id: 'london',
      name: 'Greater London',
      description: 'London and the M25 corridor',
      minLat: 51.25, maxLat: 51.75, minLng: -0.55, maxLng: 0.35,
    ),
    OfflineRegion(
      id: 'northern_ireland',
      name: 'Northern Ireland',
      description: 'Belfast, Causeway Coast, Fermanagh',
      minLat: 53.9, maxLat: 55.4, minLng: -8.2, maxLng: -5.4,
    ),
  ];

  /// Get the offline cache directory
  static Future<Directory> _getCacheDir() async {
    final appDir = await getApplicationDocumentsDirectory();
    final cacheDir = Directory('${appDir.path}/offline_cache');
    if (!await cacheDir.exists()) {
      await cacheDir.create(recursive: true);
    }
    return cacheDir;
  }

  /// Get list of downloaded region IDs
  static Future<List<String>> getDownloadedRegions() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_downloadedRegionsKey) ?? [];
  }

  /// Check if a region is downloaded
  static Future<bool> isRegionDownloaded(String regionId) async {
    final downloaded = await getDownloadedRegions();
    return downloaded.contains(regionId);
  }

  /// Check if device is online
  static Future<bool> isOnline() async {
    final result = await Connectivity().checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  /// Download a region's data: places, reviews, and images
  static Future<void> downloadRegion(
    String regionId, {
    void Function(String status, double progress)? onProgress,
  }) async {
    final region = ukRegions.firstWhere((r) => r.id == regionId);
    final cacheDir = await _getCacheDir();
    final regionDir = Directory('${cacheDir.path}/$regionId');
    if (!await regionDir.exists()) {
      await regionDir.create(recursive: true);
    }

    onProgress?.call('Downloading sites...', 0.1);

    // 1. Fetch all approved places
    final placesResp = await http.get(
      Uri.parse('${AppConfig.properPlaceBackendUrl}/places'),
    );
    if (placesResp.statusCode != 200) throw Exception('Failed to fetch places');
    final allPlaces = (jsonDecode(placesResp.body)['places'] as List)
        .map((p) => p as Map<String, dynamic>)
        .toList();

    // Filter to places in this region
    final regionPlaces = allPlaces.where((p) {
      final lat = double.tryParse((p['location_lat'] ?? p['latitude'] ?? 0).toString()) ?? 0;
      final lng = double.tryParse((p['location_lng'] ?? p['longitude'] ?? 0).toString()) ?? 0;
      return region.containsPlace(lat, lng);
    }).toList();

    // Save places JSON
    await File('${regionDir.path}/places.json').writeAsString(jsonEncode(regionPlaces));

    onProgress?.call('Downloading reviews...', 0.3);

    // 2. Fetch reviews for each place
    final allReviews = <String, List<dynamic>>{};
    for (int i = 0; i < regionPlaces.length; i++) {
      final placeId = (regionPlaces[i]['id'] ?? regionPlaces[i]['place_id']).toString();
      try {
        final reviewResp = await http.get(
          Uri.parse('${AppConfig.properPlaceBackendUrl}/reviews/places/$placeId/reviews'),
        );
        if (reviewResp.statusCode == 200) {
          final data = jsonDecode(reviewResp.body);
          allReviews[placeId] = data['reviews'] ?? [];
        }
      } catch (_) {
        // Skip if reviews fail for a place
      }
      onProgress?.call(
        'Downloading reviews... (${i + 1}/${regionPlaces.length})',
        0.3 + (0.2 * (i + 1) / regionPlaces.length),
      );
    }
    await File('${regionDir.path}/reviews.json').writeAsString(jsonEncode(allReviews));

    onProgress?.call('Downloading images...', 0.5);

    // 3. Download images
    final imagesDir = Directory('${regionDir.path}/images');
    if (!await imagesDir.exists()) {
      await imagesDir.create(recursive: true);
    }

    int imageIndex = 0;
    int totalImages = 0;
    for (var place in regionPlaces) {
      final urls = <String>[];
      if (place['image_url'] != null) urls.add(place['image_url'].toString());
      if (place['image_urls'] is List) {
        urls.addAll((place['image_urls'] as List).map((u) => u.toString()));
      }
      totalImages += urls.length;
    }

    for (var place in regionPlaces) {
      final placeId = (place['id'] ?? place['place_id']).toString();
      final urls = <String>[];
      if (place['image_url'] != null) urls.add(place['image_url'].toString());
      if (place['image_urls'] is List) {
        urls.addAll((place['image_urls'] as List).map((u) => u.toString()));
      }
      // Deduplicate
      final uniqueUrls = urls.toSet().toList();

      for (int j = 0; j < uniqueUrls.length; j++) {
        try {
          var url = uniqueUrls[j];
          if (!url.startsWith('http')) {
            url = '${AppConfig.properPlaceBackendUrl}$url';
          }
          final imgResp = await http.get(Uri.parse(url));
          if (imgResp.statusCode == 200) {
            // Use a hash of the URL as filename to avoid collisions
            final filename = '${placeId}_$j.jpg';
            await File('${imagesDir.path}/$filename').writeAsBytes(imgResp.bodyBytes);
          }
        } catch (_) {
          // Skip failed image downloads
        }
        imageIndex++;
        if (totalImages > 0) {
          onProgress?.call(
            'Downloading images... ($imageIndex/$totalImages)',
            0.5 + (0.45 * imageIndex / totalImages),
          );
        }
      }
    }

    // 4. Save download metadata
    final prefs = await SharedPreferences.getInstance();
    final downloaded = prefs.getStringList(_downloadedRegionsKey) ?? [];
    if (!downloaded.contains(regionId)) {
      downloaded.add(regionId);
      await prefs.setStringList(_downloadedRegionsKey, downloaded);
    }
    await prefs.setString(
      '$_lastSyncKey$regionId',
      DateTime.now().toIso8601String(),
    );

    onProgress?.call('Download complete!', 1.0);
  }

  /// Remove a downloaded region
  static Future<void> removeRegion(String regionId) async {
    final cacheDir = await _getCacheDir();
    final regionDir = Directory('${cacheDir.path}/$regionId');
    if (await regionDir.exists()) {
      await regionDir.delete(recursive: true);
    }
    final prefs = await SharedPreferences.getInstance();
    final downloaded = prefs.getStringList(_downloadedRegionsKey) ?? [];
    downloaded.remove(regionId);
    await prefs.setStringList(_downloadedRegionsKey, downloaded);
    await prefs.remove('$_lastSyncKey$regionId');
  }

  /// Get the last sync time for a region
  static Future<DateTime?> getLastSync(String regionId) async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString('$_lastSyncKey$regionId');
    if (str == null) return null;
    return DateTime.tryParse(str);
  }

  /// Load cached places for all downloaded regions
  static Future<List<Map<String, dynamic>>> getOfflinePlaces() async {
    final downloaded = await getDownloadedRegions();
    final cacheDir = await _getCacheDir();
    final allPlaces = <Map<String, dynamic>>[];
    final seenIds = <String>{};

    for (var regionId in downloaded) {
      final file = File('${cacheDir.path}/$regionId/places.json');
      if (await file.exists()) {
        final data = jsonDecode(await file.readAsString()) as List;
        for (var p in data) {
          final id = (p['id'] ?? p['place_id']).toString();
          if (!seenIds.contains(id)) {
            seenIds.add(id);
            allPlaces.add(p as Map<String, dynamic>);
          }
        }
      }
    }
    return allPlaces;
  }

  /// Load cached reviews for a specific place
  static Future<List<dynamic>> getOfflineReviews(String placeId) async {
    final downloaded = await getDownloadedRegions();
    final cacheDir = await _getCacheDir();

    for (var regionId in downloaded) {
      final file = File('${cacheDir.path}/$regionId/reviews.json');
      if (await file.exists()) {
        final data = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
        if (data.containsKey(placeId)) {
          return data[placeId] as List<dynamic>;
        }
      }
    }
    return [];
  }

  /// Get the local file path for a cached image
  static Future<String?> getOfflineImagePath(String placeId, int imageIndex) async {
    final downloaded = await getDownloadedRegions();
    final cacheDir = await _getCacheDir();

    for (var regionId in downloaded) {
      final path = '${cacheDir.path}/$regionId/images/${placeId}_$imageIndex.jpg';
      if (await File(path).exists()) {
        return path;
      }
    }
    return null;
  }

  /// Sync all downloaded regions (call when online)
  static Future<void> syncDownloadedRegions({
    void Function(String regionName, double progress)? onProgress,
  }) async {
    if (!await isOnline()) return;

    final downloaded = await getDownloadedRegions();
    for (int i = 0; i < downloaded.length; i++) {
      final regionId = downloaded[i];
      final region = ukRegions.firstWhere((r) => r.id == regionId);
      try {
        await downloadRegion(
          regionId,
          onProgress: (status, progress) {
            onProgress?.call(region.name, (i + progress) / downloaded.length);
          },
        );
      } catch (e) {
        debugPrint('Error syncing region $regionId: $e');
      }
    }
  }

  /// Get total cache size in bytes
  static Future<int> getCacheSize() async {
    final cacheDir = await _getCacheDir();
    if (!await cacheDir.exists()) return 0;
    int total = 0;
    await for (var entity in cacheDir.list(recursive: true)) {
      if (entity is File) {
        total += await entity.length();
      }
    }
    return total;
  }

  /// Format bytes to human-readable string
  static String formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
