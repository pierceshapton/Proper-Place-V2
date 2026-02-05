import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/services/storage_service.dart';

class PlaceDetailScreen extends StatefulWidget {
  final Map<String, dynamic> place;

  const PlaceDetailScreen({
    super.key,
    required this.place,
  });

  @override
  State<PlaceDetailScreen> createState() => _PlaceDetailScreenState();
}

class _PlaceDetailScreenState extends State<PlaceDetailScreen> {
  late PageController _imageController;
  final int _currentImageIndex = 0;
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  List<Map<String, dynamic>> reviews = [];
  bool isLoadingReviews = true;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3001/reviews?place_id=${widget.place['id']}'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          reviews = List<Map<String, dynamic>>.from(data['reviews'] ?? []);
          isLoadingReviews = false;
        });
      }
    } catch (e) {
      setState(() {
        isLoadingReviews = false;
      });
    }
  }

  int get nightsCount {
    if (_checkInDate != null && _checkOutDate != null) {
      return _checkOutDate!.difference(_checkInDate!).inDays;
    }
    return 0;
  }

  double get totalPrice {
    final price = widget.place['price_per_night'] ?? 0;
    return price * nightsCount;
  }

  void _selectDate(BuildContext context, {required bool isCheckIn}) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          _checkInDate = picked;
        } else {
          _checkOutDate = picked;
        }
      });
    }
  }

  Future<void> _createBooking() async {
    if (_checkInDate == null || _checkOutDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select check-in and check-out dates')),
      );
      return;
    }

    try {
      final token = await StorageService.getToken();
      final response = await http.post(
        Uri.parse('http://localhost:3001/bookings'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'place_id': widget.place['id'],
          'check_in_date': _checkInDate!.toIso8601String(),
          'check_out_date': _checkOutDate!.toIso8601String(),
          'total_price': totalPrice,
          'status': 'confirmed',
        }),
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking created successfully!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating booking: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.place['image_url'] ??
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800';
    final pricePerNight = widget.place['price_per_night'] ?? 50;
    final rating = widget.place['rating'] ?? 4.5;
    final facilities = widget.place['facilities'] as List? ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Place Details'),
        backgroundColor: const Color(0xFF7BA7D8),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image Gallery
            Container(
              height: 300,
              color: Colors.grey[300],
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.grey[300],
                  child: const Icon(Icons.image, size: 48),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title & Rating
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.place['name'] ?? 'Place',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Color(0xFFFFB800)),
                          const SizedBox(width: 4),
                          Text(
                            '$rating',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Location
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 16, color: Color(0xFF7BA7D8)),
                      const SizedBox(width: 6),
                      Text(
                        widget.place['address'] ?? 'Location',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Description
                  Text(
                    widget.place['description'] ?? 'No description',
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                  const SizedBox(height: 24),

                  // Facilities
                  if (facilities.isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Facilities',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (var facility in facilities)
                              Chip(
                                label: Text(facility.toString()),
                                backgroundColor: const Color(0xFF7BA7D8).withOpacity(0.1),
                                labelStyle: const TextStyle(
                                  color: Color(0xFF7BA7D8),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

                  // Booking Section
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Check-in & Check-out',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Check-in Date
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Check-in', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _selectDate(context, isCheckIn: true),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey[300]!),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _checkInDate != null
                                      ? '${_checkInDate!.day}/${_checkInDate!.month}/${_checkInDate!.year}'
                                      : 'Select date',
                                  style: TextStyle(
                                    color: _checkInDate != null
                                        ? Colors.black
                                        : Colors.grey[500],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Check-out Date
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Check-out', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _selectDate(context, isCheckIn: false),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey[300]!),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _checkOutDate != null
                                      ? '${_checkOutDate!.day}/${_checkOutDate!.month}/${_checkOutDate!.year}'
                                      : 'Select date',
                                  style: TextStyle(
                                    color: _checkOutDate != null
                                        ? Colors.black
                                        : Colors.grey[500],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Price Summary
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.grey[50],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('£$pricePerNight x $nightsCount nights'),
                                  Text('£${(pricePerNight * nightsCount).toStringAsFixed(2)}'),
                                ],
                              ),
                              const Divider(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                                  Text(
                                    '£${totalPrice.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF7BA7D8),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Book Button
                        ElevatedButton(
                          onPressed: _createBooking,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF7BA7D8),
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text(
                            'Book Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Reviews Section
                  const Text(
                    'Reviews',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (isLoadingReviews)
                    const Center(child: CircularProgressIndicator())
                  else if (reviews.isEmpty)
                    Center(
                      child: Text(
                        'No reviews yet',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    )
                  else
                    Column(
                      children: reviews
                          .map((review) => Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            review['user_name'] ?? 'Anonymous',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              const Icon(Icons.star,
                                                  size: 16,
                                                  color: Color(0xFFFFB800)),
                                              Text('${review['rating']}'),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(review['comment'] ?? ''),
                                    ],
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
  }
}
