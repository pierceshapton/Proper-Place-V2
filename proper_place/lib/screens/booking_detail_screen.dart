import 'package:flutter/material.dart';
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/models/place.dart';

class BookingDetailScreen extends StatelessWidget {
  final Map<String, dynamic> booking;
  final Place place;

  const BookingDetailScreen({
    Key? key,
    required this.booking,
    required this.place,
  }) : super(key: key);

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day} ${_monthName(date.month)} ${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  String _monthName(int month) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return months[month - 1];
  }

  Future<void> _openWazeDirections(BuildContext context) async {
    try {
      final wazeUrl =
          'waze://navigate?ll=${place.locationLat},${place.locationLng}';
      final webUrl =
          'https://waze.com/ul?ll=${place.locationLat},${place.locationLng}&navigate=yes';

      if (Platform.isIOS) {
        try {
          await _launchUrl(wazeUrl);
        } catch (e) {
          await _launchUrl(webUrl);
        }
      } else {
        await _launchUrl(wazeUrl);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open Waze: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _openGoogleMapsDirections(BuildContext context) async {
    try {
      final googleMapsUrl =
          'https://www.google.com/maps/dir/?api=1&destination=${place.locationLat},${place.locationLng}';
      await _launchUrl(googleMapsUrl);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _launchUrl(String url) async {
    if (url.startsWith('http')) {
      print('Opening: $url');
    }
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: Colors.grey,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  int _calculateNights() {
    try {
      final checkInDate = DateTime.parse(booking['check_in']);
      final checkOutDate = DateTime.parse(booking['check_out']);
      return checkOutDate.difference(checkInDate).inDays;
    } catch (e) {
      return 0;
    }
  }

  bool _isChatAvailable(String checkInStr, String checkOutStr) {
    try {
      final checkIn = DateTime.parse(checkInStr);
      final checkOut = DateTime.parse(checkOutStr);
      final now = DateTime.now();
      final seventyTwoHoursBefore =
          checkIn.subtract(const Duration(hours: 72));
      return now.isAfter(seventyTwoHoursBefore) && now.isBefore(checkOut);
    } catch (e) {
      return false;
    }
  }

  bool _isUpcoming(String checkOutStr) {
    try {
      final checkOut = DateTime.parse(checkOutStr);
      return checkOut.isAfter(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  bool _canCancelBooking(String checkInStr) {
    try {
      final checkIn = DateTime.parse(checkInStr);
      // Add 12 hours to check-in to get the midday check-in time
      final checkInMidday = checkIn.add(const Duration(hours: 12));
      final now = DateTime.now();
      
      // Calculate time remaining until 24 hours before check-in
      final cannotCancelAfter = checkInMidday.subtract(const Duration(hours: 24));
      
      // User can only cancel if current time is before 24 hours before check-in
      return now.isBefore(cannotCancelAfter);
    } catch (e) {
      return false;
    }
  }

  String _getCancellationDeadline(String checkInStr) {
    try {
      final checkIn = DateTime.parse(checkInStr);
      final checkInMidday = checkIn.add(const Duration(hours: 12));
      final deadline = checkInMidday.subtract(const Duration(hours: 24));
      
      // Format the deadline date and time
      final day = deadline.day;
      final month = _monthName(deadline.month);
      final year = deadline.year;
      final hour = deadline.hour.toString().padLeft(2, '0');
      final minute = deadline.minute.toString().padLeft(2, '0');
      
      return '$day $month $year at $hour:$minute';
    } catch (e) {
      return 'Unknown';
    }
  }

  Future<void> _openChat(BuildContext context) async {
    final bookingId = booking['booking_id'] ?? '';
    final placeId = booking['place_id'] ?? '';

    if (bookingId.isEmpty || placeId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Cannot open chat: Missing booking or place information')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            'Opening chat for booking ${bookingId.toString().substring(0, 8).toUpperCase()}'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _cancelBooking(BuildContext context) async {
    final bookingId = booking['booking_id'] ?? '';
    
    // Check if cancellation is allowed
    if (!_canCancelBooking(booking['check_in'])) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Booking cannot be cancelled within 24 hours of check-in (midday). '
              'Cancellation deadline: ${_getCancellationDeadline(booking['check_in'])}',
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
      return;
    }

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: const Text(
            'Are you sure you want to cancel this booking? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep Booking'),
          ),
          TextButton(
            onPressed: () async {
              try {
                // Show loading indicator
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Cancelling booking...'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                }
                
                // Call backend API to cancel booking
                final response = await http.post(
                  Uri.parse('http://localhost:3001/bookings/$bookingId/cancel'),
                  headers: {'Content-Type': 'application/json'},
                );
                
                if (!context.mounted) return;
                
                if (response.statusCode == 200) {
                  if (context.mounted) {
                    Navigator.pop(context); // Close confirmation dialog first
                  }
                  
                  await Future.delayed(const Duration(milliseconds: 800));
                  
                  if (context.mounted) {
                    Navigator.pop(context, true); // Close detail screen and signal refresh
                  }
                  
                  await Future.delayed(const Duration(milliseconds: 300));
                  
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Booking cancelled successfully'),
                        backgroundColor: Colors.green,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                } else {
                  if (context.mounted) {
                    Navigator.pop(context); // Close the dialog
                    final errorData = jsonDecode(response.body);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error: ${errorData['message'] ?? 'Failed to cancel booking'}'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error: $e'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Cancel Booking',
                style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final checkIn = _formatDate(booking['check_in']);
    final checkOut = _formatDate(booking['check_out']);
    final nights = _calculateNights();
    final bookingId =
        (booking['booking_id'] as String).substring(0, 8).toUpperCase();
    final status = booking['status'] ?? 'confirmed';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        backgroundColor: const Color(0xFF7BA7D8),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Place Image Carousel
            if (place.imageUrls.isNotEmpty)
              SizedBox(
                height: 250,
                child: PageView.builder(
                  itemCount: place.imageUrls.length,
                  itemBuilder: (context, index) {
                    return Image.network(
                      place.imageUrls[index],
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (context, error, stackTrace) =>
                          Container(
                        color: Colors.grey[300],
                        child: const Icon(Icons.image, size: 64),
                      ),
                    );
                  },
                ),
              )
            else if (place.imageUrl != null &&
                place.imageUrl!.isNotEmpty)
              ClipRRect(
                child: Image.network(
                  place.imageUrl!,
                  height: 250,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      Container(
                    height: 250,
                    color: Colors.grey[300],
                    child: const Icon(Icons.image, size: 64),
                  ),
                ),
              ),

            // Place Name and Status
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          place.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: status.toLowerCase() == 'confirmed'
                              ? Colors.green
                              : Colors.orange,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    place.address,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),

            const Divider(),

            // Booking Information
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Booking Information',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildInfoRow(
                    'Booking ID:',
                    bookingId,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Check-in:',
                    checkIn,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Check-out:',
                    checkOut,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Number of Nights:',
                    nights.toString(),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Total Price:',
                    '£${double.tryParse(booking['total_price'].toString())?.toStringAsFixed(2) ?? booking['total_price']}',
                  ),
                ],
              ),
            ),

            const Divider(),

            // Place Description
            if (place.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'About this place',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      place.description,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 24),

            // Directions Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Get Directions',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _openWazeDirections(context),
                          icon: const Icon(Icons.navigation),
                          label: const Text('Waze'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                const Color(0xFF7BA7D8),
                            padding: const EdgeInsets.symmetric(
                                vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _openGoogleMapsDirections(context),
                          icon: const Icon(Icons.map),
                          label: const Text('Google Maps'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                const Color(0xFF7BA7D8),
                            padding: const EdgeInsets.symmetric(
                                vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Chat button - appears for confirmed bookings within 72 hours
                  if (booking['status']?.toLowerCase() == 'confirmed' &&
                      _isChatAvailable(
                          booking['check_in'], booking['check_out']))
                    ...[
                      ElevatedButton.icon(
                        onPressed: () => _openChat(context),
                        icon: const Icon(Icons.chat_bubble),
                        label: const Text('Message Host'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7BA7D8),
                          padding: const EdgeInsets.symmetric(
                              vertical: 12),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  // Cancel button - appears for upcoming confirmed bookings
                  if (booking['status']?.toLowerCase() == 'confirmed' &&
                      _isUpcoming(booking['check_out']))
                    ...[
                      ElevatedButton(
                        onPressed: () => _cancelBooking(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red[100],
                          padding: const EdgeInsets.symmetric(
                              vertical: 12),
                        ),
                        child: Text(
                          'Cancel Booking',
                          style: TextStyle(
                              color: Colors.red[700],
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
