import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';
import 'dart:ui' as ui;
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/google_places_service.dart';
import 'package:proper_place/services/offline_service.dart';
import 'package:proper_place/models/place.dart';
import 'package:proper_place/screens/place_detail_screen.dart';
import 'package:proper_place/widgets/google_places_address_field.dart';
import 'package:google_maps_cluster_manager/google_maps_cluster_manager.dart' as cluster_manager;
import 'dart:math' show cos, sin, pi, atan2, sqrt;

class PlaceClusterItem with cluster_manager.ClusterItem {
  final Place place;
  PlaceClusterItem(this.place);

  @override
  LatLng get location => LatLng(place.locationLat, place.locationLng);
}

class MapPlacesScreen extends StatefulWidget {
  const MapPlacesScreen({Key? key}) : super(key: key);

  @override
  State<MapPlacesScreen> createState() => _MapPlacesScreenState();
}

class _MapPlacesScreenState extends State<MapPlacesScreen> {
  GoogleMapController? mapController;
  Set<Marker> markers = {};
  Set<Circle> _searchCircles = {};
  LatLng? currentLocation;
  bool isLoading = true;
  bool isOfflineMode = false;
  List<Place> places = [];
  double currentZoom = 6;
  Set<String> favoriteIds = {};
  MapType mapType = MapType.normal; // Add map type control
  bool _showOnlyFavorites = false;
  static const double MIN_ZOOM_FOR_MARKERS =
      11; // Show markers only when zoomed in to level 11+

  // Facility filters
  Set<String> _activeFacilityFilters = {};

  // Clustering and grey overlay
  cluster_manager.ClusterManager<PlaceClusterItem>? _clusterManager;
  Set<Polygon> _greyPolygons = {};
  bool _greyOverlayVisible = true;

  // Route planning
  double maxTimeOffRoute = 5.0;
  String? startAddress;
  String? destinationAddress;
  double? startLat, startLng;
  double? destLat, destLng;

  // Route results
  bool _routeMode = false;
  Set<Polyline> _routePolylines = {};
  Set<Marker> _routePlaceMarkers = {};
  List<_PlaceAlongRoute> _placesAlongRoute = [];
  bool _routeLoading = false;
  int _focusedRouteIndex = -1;
  final Map<String, double> _ratingCache = {};

  // Pending focus place (set before places are loaded)
  Map<String, dynamic>? _pendingFocus;

  // Connectivity monitoring for auto-sync
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _isOnline = true;

  /// Whether to enable the Google Maps "my location" layer.
  /// Kept false until onboarding is complete so iOS doesn't show the
  /// location-permission dialog before the onboarding popup is dismissed.
  bool _myLocationEnabled = false;

  /// Call this to refresh markers (e.g. after vehicle dimensions change)
  void refreshMarkers() {
    _refreshClusterMarkers();
  }

  /// Request location permission and move map to user's position.
  /// Called from HomeScreen after onboarding completes.
  void requestLocation() {
    if (mounted) {
      setState(() => _myLocationEnabled = true);
    }
    _getCurrentLocation();
  }

  /// Zoom to a specific place and open its detail popup
  void focusOnPlace(String placeId, double lat, double lng) async {
    if (places.isEmpty) {
      // Places not loaded yet — store for later
      _pendingFocus = {'id': placeId, 'lat': lat, 'lng': lng};
      return;
    }
    _pendingFocus = null;
    // Zoom in to ensure markers are visible
    await mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(LatLng(lat, lng), 14),
    );
    // Wait for camera animation and markers to update
    await Future.delayed(const Duration(milliseconds: 800));
    _refreshClusterMarkers();
    // Find the place and show its detail popup
    final place = places.where((p) => p.placeId == placeId).firstOrNull;
    if (place != null && mounted) {
      _showPlaceDetails(place);
    }
  }

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    try {
      isOfflineMode = await StorageService.getOfflineMode();
      _isOnline = await OfflineService.isOnline();

      // Listen for connectivity changes — auto-sync when back online
      _connectivitySub = Connectivity().onConnectivityChanged.listen((results) async {
        final online = !results.contains(ConnectivityResult.none);
        if (online && !_isOnline) {
          // Just came back online — sync downloaded regions in background
          _isOnline = true;
          OfflineService.syncDownloadedRegions().then((_) {
            if (mounted) _loadPlaces();
          });
        }
        _isOnline = online;
      });

      // Load cached map location
      final cachedLocation = await StorageService.getCachedMapLocation();
        if (!mounted) return;
        setState(() {
        currentLocation =
            LatLng(cachedLocation['latitude']!, cachedLocation['longitude']!);
        currentZoom = cachedLocation['zoom']!;
      });

      await _loadFavorites();
      // Only fetch GPS on first launch (no cached position yet).
      // Skip if onboarding hasn't been completed — location permission will
      // be requested by HomeScreen once the onboarding popup is dismissed.
      final prefs = await SharedPreferences.getInstance();
      final userId = await StorageService.getUserId();
      final perUserDone =
          userId != null && (prefs.getBool('onboarding_done_$userId') ?? false);
      final globalDone = prefs.getBool('onboarding_done_global') ?? false;
      final onboardingDone = perUserDone || globalDone;

      // Enable the Google Maps "my location" blue dot only when we have
      // permission to ask for location (i.e. after onboarding).
      if (onboardingDone && mounted) {
        setState(() => _myLocationEnabled = true);
      }

      if (prefs.getDouble('map_last_lat') == null) {
        debugPrint(
            '[MapInit] firstLaunch=true userId=$userId onboardingDone=$onboardingDone');
        if (onboardingDone) {
          await _getCurrentLocation();
        }
      }
      await _loadPlaces();
        if (!mounted) return;
        setState(() => isLoading = false);
    } catch (e) {
    debugPrint('Error initializing map: $e');
        if (!mounted) return;
        setState(() => isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading map: $e')),
        );
      }
    }
  }

  Future<void> _loadFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final favoritesList = prefs.getStringList('favorite_places') ?? [];
        if (!mounted) return;
        setState(() {
        favoriteIds = favoritesList.toSet();
      });
    } catch (e) {
    debugPrint('Error loading favorites: $e');
    }
  }

  // Cache for marker icons to avoid reloading PNGs repeatedly
  final Map<String, BitmapDescriptor> _markerIconCache = {};

  Future<BitmapDescriptor> _getCustomMarkerIcon(bool isFavorite, {bool vehicleFits = true}) async {
    if (isFavorite) {
      const String cacheKey = 'heart_red';
      if (_markerIconCache.containsKey(cacheKey)) {
        return _markerIconCache[cacheKey]!;
      }
      final descriptor = await _buildHeartMarker();
      _markerIconCache[cacheKey] = descriptor;
      return descriptor;
    }

    final String assetName = vehicleFits
        ? 'assets/images/map_pin_blue.png'
        : 'assets/images/map_pin_orange.png';

    if (_markerIconCache.containsKey(assetName)) {
      return _markerIconCache[assetName]!;
    }

    final ByteData data = await rootBundle.load(assetName);
    final ui.Codec codec = await ui.instantiateImageCodec(
      data.buffer.asUint8List(),
      targetWidth: 75,
    );
    final ui.FrameInfo fi = await codec.getNextFrame();
    final ByteData? byteData = await fi.image.toByteData(format: ui.ImageByteFormat.png);
    final descriptor = BitmapDescriptor.fromBytes(byteData!.buffer.asUint8List());
    _markerIconCache[assetName] = descriptor;
    return descriptor;
  }

  Future<BitmapDescriptor> _buildHeartMarker() async {
    const double size = 90;
    final ui.PictureRecorder recorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(recorder);

    final heartPath = Path();
    const double w = size;
    const double h = size;
    // Heart shape centered in the canvas
    heartPath.moveTo(w * 0.5, h * 0.85);
    heartPath.cubicTo(w * 0.15, h * 0.55, -w * 0.05, h * 0.25, w * 0.25, h * 0.1);
    heartPath.cubicTo(w * 0.38, h * 0.02, w * 0.5, h * 0.15, w * 0.5, h * 0.25);
    heartPath.cubicTo(w * 0.5, h * 0.15, w * 0.62, h * 0.02, w * 0.75, h * 0.1);
    heartPath.cubicTo(w * 1.05, h * 0.25, w * 0.85, h * 0.55, w * 0.5, h * 0.85);
    heartPath.close();

    // Fill
    canvas.drawPath(heartPath, Paint()
      ..color = const Color(0xFFE53935)
      ..style = PaintingStyle.fill);

    // Border
    canvas.drawPath(heartPath, Paint()
      ..color = const Color(0xFFB71C1C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5);

    final ui.Image image = await recorder.endRecording().toImage(size.toInt(), size.toInt());
    final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.fromBytes(byteData!.buffer.asUint8List());
  }

  Future<void> _toggleFavorite(String placeId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final favoritesList = prefs.getStringList('favorite_places') ?? [];

      setState(() {
        if (favoriteIds.contains(placeId)) {
          favoriteIds.remove(placeId);
          favoritesList.remove(placeId);
        } else {
          favoriteIds.add(placeId);
          favoritesList.add(placeId);
        }
      });

      await prefs.setStringList('favorite_places', favoritesList);
      _refreshClusterMarkers(); // Refresh markers with updated favorites
    } catch (e) {
    debugPrint('Error toggling favorite: $e');
    }
  }

  Future<double> _getAverageRating(String placeId) async {
    if (_ratingCache.containsKey(placeId)) {
      return _ratingCache[placeId]!;
    }
    // Fake ratings for dummy/test places so the rating UI is visible
    if (placeId.startsWith('test_')) {
      // Deterministic fake rating between 3.5 and 5.0 based on placeId hash
      final hash = placeId.hashCode.abs();
      final fake = 3.5 + ((hash % 16) / 10.0); // 3.5 .. 5.0
      _ratingCache[placeId] = fake;
      return fake;
    }
    try {
      final reviews = await ApiService.getPlaceReviews(placeId: placeId);
      if (reviews.isEmpty) {
        _ratingCache[placeId] = 0.0;
        return 0.0;
      }
      double totalRating = 0;
      for (var review in reviews) {
        final rating = review['rating'] ?? 0;
        totalRating += (rating is int ? rating.toDouble() : double.tryParse(rating.toString()) ?? 0);
      }
      final avg = totalRating / reviews.length;
      _ratingCache[placeId] = avg;
      return avg;
    } catch (e) {
      debugPrint('Error getting average rating: $e');
      _ratingCache[placeId] = 0.0;
      return 0.0;
    }
  }


  Future<void> _getCurrentLocation() async {
    try {
      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied')),
          );
        }
        return;
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      if (!mounted) return;
      setState(() {
        currentLocation = LatLng(position.latitude, position.longitude);
        StorageService.cacheMapLocation(
          latitude: position.latitude,
          longitude: position.longitude,
          zoom: currentZoom,
        );
      });
      debugPrint(
          'Updated location to: ${position.latitude}, ${position.longitude}');
      await mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(position.latitude, position.longitude),
          14,
        ),
      );

      // Warn the user if this looks like the iOS simulator default (San Francisco)
      final isSanFrancisco =
          (position.latitude > 37 && position.latitude < 38) &&
              (position.longitude < -122 && position.longitude > -123);
      if (isSanFrancisco && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Using simulator default location (San Francisco). Set a custom location in Simulator > Features > Location.'),
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not get location: $e')),
        );
      }
    }
  }

  Future<void> _loadPlaces() async {
    try {
      List<Map<String, dynamic>> placesData;

      // Use offline cache if we have downloaded regions and are offline
      final downloadedRegions = await OfflineService.getDownloadedRegions();
      if (!_isOnline && downloadedRegions.isNotEmpty) {
        placesData = await OfflineService.getOfflinePlaces();
      } else {
        final raw = await ApiService.getApprovedPlaces();
        placesData = raw.cast<Map<String, dynamic>>();
      }

      List<Place> loadedPlaces = placesData
          .map((p) => Place.fromJson(p))
          .toList();

      // Apply vehicle size filter if enabled
      final filterEnabled = await StorageService.getSizeFilterEnabled();
      if (filterEnabled) {
        final userHeight = await StorageService.getVehicleHeight();
        final userWidth = await StorageService.getVehicleWidth();
        final userLength = await StorageService.getVehicleLength();
        
        // Only filter if user has actually set dimensions
        final hasDimensions = userHeight != null || userWidth != null || userLength != null;
        if (hasDimensions) {
          loadedPlaces = loadedPlaces.where((place) {
            // If place has no size limits, it's considered to fit all vehicles
            if (place.maxVehicleHeightFt == null && 
                place.maxVehicleWidthFt == null && 
                place.maxVehicleLengthFt == null) {
              return true;
            }
            
            // Check each dimension - place must accommodate user's vehicle
            if (userHeight != null && place.maxVehicleHeightFt != null && place.maxVehicleHeightFt! < userHeight) {
              return false;
            }
            if (userWidth != null && place.maxVehicleWidthFt != null && place.maxVehicleWidthFt! < userWidth) {
              return false;
            }
            if (userLength != null && place.maxVehicleLengthFt != null && place.maxVehicleLengthFt! < userLength) {
              return false;
            }
            
            return true;
          }).toList();
        }
      }

        if (!mounted) return;
        setState(() {
        places = loadedPlaces;
      });

      _initClusterManager();
      _buildGreyOverlay();

      // If there's a pending focus request, execute it now
      if (_pendingFocus != null) {
        final pf = _pendingFocus!;
        // Small delay to let map controller be ready
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) {
            focusOnPlace(pf['id'] as String, pf['lat'] as double, pf['lng'] as double);
          }
        });
      }
    } catch (e) {
    debugPrint('Error loading places: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading places')),
        );
      }
    }
  }

  bool _vehicleFitsPlace(Place place, double? userHeight, double? userWidth, double? userLength) {
    // If place has no size limits, it fits all vehicles
    if (place.maxVehicleHeightFt == null &&
        place.maxVehicleWidthFt == null &&
        place.maxVehicleLengthFt == null) {
      return true;
    }
    if (userHeight != null && place.maxVehicleHeightFt != null && place.maxVehicleHeightFt! < userHeight) return false;
    if (userWidth != null && place.maxVehicleWidthFt != null && place.maxVehicleWidthFt! < userWidth) return false;
    if (userLength != null && place.maxVehicleLengthFt != null && place.maxVehicleLengthFt! < userLength) return false;
    return true;
  }

  Future<void> _updateMarkersForZoom() async => _refreshClusterMarkers();

  void _refreshClusterMarkers() {
    if (_clusterManager != null) {
      _clusterManager!.setItems(_getFilteredClusterItems());
      _clusterManager!.updateMap();
    }
  }

  List<PlaceClusterItem> _getFilteredClusterItems() {
    return places.where((place) {
      if (_showOnlyFavorites && !favoriteIds.contains(place.placeId)) return false;
      if (_activeFacilityFilters.isNotEmpty) {
        final placeAmenities = place.amenitiesList.map((a) => a.toLowerCase()).toSet();
        final matches = _activeFacilityFilters.every(
          (filter) => placeAmenities.any((a) => a.contains(filter.toLowerCase())),
        );
        if (!matches) return false;
      }
      return true;
    }).map((p) => PlaceClusterItem(p)).toList();
  }

  void _initClusterManager() {
    final items = _getFilteredClusterItems();
    _clusterManager = cluster_manager.ClusterManager<PlaceClusterItem>(
      items,
      (updatedMarkers) {
        if (mounted) setState(() => markers = updatedMarkers);
      },
      markerBuilder: _buildClusterMarkerFor,
    );
    if (mapController != null) {
      _clusterManager!.setMapId(mapController!.mapId);
      _clusterManager!.updateMap();
    }
  }

  Future<Marker> _buildClusterMarkerFor(cluster_manager.Cluster<PlaceClusterItem> cluster) async {
    if (cluster.isMultiple || currentZoom < MIN_ZOOM_FOR_MARKERS) {
      final icon = await _buildClusterIcon(count: cluster.count);
      return Marker(
        markerId: MarkerId(
          'cluster_${cluster.location.latitude}_${cluster.location.longitude}',
        ),
        position: cluster.location,
        icon: icon,
        onTap: cluster.isMultiple
            ? () => mapController?.animateCamera(
                  CameraUpdate.newLatLngZoom(cluster.location, currentZoom + 2),
                )
            : () => _showPlaceDetails(cluster.items.first.place),
      );
    }
    final place = cluster.items.first.place;
    final isFavorite = favoriteIds.contains(place.placeId);
    final userHeight = await StorageService.getVehicleHeight();
    final userWidth = await StorageService.getVehicleWidth();
    final userLength = await StorageService.getVehicleLength();
    final hasDimensions = userHeight != null || userWidth != null || userLength != null;
    final fits = !hasDimensions || _vehicleFitsPlace(place, userHeight, userWidth, userLength);
    final icon = await _getCustomMarkerIcon(isFavorite, vehicleFits: fits);
    return Marker(
      markerId: MarkerId(place.placeId),
      position: cluster.location,
      icon: icon,
      anchor: isFavorite ? const Offset(0.5, 0.85) : const Offset(0.5, 1.0),
      onTap: () => _showPlaceDetails(place),
    );
  }

  Future<BitmapDescriptor> _buildClusterIcon({int count = 0}) async {
    const String cacheKey = 'cluster_pin';
    if (_markerIconCache.containsKey(cacheKey)) return _markerIconCache[cacheKey]!;

    final ByteData pinData = await rootBundle.load('assets/images/map_pin_blue.png');
    final ui.Codec pinCodec = await ui.instantiateImageCodec(
      pinData.buffer.asUint8List(),
      targetWidth: 90,
    );
    final ui.FrameInfo pinFrame = await pinCodec.getNextFrame();
    final ByteData? byteData =
        await pinFrame.image.toByteData(format: ui.ImageByteFormat.png);
    final descriptor = BitmapDescriptor.fromBytes(byteData!.buffer.asUint8List());
    _markerIconCache[cacheKey] = descriptor;
    return descriptor;
  }

  void _buildGreyOverlay() {
    if (!mounted) return;
    const List<LatLng> outerBound = [
      LatLng(85, -180),
      LatLng(85, 180),
      LatLng(-85, 180),
      LatLng(-85, -180),
    ];
    // Punch a 25km hole around each site so those regions show through
    final List<List<LatLng>> holes =
        places.map((p) => _circlePoints(p.locationLat, p.locationLng, 25000)).toList();
    setState(() {
      _greyPolygons = {
        Polygon(
          polygonId: const PolygonId('grey_overlay'),
          points: outerBound,
          holes: holes,
          fillColor: Colors.grey.withOpacity(0.28),
          strokeWidth: 0,
        ),
      };
    });
  }

  List<LatLng> _circlePoints(double centerLat, double centerLng, double radiusMeters) {
    const int n = 32;
    const double earthRadius = 6371000.0;
    final double latRad = centerLat * pi / 180;
    return List.generate(n, (i) {
      // Counter-clockwise winding for polygon holes
      final double angle = 2 * pi * (n - i) / n;
      final double dLat = (radiusMeters / earthRadius) * cos(angle) * (180 / pi);
      final double dLng =
          (radiusMeters / (earthRadius * cos(latRad))) * sin(angle) * (180 / pi);
      return LatLng(centerLat + dLat, centerLng + dLng);
    });
  }

  void _updateGreyOverlayForZoom() {
    final shouldShow = currentZoom < MIN_ZOOM_FOR_MARKERS;
    if (shouldShow != _greyOverlayVisible) {
      if (mounted) setState(() => _greyOverlayVisible = shouldShow);
    }
  }

  void _showPlaceDetails(Place place) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _buildPlaceModal(place, setModalState),
      ),
    );
  }

  Widget _buildPlaceModal(Place place, StateSetter setModalState) {
    return FutureBuilder<double>(
      future: _getAverageRating(place.placeId),
      builder: (context, snapshot) {
        final averageRating = snapshot.data ?? 0.0;
        
        return Container(
          padding: const EdgeInsets.all(20),
          child: ListView(
            shrinkWrap: true,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: Icon(
                      favoriteIds.contains(place.placeId)
                          ? Icons.favorite
                          : Icons.favorite_border,
                      color:
                          favoriteIds.contains(place.placeId) ? Colors.red : null,
                    ),
                    onPressed: () {
                      _toggleFavorite(place.placeId);
                      setModalState(() {}); // Update heart icon immediately
                    },
                  ),
                  // Rating display
                  Expanded(
                    child: averageRating > 0
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              ...List.generate(
                                5,
                                (index) => Icon(
                                  index < averageRating.floor() ? Icons.star : Icons.star_outline,
                                  color: const Color(0xFFFFB800),
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                averageRating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            'No reviews yet',
                            style: TextStyle(
                              color: Colors.black54,
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              // Image
              _buildPlaceImage(place),
              const SizedBox(height: 16),
              // Price badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '£${place.pricePerNight.toStringAsFixed(0)}/night',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Name
              Text(
                place.name,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              // Description
              Text(
                place.description,
                style: const TextStyle(color: Colors.black, fontSize: 13),
              ),
              if (place.placeType != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Type: ${place.placeType!.replaceAll('_', ' ').split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}' : '').join(' ')}',
                    style: const TextStyle(color: Colors.black, fontSize: 12),
                  ),
                ),
              // Facilities icons
              if (place.amenitiesList.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: place.amenitiesList.map((facility) {
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_getFacilityIcon(facility), size: 18, color: Colors.black),
                        const SizedBox(width: 4),
                        Text(
                          facility,
                          style: const TextStyle(fontSize: 12, color: Colors.black),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 20),
              // View Details & Book button
              SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isOfflineMode ? Colors.grey : const Color(0xFF5B8DEE),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: isOfflineMode
                  ? () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content:
                              Text('Bookings are disabled in offline mode'),
                        ),
                      );
                    }
                  : () {
                      Navigator.pop(context);
                      // Convert Place to Map with expected keys for PlaceDetailScreen
                      final placeData = {
                        'id': place.placeId,
                        'name': place.name,
                        'description': place.description,
                        'address': place.address,
                        'price_per_night': place.pricePerNight,
                        'image_url': place.imageUrl ?? (place.imageUrls.isNotEmpty ? place.imageUrls.first : null),
                        'image_urls': place.imageUrls,
                        'latitude': place.locationLat,
                        'longitude': place.locationLng,
                        'place_type': place.placeType,
                        'amenities': place.amenities,
                        'host_name': place.hostName,
                        'capacity': place.capacity,
                        'facilities': place.amenitiesList,
                        'business_description': place.businessDescription,
                        'access_route_description': place.accessRouteDescription,
                        'max_vehicle_height_ft': place.maxVehicleHeightFt,
                        'max_vehicle_width_ft': place.maxVehicleWidthFt,
                        'max_vehicle_length_ft': place.maxVehicleLengthFt,
                        'opening_hours': place.openingHours,
                        'kitchen_hours': place.kitchenHours,
                        'food_menu_description': place.foodMenuDescription,
                      };
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              PlaceDetailScreen(place: placeData),
                        ),
                      );
                    },
              child: Text(
                isOfflineMode
                    ? 'Booking Disabled (Offline)'
                    : 'View Details & Book',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
      }
    );
  }

  void _showFacilityFilterSheet() {
    final allFacilities = [
      'WiFi',
      'Electricity Hookup',
      'Drinking water fill up point',
      'Chemical toilet disposal point',
      'Grey water disposal point',
      'Waste recycling point',
      'Restaurant/Pub',
      'Dog Friendly',
    ];

    // Local copy for the sheet
    Set<String> tempFilters = Set.from(_activeFacilityFilters);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Filter by Facilities', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  if (tempFilters.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        Navigator.pop(ctx);
                        setState(() {
                          _activeFacilityFilters = {};
                        });
                        _refreshClusterMarkers();
                      },
                      child: const Text('Clear All', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w600)),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Flexible(child: SingleChildScrollView(child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: allFacilities.map((facility) {
                  final isSelected = tempFilters.contains(facility);
                  return FilterChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(_getFacilityIcon(facility), size: 16,
                          color: isSelected ? Colors.white : Colors.black87),
                        const SizedBox(width: 6),
                        Text(facility, style: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontSize: 13,
                        )),
                      ],
                    ),
                    selected: isSelected,
                    onSelected: (selected) {
                      setSheetState(() {
                        if (selected) {
                          tempFilters.add(facility);
                        } else {
                          tempFilters.remove(facility);
                        }
                      });
                    },
                    selectedColor: Colors.blue,
                    backgroundColor: Colors.grey[100],
                    checkmarkColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  );
                }).toList(),
              ))),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _activeFacilityFilters = tempFilters;
                    });
                    _refreshClusterMarkers();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    tempFilters.isEmpty ? 'Show All Sites' : 'Apply Filters (${tempFilters.length})',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getFacilityIcon(String facility) {
    final lower = facility.toLowerCase();
    if (lower.contains('wifi')) return Icons.wifi;
    if (lower.contains('electric')) return Icons.bolt;
    if (lower.contains('water') && lower.contains('drink')) return Icons.water_drop;
    if (lower.contains('chemical') || lower.contains('toilet')) return Icons.delete_outline;
    if (lower.contains('grey water') || lower.contains('gray water')) return Icons.water;
    if (lower.contains('waste') || lower.contains('recycl')) return Icons.recycling;
    if (lower.contains('restaurant') || lower.contains('pub') || lower.contains('food')) return Icons.restaurant;
    if (lower.contains('dog')) return Icons.pets;
    return Icons.check_circle_outline;
  }

  /// Helper method to display place image with fallback to imageUrls
  Widget _buildPlaceImage(Place place) {
    // Get the best available image URL - prefer imageUrl, fallback to imageUrls
    final String? imageUrl = (place.imageUrl != null && place.imageUrl!.isNotEmpty)
        ? place.imageUrl
        : (place.imageUrls.isNotEmpty ? place.imageUrls.first : null);

    if (imageUrl != null && imageUrl.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          imageUrl,
          height: 200,
          width: double.infinity,
          fit: BoxFit.cover,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              height: 200,
              color: Colors.grey[300],
              child: const Center(
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                ),
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            return Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.image_not_supported),
            );
          },
        ),
      );
    }

    // No image available - show placeholder
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.image_not_supported),
    );
  }

  void _showSearchSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MapSearchSheet(
        onLocationSelected: (lat, lng, address) {
          Navigator.pop(context);
          final searchLatLng = LatLng(lat, lng);
          setState(() {
            _searchCircles = {
              Circle(
                circleId: const CircleId('search_result'),
                center: searchLatLng,
                radius: 500,
                fillColor: const Color(0xFF3B82F6).withOpacity(0.15),
                strokeColor: const Color(0xFF3B82F6),
                strokeWidth: 2,
              ),
            };
          });
          mapController?.animateCamera(
            CameraUpdate.newLatLngZoom(searchLatLng, 12),
          );
        },
      ),
    );
  }

  /// Public alias for screenshot helpers
  void showRouteForm() => _showRouteForm();

  void _showRouteForm() {
    double localMaxTimeOffRoute = maxTimeOffRoute;
    bool _useMyLocation = startAddress == 'My Location';
    bool _locationLoading = false;
    // When a route is already active, start clean; any field change marks dirty
    bool _formDirty = !_routeMode;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => SafeArea(
          maintainBottomViewPadding: true,
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              left: 16,
              right: 16,
              top: 16,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.85,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Center(
                      child: Text(
                        'Plan Your Route',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Starting location label (outside the field so the Row only aligns input + button)
                    const Text(
                      'Starting Location',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tap to search and select your address',
                      style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: GooglePlacesAddressField(
                            key: ValueKey(_useMyLocation
                                ? 'start_my_location'
                                : 'start_search'),
                            label: 'Starting Location',
                            showHeader: false,
                            prefillAddress: _useMyLocation
                                ? 'My Location'
                                : startAddress,
                            prefillLat: _useMyLocation
                                ? currentLocation?.latitude
                                : startLat,
                            prefillLng: _useMyLocation
                                ? currentLocation?.longitude
                                : startLng,
                            isMyLocation: _useMyLocation,
                            onAddressSelected: (address, lat, lng, city, country) {
                              setModalState(() {
                                _useMyLocation = false;
                                _formDirty = true;
                                startAddress = address;
                                startLat = lat;
                                startLng = lng;
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () async {
                            setModalState(() => _locationLoading = true);
                            try {
                              LocationPermission permission =
                                  await Geolocator.checkPermission();
                              if (permission == LocationPermission.denied) {
                                permission =
                                    await Geolocator.requestPermission();
                              }
                              if (permission == LocationPermission.denied ||
                                  permission ==
                                      LocationPermission.deniedForever) {
                                setModalState(() => _locationLoading = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Location permission denied'),
                                  ),
                                );
                                return;
                              }
                              final position =
                                  await Geolocator.getCurrentPosition(
                                desiredAccuracy: LocationAccuracy.high,
                              );
                              setModalState(() {
                                _locationLoading = false;
                                _useMyLocation = true;
                                _formDirty = true;
                                startAddress = 'My Location';
                                startLat = position.latitude;
                                startLng = position.longitude;
                                currentLocation = LatLng(
                                    position.latitude, position.longitude);
                              });
                              // Warn if this looks like the simulator default
                              final isSanFrancisco =
                                  (position.latitude > 37 && position.latitude < 38) &&
                                      (position.longitude < -122 && position.longitude > -123);
                              if (isSanFrancisco && context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Simulator default location detected (San Francisco). Set a UK location in Simulator > Features > Location > Custom Location.'),
                                    duration: Duration(seconds: 5),
                                  ),
                                );
                              }
                            } catch (e) {
                              // Fall back to cached location
                              if (currentLocation != null) {
                                setModalState(() {
                                  _locationLoading = false;
                                  _useMyLocation = true;
                                  _formDirty = true;
                                  startAddress = 'My Location';
                                  startLat = currentLocation!.latitude;
                                  startLng = currentLocation!.longitude;
                                });
                              } else {
                                setModalState(
                                    () => _locationLoading = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Could not get current location'),
                                  ),
                                );
                              }
                            }
                          },
                          child: Container(
                            height: 48,
                            width: 48,
                            decoration: BoxDecoration(
                              color: _useMyLocation
                                  ? const Color(0xFF1D4ED8)
                                  : const Color(0xFF5B8DEE),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: _locationLoading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.my_location,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Destination
                    GooglePlacesAddressField(
                      key: ValueKey(destinationAddress ?? 'dest_empty'),
                      label: 'Destination',
                      prefillAddress: destinationAddress,
                      prefillLat: destLat,
                      prefillLng: destLng,
                      onAddressSelected: (address, lat, lng, city, country) {
                        setModalState(() {
                          _formDirty = true;
                          destinationAddress = address;
                          destLat = lat;
                          destLng = lng;
                        });
                      },
                    ),
                    const SizedBox(height: 20),

                    const Text(
                      'Max Time Off Route',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'How far off your route are you willing to travel?',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue.shade200),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${localMaxTimeOffRoute.toStringAsFixed(0)} minutes',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700,
                            ),
                          ),
                          const SizedBox(height: 16),
                          SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              activeTrackColor: Colors.blue.shade400,
                              inactiveTrackColor: Colors.blue.shade100,
                              thumbColor: Colors.blue.shade600,
                              overlayColor: Colors.blue.withOpacity(0.2),
                              trackHeight: 8,
                              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 14),
                            ),
                            child: Slider(
                              value: localMaxTimeOffRoute,
                              min: 1,
                              max: 60,
                              divisions: 59,
                              onChanged: (value) {
                                setModalState(() {
                                  _formDirty = true;
                                  localMaxTimeOffRoute = value;
                                });
                              },
                            ),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('1 min', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                              Text('60 min', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: _routeMode && !_formDirty
                          ? ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFDC2626),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: () {
                                _clearRoute();
                                setModalState(() {
                                  _useMyLocation = false;
                                  _formDirty = true;
                                });
                              },
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.close, color: Colors.white),
                                  SizedBox(width: 8),
                                  Text(
                                    'Clear route',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF16A34A),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              onPressed: () {
                                if (startAddress == null || destinationAddress == null ||
                                    startLat == null || startLng == null ||
                                    destLat == null || destLng == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Please select valid addresses'),
                                    ),
                                  );
                                  return;
                                }
                                setState(() {
                                  maxTimeOffRoute = localMaxTimeOffRoute;
                                });
                                Navigator.pop(context);
                                _findPlacesAlongRoute();
                              },
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search, color: Colors.white),
                                  SizedBox(width: 8),
                                  Text(
                                    'Find places along your route',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Calculate the route between selected start/destination, draw it on the
  /// map, find Place sites within `maxTimeOffRoute` minutes of the route and
  /// display them as markers and as a sorted scrollable list at the bottom.
  Future<void> _findPlacesAlongRoute() async {
    if (startLat == null || startLng == null || destLat == null || destLng == null) {
      return;
    }

    setState(() => _routeLoading = true);

    final directions = await GooglePlacesService.getDirections(
      originLat: startLat!,
      originLng: startLng!,
      destLat: destLat!,
      destLng: destLng!,
    );

    if (directions == null || directions.polylinePoints.isEmpty) {
      if (!mounted) return;
      setState(() => _routeLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not calculate route')),
      );
      return;
    }

    final List<LatLng> route = directions.polylinePoints;

    // Prefilter using a generous haversine radius so we don't issue Distance
    // Matrix calls for sites that are nowhere near the route. Assume worst-case
    // diversion at 120 km/h → 2 km per minute.
    final double prefilterRadiusMeters = maxTimeOffRoute * 2000.0;

    // Pre-compute cumulative distance along the polyline.
    final List<double> cumDist = List<double>.filled(route.length, 0);
    for (int i = 1; i < route.length; i++) {
      cumDist[i] = cumDist[i - 1] +
          _distanceMeters(route[i - 1], route[i]);
    }

    // For each place, find the closest polyline point. Keep candidates that
    // are within the prefilter radius — we'll verify with real drive time
    // next.
    final List<_PlaceAlongRoute> candidates = [];
    final List<LatLng> origins = [];
    final List<LatLng> destinations = [];
    for (final p in places) {
      double minDist = double.infinity;
      int minIdx = 0;
      for (int i = 0; i < route.length; i++) {
        final d = _distanceMeters(
          LatLng(p.locationLat, p.locationLng),
          route[i],
        );
        if (d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }
      if (minDist <= prefilterRadiusMeters) {
        candidates.add(_PlaceAlongRoute(
          place: p,
          distanceFromRouteMeters: minDist,
          alongRouteMeters: cumDist[minIdx],
        ));
        origins.add(route[minIdx]);
        destinations.add(LatLng(p.locationLat, p.locationLng));
      }
    }

    // Query real driving durations from each closest route point to each site.
    final durations =
        await GooglePlacesService.getDriveDurationsSeconds(origins, destinations);

    debugPrint(
        '[RouteFilter] route points=${route.length} totalPlaces=${places.length} candidatesAfterPrefilter=${candidates.length} prefilterRadiusKm=${(prefilterRadiusMeters / 1000).toStringAsFixed(1)} maxMinutes=$maxTimeOffRoute');
    for (int i = 0; i < candidates.length; i++) {
      final c = candidates[i];
      final dur = durations[i];
      debugPrint(
          '[RouteFilter]  ${c.place.name}: ${(c.distanceFromRouteMeters / 1000).toStringAsFixed(1)} km from route, drive=${dur == null ? 'null' : '${(dur / 60).toStringAsFixed(1)} min'}');
    }

    // Keep only sites whose real drive time off the route is within the
    // user's limit (maxTimeOffRoute is in minutes).
    final int maxSeconds = (maxTimeOffRoute * 60).round();
    final List<_PlaceAlongRoute> filtered = [];
    for (int i = 0; i < candidates.length; i++) {
      final dur = durations[i];
      if (dur != null && dur <= maxSeconds) {
        filtered.add(_PlaceAlongRoute(
          place: candidates[i].place,
          distanceFromRouteMeters: candidates[i].distanceFromRouteMeters,
          alongRouteMeters: candidates[i].alongRouteMeters,
          driveDurationSeconds: dur,
        ));
      }
    }

    filtered.sort((a, b) => a.alongRouteMeters.compareTo(b.alongRouteMeters));

    // Build markers (small, always visible — bypass clustering).
    final BitmapDescriptor pinIcon = await _getCustomMarkerIcon(false);
    final Set<Marker> placeMarkers = {};
    for (int i = 0; i < filtered.length; i++) {
      final pl = filtered[i].place;
      placeMarkers.add(
        Marker(
          markerId: MarkerId('route_${pl.placeId}'),
          position: LatLng(pl.locationLat, pl.locationLng),
          icon: pinIcon,
          anchor: const Offset(0.5, 1.0),
          infoWindow: InfoWindow(
            title: '${i + 1}. ${pl.name}',
          ),
          onTap: () => _showPlaceDetails(pl),
        ),
      );
    }

    // Add start and destination markers.
    placeMarkers.add(
      Marker(
        markerId: const MarkerId('route_start'),
        position: LatLng(startLat!, startLng!),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(title: 'Start: ${startAddress ?? ''}'),
      ),
    );
    placeMarkers.add(
      Marker(
        markerId: const MarkerId('route_dest'),
        position: LatLng(destLat!, destLng!),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: 'Destination: ${destinationAddress ?? ''}'),
      ),
    );

    final polyline = Polyline(
      polylineId: const PolylineId('plan_route'),
      points: route,
      color: const Color(0xFF5B8DEE),
      width: 5,
    );

    if (!mounted) return;
    setState(() {
      _routeMode = true;
      _routeLoading = false;
      _routePolylines = {polyline};
      _routePlaceMarkers = placeMarkers;
      _placesAlongRoute = filtered;
      _greyOverlayVisible = false;
    });

    // Fit camera to the route bounds.
    final bounds = _boundsForPoints(route);
    if (bounds != null && mapController != null) {
      await mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, 60),
      );
    }

    if (!mounted) return;
    if (filtered.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'No sites found within ${maxTimeOffRoute.toStringAsFixed(0)} min of your route',
          ),
        ),
      );
    }
  }

  void _clearRoute() {
    setState(() {
      _routeMode = false;
      _routePolylines = {};
      _routePlaceMarkers = {};
      _placesAlongRoute = [];
      _focusedRouteIndex = -1;
      // Reset route form fields back to defaults
      startAddress = null;
      destinationAddress = null;
      startLat = null;
      startLng = null;
      destLat = null;
      destLng = null;
    });
    _refreshClusterMarkers();
  }

  /// Haversine distance between two LatLng points in meters.
  double _distanceMeters(LatLng a, LatLng b) {
    const double earthRadius = 6371000.0;
    final double lat1 = a.latitude * pi / 180;
    final double lat2 = b.latitude * pi / 180;
    final double dLat = (b.latitude - a.latitude) * pi / 180;
    final double dLng = (b.longitude - a.longitude) * pi / 180;
    final double h = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2);
    final double c = 2 * atan2(sqrt(h), sqrt(1 - h));
    return earthRadius * c;
  }

  LatLngBounds? _boundsForPoints(List<LatLng> pts) {
    if (pts.isEmpty) return null;
    double minLat = pts.first.latitude;
    double maxLat = pts.first.latitude;
    double minLng = pts.first.longitude;
    double maxLng = pts.first.longitude;
    for (final p in pts) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : currentLocation == null
              ? const Center(child: Text('Location not available'))
              : Stack(
                  children: [
                    // Google Map
                    GoogleMap(
                      onMapCreated: (controller) {
                        mapController = controller;
                        _clusterManager?.setMapId(controller.mapId);
                        _clusterManager?.updateMap();
                      },
                      onCameraIdle: () {
                        _clusterManager?.updateMap();
                      },
                      onCameraMove: (CameraPosition cameraPosition) {
                        currentZoom = cameraPosition.zoom;
                        _clusterManager?.onCameraMove(cameraPosition);
                        _updateGreyOverlayForZoom();

                        // Clear search circle when user pans/zooms
                        if (_searchCircles.isNotEmpty) {
                          setState(() => _searchCircles = {});
                        }

                        // Save map location to cache
                        StorageService.cacheMapLocation(
                          latitude: cameraPosition.target.latitude,
                          longitude: cameraPosition.target.longitude,
                          zoom: cameraPosition.zoom,
                        );
                      },
                      initialCameraPosition: CameraPosition(
                        target:
                            currentLocation ?? const LatLng(54.8, -2.8),
                        zoom: currentZoom,
                      ),
                      markers: _routeMode ? _routePlaceMarkers : markers,
                      polylines: _routePolylines,
                      circles: _searchCircles,
                      polygons: _greyOverlayVisible ? _greyPolygons : const {},
                      mapType: mapType,
                      myLocationEnabled: _myLocationEnabled,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                    ),
                    // Top left - Plan Route button
                    Positioned(
                      top: 60,
                      left: 16,
                      child: ElevatedButton.icon(
                        onPressed: _showRouteForm,
                        icon: Icon(Icons.directions,
                            color: _routeMode ? Colors.white : Colors.black),
                        label: Text('Plan Route',
                            style: TextStyle(
                                color: _routeMode ? Colors.white : Colors.black)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _routeMode
                              ? const Color(0xFF2979CC)
                              : Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    // Left side - Search button (below Plan Route)
                    Positioned(
                      top: 115,
                      left: 16,
                      child: GestureDetector(
                        onTap: _showSearchSheet,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.search, color: Colors.black87, size: 22),
                        ),
                      ),
                    ),
                    // Left side - My Location button (below Search)
                    Positioned(
                      top: 165,
                      left: 16,
                      child: GestureDetector(
                        onTap: _getCurrentLocation,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.my_location, color: Colors.black87, size: 22),
                        ),
                      ),
                    ),
                    // Left side - Filter button (below My Location)
                    Positioned(
                      top: 215,
                      left: 16,
                      child: GestureDetector(
                        onTap: _showFacilityFilterSheet,
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _activeFacilityFilters.isNotEmpty ? Colors.blue : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.tune,
                            color: _activeFacilityFilters.isNotEmpty ? Colors.white : Colors.black87,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                    // Left side - Favourites filter button (below Filter)
                    Positioned(
                      top: 265,
                      left: 16,
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _showOnlyFavorites = !_showOnlyFavorites);
                          _refreshClusterMarkers();
                        },
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _showOnlyFavorites ? Colors.red : Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            _showOnlyFavorites ? Icons.favorite : Icons.favorite_border,
                            color: _showOnlyFavorites ? Colors.white : Colors.red,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                    // Top right - Map Layer buttons
                    Positioned(
                      top: 60,
                      right: 16,
                      child: Column(
                        children: [
                          _buildMapTypeButton(Icons.map_outlined, MapType.normal),
                          const SizedBox(height: 8),
                          _buildMapTypeButton(Icons.satellite_alt, MapType.satellite),
                          const SizedBox(height: 8),
                          _buildMapTypeButton(Icons.terrain, MapType.terrain),
                          const SizedBox(height: 8),
                          _buildMapTypeButton(Icons.layers, MapType.hybrid),
                        ],
                      ),
                    ),
                    // Loading overlay while route is being calculated
                    if (_routeLoading)
                      const Positioned.fill(
                        child: ColoredBox(
                          color: Color(0x33000000),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      ),
                    // Scrollable list of places along the route
                    if (_routeMode)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: _buildPlacesAlongRouteList(),
                      ),
                  ],
                ),
    );
  }

  Widget _buildPlacesAlongRouteList() {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.18),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
              child: Row(
                children: [
                  const Icon(Icons.list_alt, color: Color(0xFF5B8DEE), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _placesAlongRoute.isEmpty
                          ? 'No sites found along your route'
                          : '${_placesAlongRoute.length} sites along your route',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 175,
              child: _placesAlongRoute.isEmpty
                  ? const Center(
                      child: Text(
                        'Try increasing the max time off route',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : NotificationListener<ScrollNotification>(
                      onNotification: (notification) {
                        if (notification is ScrollUpdateNotification ||
                            notification is ScrollEndNotification) {
                          // Card width 200 + separator 8 = 208 stride; +12 left padding
                          const stride = 208.0;
                          final offset = notification.metrics.pixels;
                          final idx = (offset / stride).round().clamp(
                              0, _placesAlongRoute.length - 1);
                          if (idx != _focusedRouteIndex) {
                            _focusedRouteIndex = idx;
                            final pl = _placesAlongRoute[idx].place;
                            mapController?.animateCamera(
                              CameraUpdate.newLatLng(
                                LatLng(pl.locationLat, pl.locationLng),
                              ),
                            );
                          }
                        }
                        return false;
                      },
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _placesAlongRoute.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                        final entry = _placesAlongRoute[index];
                        final pl = entry.place;
                        final divertKm =
                            (entry.distanceFromRouteMeters / 1000).toStringAsFixed(1);
                        final int? durSec = entry.driveDurationSeconds;
                        final String divertLabel = durSec != null
                            ? '${(durSec / 60).round()} min off route ($divertKm km)'
                            : '$divertKm km off route';
                        final String? cardImage = (pl.imageUrl != null && pl.imageUrl!.isNotEmpty)
                            ? pl.imageUrl
                            : (pl.imageUrls.isNotEmpty ? pl.imageUrls.first : null);
                        return GestureDetector(
                          onTap: () async {
                            await mapController?.animateCamera(
                              CameraUpdate.newLatLngZoom(
                                LatLng(pl.locationLat, pl.locationLng),
                                13,
                              ),
                            );
                            if (mounted) _showPlaceDetails(pl);
                          },
                          child: Container(
                            width: 200,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey.shade200),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(10)),
                                  child: cardImage != null
                                      ? Image.network(
                                          cardImage,
                                          height: 110,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          loadingBuilder:
                                              (context, child, progress) {
                                            if (progress == null) return child;
                                            return Container(
                                              height: 110,
                                              color: Colors.grey.shade200,
                                              child: const Center(
                                                child: SizedBox(
                                                  width: 22,
                                                  height: 22,
                                                  child:
                                                      CircularProgressIndicator(
                                                          strokeWidth: 2),
                                                ),
                                              ),
                                            );
                                          },
                                          errorBuilder: (_, __, ___) =>
                                              Container(
                                                height: 110,
                                                color: Colors.grey.shade200,
                                                child: const Icon(
                                                    Icons.image_not_supported,
                                                    color: Colors.grey),
                                              ),
                                        )
                                      : Container(
                                          height: 110,
                                          color: Colors.grey.shade200,
                                          child: const Icon(Icons.image,
                                              color: Colors.grey),
                                        ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              width: 20,
                                              height: 20,
                                              decoration: const BoxDecoration(
                                                color: Color(0xFF5B8DEE),
                                                shape: BoxShape.circle,
                                              ),
                                              alignment: Alignment.center,
                                              child: Text(
                                                '${index + 1}',
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                pl.name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        FutureBuilder<double>(
                                          future: _getAverageRating(pl.placeId),
                                          builder: (context, snapshot) {
                                            final r = snapshot.data ?? 0.0;
                                            return Row(
                                              children: [
                                                if (r > 0) ...[
                                                  const Icon(Icons.star,
                                                      color: Color(0xFFF5B301),
                                                      size: 12),
                                                  const SizedBox(width: 2),
                                                  Text(
                                                    r.toStringAsFixed(1),
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                ],
                                                Expanded(
                                                  child: Text(
                                                    divertLabel,
                                                    style: TextStyle(
                                                      color: Colors.grey[600],
                                                      fontSize: 11,
                                                    ),
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapTypeButton(IconData icon, MapType type) {
    final isSelected = mapType == type;
    return GestureDetector(
      onTap: () {
        setState(() {
          mapType = type;
        });
      },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue : Colors.white,
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          icon,
          size: 22,
          color: isSelected ? Colors.white : Colors.black87,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }
}
// Search sheet widget for map location search
class _MapSearchSheet extends StatefulWidget {
  final Function(double lat, double lng, String address) onLocationSelected;
  
  const _MapSearchSheet({required this.onLocationSelected});

  @override
  State<_MapSearchSheet> createState() => _MapSearchSheetState();
}

class _MapSearchSheetState extends State<_MapSearchSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<PlacePrediction> _suggestions = [];
  bool _isLoading = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) async {
    if (value.length >= 3) {
      setState(() => _isLoading = true);
      final suggestions = await GooglePlacesService.searchPlaces(value);
      if (mounted) {
        setState(() {
          _suggestions = suggestions;
          _isLoading = false;
        });
      }
    } else {
      setState(() {
        _suggestions = [];
        _isLoading = false;
      });
    }
  }

  void _selectSuggestion(PlacePrediction suggestion) async {
    setState(() => _isLoading = true);
    final details = await GooglePlacesService.getPlaceDetails(suggestion.placeId);
    if (details != null && mounted) {
      widget.onLocationSelected(details.latitude, details.longitude, details.formattedAddress);
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.search, color: Color(0xFF3B82F6)),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Search Location',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          
          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Enter city, postcode or address...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF3B82F6)),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _suggestions = []);
                        },
                      )
                    : null,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          
          const SizedBox(height: 8),
          
          // Loading indicator
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
          
          // Results list
          Expanded(
            child: _suggestions.isEmpty && !_isLoading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search, size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          _searchController.text.isEmpty
                              ? 'Search for a location'
                              : 'No results found',
                          style: const TextStyle(color: Colors.black54, fontSize: 16),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: EdgeInsets.only(bottom: bottomInset + 16),
                    itemCount: _suggestions.length,
                    itemBuilder: (context, index) {
                      final suggestion = _suggestions[index];
                      return ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEFF6FF),
                          child: Icon(Icons.location_on, color: Color(0xFF3B82F6)),
                        ),
                        title: Text(
                          suggestion.mainText,
                          style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.black),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          suggestion.secondaryText,
                          style: const TextStyle(color: Colors.black87, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => _selectSuggestion(suggestion),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
/// Internal model representing a single Place site located along the
/// user's planned route, with the metrics needed to sort and label it.
class _PlaceAlongRoute {
  final Place place;
  final double distanceFromRouteMeters;
  final double alongRouteMeters;
  final int? driveDurationSeconds;
  const _PlaceAlongRoute({
    required this.place,
    required this.distanceFromRouteMeters,
    required this.alongRouteMeters,
    this.driveDurationSeconds,
  });
}
