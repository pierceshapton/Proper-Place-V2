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

  // Route planning
  double maxTimeOffRoute = 5.0;
  String? startAddress;
  String? destinationAddress;
  double? startLat, startLng;
  double? destLat, destLng;

  // Pending focus place (set before places are loaded)
  Map<String, dynamic>? _pendingFocus;

  // Connectivity monitoring for auto-sync
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _isOnline = true;

  /// Call this to refresh markers (e.g. after vehicle dimensions change)
  void refreshMarkers() {
    _updateMarkersForZoom();
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
    await _updateMarkersForZoom();
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
      // Only fetch GPS on first launch (no cached position yet)
      final prefs = await SharedPreferences.getInstance();
      if (prefs.getDouble('map_last_lat') == null) {
        await _getCurrentLocation();
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
      await _updateMarkersForZoom(); // Refresh markers with updated favorites
    } catch (e) {
    debugPrint('Error toggling favorite: $e');
    }
  }

  Future<double> _getAverageRating(String placeId) async {
    try {
      final reviews = await ApiService.getPlaceReviews(placeId: placeId);
      if (reviews.isEmpty) return 0.0;
      
      double totalRating = 0;
      for (var review in reviews) {
        final rating = review['rating'] ?? 0;
        totalRating += (rating is int ? rating.toDouble() : double.tryParse(rating.toString()) ?? 0);
      }
      
      return totalRating / reviews.length;
    } catch (e) {
    debugPrint('Error getting average rating: $e');
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
        // Permission denied, keep current map location from cache
        return;
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Check if position is default simulator location (San Francisco) and skip updating if it is
      // San Francisco is approximately 37.7749, -122.4194
      final isSanFrancisco =
          (position.latitude > 37 && position.latitude < 38) &&
              (position.longitude < -122 && position.longitude > -123);

      // Only update location if it's NOT the simulator default
      // Otherwise keep the cached location
      if (!isSanFrancisco) {
          if (!mounted) return;
          setState(() {
          currentLocation = LatLng(position.latitude, position.longitude);
          // Save the new location to cache for next time (preserve current zoom)
          StorageService.cacheMapLocation(
            latitude: position.latitude,
            longitude: position.longitude,
            zoom: currentZoom,
          );
        });
    debugPrint('Updated location to: ${position.latitude}, ${position.longitude}');
        // Don't auto-zoom — let the user control the map view.
        // The blue dot shows their location anyway.
      } else {
    debugPrint('Detected simulator default location, keeping cached location');
      }
    } catch (e) {
    debugPrint('Error getting location: $e');
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

      await _updateMarkersForZoom();

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

  Future<void> _updateMarkersForZoom() async {
    Set<Marker> newMarkers = {};

    // Load user vehicle dimensions for marker colouring
    final userHeight = await StorageService.getVehicleHeight();
    final userWidth = await StorageService.getVehicleWidth();
    final userLength = await StorageService.getVehicleLength();
    final hasDimensions = userHeight != null || userWidth != null || userLength != null;

    // Only show markers if zoomed in enough
    if (currentZoom >= MIN_ZOOM_FOR_MARKERS) {
      for (var place in places) {
        // Apply favourites filter
        if (_showOnlyFavorites && !favoriteIds.contains(place.placeId)) continue;

        // Apply facility filters
        if (_activeFacilityFilters.isNotEmpty) {
          final placeAmenities = place.amenitiesList.map((a) => a.toLowerCase()).toSet();
          final matches = _activeFacilityFilters.every(
            (filter) => placeAmenities.any((a) => a.contains(filter.toLowerCase())),
          );
          if (!matches) continue;
        }

        final isFavorite = favoriteIds.contains(place.placeId);
        final fits = !hasDimensions || _vehicleFitsPlace(place, userHeight, userWidth, userLength);
        final markerIcon = await _getCustomMarkerIcon(isFavorite, vehicleFits: fits);

        newMarkers.add(
          Marker(
            markerId: MarkerId(place.placeId),
            position: LatLng(place.locationLat, place.locationLng),
            icon: markerIcon,
            anchor: isFavorite ? const Offset(0.5, 0.85) : const Offset(0.5, 1.0),
            onTap: () => _showPlaceDetails(place),
          ),
        );
      }
    }

      if (!mounted) return;
      setState(() {
      markers = newMarkers;
    });
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
                        _updateMarkersForZoom();
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
                    _updateMarkersForZoom();
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

  void _showRouteForm() {
    double localMaxTimeOffRoute = maxTimeOffRoute;
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
              children: [
            const Text(
              'Plan Your Route',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            const Text(
              'Starting Location',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GooglePlacesAddressField(
                    onAddressSelected: (address, lat, lng, city, country) {
                      setModalState(() {
                        startAddress = address;
                        startLat = lat;
                        startLng = lng;
                      });
                    },
                    label: 'Starting Location',
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () async {
                    if (currentLocation != null) {
                      setModalState(() {
                        startAddress = 'My Location';
                        startLat = currentLocation!.latitude;
                        startLng = currentLocation!.longitude;
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF5B8DEE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.my_location,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Destination',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            GooglePlacesAddressField(
              onAddressSelected: (address, lat, lng, city, country) {
                setModalState(() {
                  destinationAddress = address;
                  destLat = lat;
                  destLng = lng;
                });
              },
              label: 'Destination',
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
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5B8DEE),
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
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Finding places within ${localMaxTimeOffRoute.toStringAsFixed(0)} min of your route...',
                      ),
                    ),
                  );
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.search),
                    SizedBox(width: 8),
                    Text(
                      'Find Places on Route',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
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
                      },
                      onCameraMove: (CameraPosition cameraPosition) {
                        currentZoom = cameraPosition.zoom;
                        _updateMarkersForZoom();

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
                      markers: markers,
                      circles: _searchCircles,
                      mapType: mapType,
                      myLocationEnabled: true,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                    ),
                    // Top left - Plan Route button
                    Positioned(
                      top: 60,
                      left: 16,
                      child: ElevatedButton.icon(
                        onPressed: _showRouteForm,
                        icon: const Icon(Icons.directions),
                        label: const Text('Plan Route'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.black,
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
                          _updateMarkersForZoom();
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
                  ],
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