import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:ui' as ui;
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';
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
  LatLng? currentLocation;
  bool isLoading = true;
  bool isOfflineMode = false;
  List<Place> places = [];
  double currentZoom = 6;
  Set<String> favoriteIds = {};
  MapType mapType = MapType.normal; // Add map type control
  static const double MIN_ZOOM_FOR_MARKERS =
      11; // Show markers only when zoomed in to level 11+

  // Route planning
  double maxTimeOffRoute = 5.0;
  String? startAddress;
  String? destinationAddress;
  double? startLat, startLng;
  double? destLat, destLng;

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    try {
      isOfflineMode = await StorageService.getOfflineMode();

      // Load cached map location
      final cachedLocation = await StorageService.getCachedMapLocation();
      setState(() {
        currentLocation =
            LatLng(cachedLocation['latitude']!, cachedLocation['longitude']!);
        currentZoom = cachedLocation['zoom']!;
      });

      await _loadFavorites();
      await _getCurrentLocation();
      await _loadPlaces();
      setState(() => isLoading = false);
    } catch (e) {
      print('Error initializing map: $e');
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
      setState(() {
        favoriteIds = favoritesList.toSet();
      });
    } catch (e) {
      print('Error loading favorites: $e');
    }
  }

  Future<BitmapDescriptor> _getCustomMarkerIcon(bool isFavorite) async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    const double size = 100;

    // Draw marker background (tent shape)
    final Paint markerPaint = Paint()
      ..color = isFavorite ? Colors.red : const Color(0xFF7BA7D8)
      ..style = PaintingStyle.fill;

    // Draw tent shape - triangle
    final Path tentPath = Path();
    tentPath.moveTo(size / 2, 10); // Top point
    tentPath.lineTo(size - 15, size - 20); // Bottom right
    tentPath.lineTo(15, size - 20); // Bottom left
    tentPath.close();

    canvas.drawPath(tentPath, markerPaint);

    // Draw a small circle at the bottom for marker pin effect
    canvas.drawCircle(Offset(size / 2, size - 5), 6, markerPaint);

    // Add white border
    final Paint borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawPath(tentPath, borderPaint);

    // Add heart icon on top if favorited
    if (isFavorite) {
      final textPainter = TextPainter(
        text: const TextSpan(
          text: '★',
          style: TextStyle(
              fontSize: 20, color: Colors.red, fontWeight: FontWeight.bold),
        ),
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(canvas, const Offset(35, 15));
    }

    final ui.Image image = await pictureRecorder
        .endRecording()
        .toImage(size.toInt(), size.toInt());
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
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
      print('Error toggling favorite: $e');
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
        setState(() {
          currentLocation = LatLng(position.latitude, position.longitude);
          // Save the new location to cache for next time
          StorageService.cacheMapLocation(
            latitude: position.latitude,
            longitude: position.longitude,
            zoom: currentZoom,
          );
        });
        print('Updated location to: ${position.latitude}, ${position.longitude}');
        
        // Animate camera to current location
        mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(
            LatLng(position.latitude, position.longitude),
            14,
          ),
        );
      } else {
        print('Detected simulator default location, keeping cached location');
        // Still animate to cached location if available
        if (currentLocation != null) {
          mapController?.animateCamera(
            CameraUpdate.newLatLngZoom(currentLocation!, 14),
          );
        }
      }
    } catch (e) {
      print('Error getting location: $e');
      // On error, still try to animate to cached location
      if (currentLocation != null) {
        mapController?.animateCamera(
          CameraUpdate.newLatLngZoom(currentLocation!, 14),
        );
      }
    }
  }

  Future<void> _loadPlaces() async {
    try {
      final placesData = await ApiService.getApprovedPlaces();
      final loadedPlaces = (placesData)
          .map((p) => Place.fromJson(p as Map<String, dynamic>))
          .toList();

      setState(() {
        places = loadedPlaces;
      });

      await _updateMarkersForZoom();
    } catch (e) {
      print('Error loading places: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading places')),
        );
      }
    }
  }

  Future<void> _updateMarkersForZoom() async {
    Set<Marker> newMarkers = {};

    // Only show markers if zoomed in enough
    if (currentZoom >= MIN_ZOOM_FOR_MARKERS) {
      for (var place in places) {
        final isFavorite = favoriteIds.contains(place.placeId);
        final markerIcon = await _getCustomMarkerIcon(isFavorite);

        newMarkers.add(
          Marker(
            markerId: MarkerId(place.placeId),
            position: LatLng(place.locationLat, place.locationLng),
            icon: markerIcon,
            infoWindow: InfoWindow(
              title: place.name,
              snippet:
                  '${isFavorite ? '★ ' : ''}£${place.pricePerNight.toStringAsFixed(0)}/night',
              onTap: () => _showPlaceDetails(place),
            ),
            onTap: () => _showPlaceDetails(place),
          ),
        );
      }
    }

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
      builder: (context) => _buildPlaceModal(place),
    );
  }

  Widget _buildPlaceModal(Place place) {
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
                  final isFavorite = !favoriteIds.contains(place.placeId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        isFavorite
                            ? 'Added to favorites'
                            : 'Removed from favorites',
                      ),
                    ),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          // Image
          if (place.imageUrl != null && place.imageUrl!.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                place.imageUrl!,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 200,
                    color: Colors.grey[300],
                    child: const Icon(Icons.image_not_supported),
                  );
                },
              ),
            )
          else
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.image_not_supported),
            ),
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
          // Address
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.grey, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  place.address,
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Instant booking badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.green,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.flash_on, color: Colors.white, size: 16),
                SizedBox(width: 4),
                Text(
                  'Instant Booking',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Description
          Text(
            place.description,
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
          if (place.placeType != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Type: ${place.placeType}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ),
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
                        'latitude': place.locationLat,
                        'longitude': place.locationLng,
                        'place_type': place.placeType,
                        'amenities': place.amenities,
                        'host_name': place.hostName,
                        'capacity': place.capacity,
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
                        // Animate to current location after map is created
                        if (currentLocation != null) {
                          mapController?.animateCamera(
                            CameraUpdate.newLatLngZoom(currentLocation!, 12),
                          );
                        }
                      },
                      onCameraMove: (CameraPosition cameraPosition) {
                        currentZoom = cameraPosition.zoom;
                        _updateMarkersForZoom();

                        // Save map location to cache
                        StorageService.cacheMapLocation(
                          latitude: cameraPosition.target.latitude,
                          longitude: cameraPosition.target.longitude,
                          zoom: cameraPosition.zoom,
                        );
                      },
                      initialCameraPosition: CameraPosition(
                        target:
                            currentLocation ?? const LatLng(54.5973, -3.4360),
                        zoom: 6,
                      ),
                      markers: markers,
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
                    // Left side - My Location icon button (under Plan Route)
                    Positioned(
                      top: 130,
                      left: 16,
                      child: FloatingActionButton(
                        mini: true,
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.black,
                        onPressed: _getCurrentLocation,
                        child: const Icon(Icons.person),
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
    super.dispose();
  }
}
