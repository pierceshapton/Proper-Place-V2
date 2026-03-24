import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../models/place.dart';
import 'place_detail_screen.dart';
import 'map_places_screen_new.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  String _selectedFilter = 'All';
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _allPlaces = [];
  List<dynamic> _stavedPlaces = []; // Places from bookings
  bool _isLoading = false;
  bool _hasLoadedOnce = false;

  @override
  void initState() {
    super.initState();
    // Don't block UI - just mark as ready to load when user sees the screen
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Load once when screen becomes visible
    if (!_hasLoadedOnce) {
      _hasLoadedOnce = true;
      _loadPlaces();
    }
  }

  Future<void> _loadPlaces() async {
    try {
      // Mark loading
      if (mounted) {
        setState(() => _isLoading = true);
      }

      // Load places with timeout - don't wait forever
      List<dynamic> places = [];
      try {
        final placesResult = await Future.any([
          ApiService.getApprovedPlaces(),
          Future.delayed(const Duration(seconds: 8), () => <dynamic>[]),
        ]);
        places = placesResult ?? [];
      } catch (e) {
        debugPrint('Places load error: $e');
        places = [];
      }

      // Load bookings separately with timeout
      List<dynamic> bookings = [];
      final guestId = await StorageService.getUserId();
      if (guestId != null) {
        try {
          final bookingsResult = await Future.any([
            ApiService.getGuestBookings(guestId: guestId),
            Future.delayed(const Duration(seconds: 8), () => <dynamic>[]),
          ]);
          bookings = bookingsResult ?? [];
        } catch (e) {
          debugPrint('Bookings load error: $e');
          bookings = [];
        }
      }

      // Extract place IDs from completed bookings
      final stavedPlaceIds = <int>{};
      for (var booking in bookings) {
        try {
          if ((booking['status'] ?? '').toLowerCase() == 'completed') {
            final placeId = booking['place_id'];
            if (placeId != null) {
              stavedPlaceIds.add(placeId is int ? placeId : int.tryParse(placeId.toString()) ?? 0);
            }
          }
        } catch (e) {
          debugPrint('Booking parsing error: $e');
        }
      }

      // Update UI
      if (mounted) {
        setState(() {
          _allPlaces = places;
          _stavedPlaces = places.where((p) {
            try {
              final id = p['id'] is int ? p['id'] : int.tryParse(p['id'].toString()) ?? 0;
              return stavedPlaceIds.contains(id);
            } catch (e) {
              return false;
            }
          }).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Fatal error loading places: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<Map<String, dynamic>> get _filteredFavorites {
    final places = _selectedFilter == 'All' ? _allPlaces : _stavedPlaces;
    return places.cast<Map<String, dynamic>>();
  }

  List<Map<String, dynamic>> get _searchedFavorites {
    final filtered = _filteredFavorites;
    if (_searchController.text.isEmpty) {
      return filtered;
    }
    return filtered
        .where((f) =>
            (f['name'] ?? '').toLowerCase().contains(_searchController.text.toLowerCase()) ||
            (f['address'] ?? '').toLowerCase().contains(_searchController.text.toLowerCase()))
        .toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const SizedBox.shrink(),
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        title: const Text(
          'Saved',
          style: TextStyle(
            color: Color(0xFF1A1A2E),
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: const Color(0xFFE8E8E8),
            height: 1,
          ),
        ),
      ),
      body: Column(
        children: [
          // Search bar + filter row
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 4, 0),
            child: Row(
              children: [
                if (_selectedFilter != 'All') ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A2E),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _selectedFilter,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: () => setState(() { _selectedFilter = 'All'; _searchController.clear(); }),
                          child: const Icon(Icons.close, size: 16, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search places...',
                      hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
                      prefixIcon: Icon(Icons.search, color: Colors.grey[400], size: 20),
                      isDense: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  icon: Icon(
                    Icons.filter_list,
                    color: _selectedFilter == 'All' ? const Color(0xFF6B7280) : const Color(0xFF1A1A2E),
                  ),
                  onSelected: (value) => setState(() { _selectedFilter = value; _searchController.clear(); }),
                  itemBuilder: (context) => [
                    _buildFilterMenuItem('All', 'All'),
                    _buildFilterMenuItem('Stayed', 'Stayed'),
                  ],
                ),
              ],
            ),
          ),
          // Result count
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${_searchedFavorites.length} place${_searchedFavorites.length != 1 ? 's' : ''} found',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          // Favorites list
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF7BA7D8)),
                    ),
                  )
                : _searchedFavorites.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.favorite_outline,
                              size: 64,
                              color: Colors.grey[300],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _selectedFilter == 'Stayed'
                                  ? 'No stayed places yet'
                                  : 'No places available',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _selectedFilter == 'Stayed'
                                  ? 'Complete a booking to see it here'
                                  : 'Start exploring places',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _searchedFavorites.length,
                        itemBuilder: (context, index) {
                          final place = _searchedFavorites[index];
                          return _buildFavoriteCard(place);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  PopupMenuEntry<String> _buildFilterMenuItem(String label, String value) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          if (_selectedFilter == value)
            const Icon(Icons.check, size: 18, color: Color(0xFF1A1A2E))
          else
            const SizedBox(width: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontWeight: _selectedFilter == value ? FontWeight.w700 : FontWeight.w500,
              color: const Color(0xFF1A1A2E),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFavoriteCard(Map<String, dynamic> place) {
    // Use first image from image_urls array, fallback to main_photo_url or image
    final imageUrls = place['image_urls'];
    final firstImageUrl = (imageUrls is List && imageUrls.isNotEmpty) ? imageUrls[0].toString() : '';
    final rawImageUrl = firstImageUrl.isNotEmpty ? firstImageUrl : (place['main_photo_url'] ?? place['image'] ?? '');
    final imageUrl = Place.toFullImageUrl(rawImageUrl) ?? '';
    final rawPrice = place['price_per_night'] ?? place['price'] ?? '0';
    final price = (double.tryParse(rawPrice.toString()) ?? 0).toStringAsFixed(0);
    
    return GestureDetector(
      onTap: () {
        // Navigate to place details
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PlaceDetailScreen(place: place),
          ),
        );
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with price and action buttons
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Container(
                              height: 200,
                              color: Colors.grey[200],
                              child: const Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF7BA7D8)),
                                ),
                              ),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 200,
                            color: Colors.grey[300],
                            child: Center(
                              child: Icon(Icons.image, size: 48, color: Colors.grey[400]),
                            ),
                          ),
                        )
                      : Container(
                          height: 200,
                          color: Colors.grey[300],
                          child: Center(
                            child: Icon(Icons.image, size: 48, color: Colors.grey[400]),
                          ),
                        ),
                ),
                // Price badge
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '£$price/night',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                // Show on Map button
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: GestureDetector(
                    onTap: () {
                      // Navigate to map with this place
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const MapPlacesScreen(),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.map, color: Color(0xFF7BA7D8), size: 16),
                          SizedBox(width: 4),
                          Text(
                            'Show on Map',
                            style: TextStyle(
                              color: Color(0xFF7BA7D8),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Place details
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    place['name'] ?? 'Unknown Place',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 16, color: Color(0xFF7BA7D8)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          place['address'] ?? 'No address',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    place['description'] ?? 'No description',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[700],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
