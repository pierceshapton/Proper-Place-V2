import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../models/place.dart';
import 'place_detail_screen.dart';

class HostPlacesScreen extends StatefulWidget {
  const HostPlacesScreen({super.key});

  @override
  State<HostPlacesScreen> createState() => _HostPlacesScreenState();
}

class _HostPlacesScreenState extends State<HostPlacesScreen> {
  List<dynamic> places = [];
  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _loadHostPlaces();
  }

  Future<void> _loadHostPlaces() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        setState(() {
          errorMessage = 'Authentication token not found';
          isLoading = false;
        });
        return;
      }

      // TODO: Replace with real API call when endpoint is ready
      // final response = await http.get(Uri.parse('${AppConfig.baseUrl}/places?host=true'));
      
      // For now, use mock data since we don't have the actual endpoint
      setState(() {
        places = [
          {
            'id': 1,
            'title': 'Cozy Van Escape',
            'location': 'Sedona, Arizona',
            'price': 85,
            'image':
                'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400',
            'rating': 4.8,
            'reviews': 12,
            'availability': 'Available',
            'bookings': 8,
          },
          {
            'id': 2,
            'title': 'Mountain Retreat Van',
            'location': 'Boulder, Colorado',
            'price': 95,
            'image':
                'https://images.unsplash.com/photo-1527519335468-1c74e0c8d6a4?w=400',
            'rating': 4.9,
            'reviews': 18,
            'availability': 'Booked',
            'bookings': 12,
          },
          {
            'id': 3,
            'title': 'Beachside Mobile Home',
            'location': 'Malibu, California',
            'price': 120,
            'image':
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
            'rating': 4.7,
            'reviews': 24,
            'availability': 'Available',
            'bookings': 15,
          },
        ];
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = 'Error loading places: $e';
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Places'),
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 28),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add new place feature coming soon')),
              );
            },
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(errorMessage!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadHostPlaces,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : places.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.home_outlined, size: 48, color: Colors.grey),
                          const SizedBox(height: 16),
                          const Text(
                            'No places yet',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Add your first place to get started',
                            style: TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Add new place feature coming soon')),
                              );
                            },
                            icon: const Icon(Icons.add),
                            label: const Text('Add Place'),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadHostPlaces,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        itemCount: places.length,
                        itemBuilder: (context, index) {
                          final place = places[index];
                          return _buildPlaceCard(context, place);
                        },
                      ),
                    ),
    );
  }

  Widget _buildPlaceCard(BuildContext context, dynamic place) {
    final availability = place['availability'] as String;
    final isAvailable = availability == 'Available';
    final availabilityColor = isAvailable ? Colors.green : Colors.orange;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image
          Stack(
            children: [
              ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(12)),
                child: Image.network(
                  Place.toFullImageUrl(place['image'] as String?) ?? 'https://via.placeholder.com/400x300',
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 180,
                      color: Colors.grey[200],
                      child: const Icon(Icons.image_not_supported),
                    );
                  },
                ),
              ),
              // Availability Badge
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: availabilityColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    availability,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              // Rating Badge
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        '${place['rating']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  place['title'] as String,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on,
                        size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        place['location'] as String,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Stats Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '\$${place['price']}/night',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF7BA7D8),
                          ),
                        ),
                        Text(
                          '${place['reviews']} reviews',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${place['bookings']} bookings',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => PlaceDetailScreen(
                                place: place,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.visibility, size: 16),
                        label: const Text('View'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Edit place feature coming soon')),
                          );
                        },
                        icon: const Icon(Icons.edit, size: 16),
                        label: const Text('Edit'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
