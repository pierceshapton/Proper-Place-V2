import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/models/place.dart';
import 'package:proper_place/screens/chat_screen.dart';
import 'package:proper_place/screens/home_screen.dart';
import 'package:proper_place/services/storage_service.dart';

class BookingDetailScreen extends StatelessWidget {
  final Map<String, dynamic> booking;
  final Place place;

  const BookingDetailScreen({
    Key? key,
    required this.booking,
    required this.place,
  }) : super(key: key);

  String _formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) {
      return 'N/A';
    }
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
      final wazeDeepLink =
          'waze://navigate?ll=${place.locationLat},${place.locationLng}';
      final wazeWebUrl =
          'https://waze.com/ul?ll=${place.locationLat},${place.locationLng}&navigate=yes';

      // Try deep link first (opens Waze app if installed), fall back to web
      final deepUri = Uri.parse(wazeDeepLink);
      if (await canLaunchUrl(deepUri)) {
        await launchUrl(deepUri, mode: LaunchMode.externalApplication);
      } else {
        await _launchUrl(wazeWebUrl);
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
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildInfoRow(String label, String? value) {
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
          value ?? 'N/A',
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

  bool _canCancelBooking(String? checkInStr) {
    if (checkInStr == null || checkInStr.isEmpty) {
      return false;
    }
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

  String _getCancellationDeadline(String? checkInStr) {
    if (checkInStr == null || checkInStr.isEmpty) {
      return 'N/A';
    }
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
    debugPrint('DEBUG: _openChat called');
    
    // Convert to strings first to avoid isEmpty issues with ints
    final bookingIdStr = (booking['booking_id'] ?? '').toString();
    final placeIdStr = (booking['place_id'] ?? '').toString();
    final hostName = place.hostName ?? 'Host';
    final hostId = place.hostId;

    debugPrint('DEBUG: bookingIdStr=$bookingIdStr, placeIdStr=$placeIdStr, hostName=$hostName, hostId=$hostId');

    if (bookingIdStr.isEmpty || placeIdStr.isEmpty || hostId == null) {
      debugPrint('DEBUG: Missing booking, place, or host information');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Cannot open chat: Missing booking or host information')),
      );
      return;
    }

    // Convert placeId to int
    final placeIdInt = int.tryParse(placeIdStr) ?? 0;

    debugPrint('DEBUG: Parsed placeIdInt=$placeIdInt, bookingIdStr=$bookingIdStr');
    debugPrint('DEBUG: Attempting to navigate to ChatScreen');

    try {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            bookingId: bookingIdStr,
            placeId: placeIdInt,
            hostName: hostName,
            hostId: hostId,
          ),
        ),
      ).then((_) {
        debugPrint('DEBUG: Returned from ChatScreen');
      });
    } catch (e) {
      debugPrint('DEBUG: Error navigating to chat: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error opening chat: $e')),
        );
      }
    }
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
                final token = await StorageService.getToken();
                final response = await http.post(
                  Uri.parse('${AppConfig.properPlaceBackendUrl}/bookings/$bookingId/cancel'),
                  headers: {
                    'Content-Type': 'application/json',
                    if (token != null) 'Authorization': 'Bearer $token',
                  },
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

  Future<void> _requestExtendStay(BuildContext context) async {
    final checkInStr = booking['check_in']?.toString() ?? '';
    final checkOutStr = booking['check_out']?.toString() ?? '';
    final bookingId = booking['booking_id']?.toString() ?? '';
    
    if (checkInStr.isEmpty || checkOutStr.isEmpty || bookingId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Missing booking information'), backgroundColor: Colors.red),
      );
      return;
    }

    DateTime currentCheckIn = DateTime.parse(checkInStr);
    DateTime currentCheckOut = DateTime.parse(checkOutStr);
    DateTime? newCheckIn = currentCheckIn;
    DateTime? newCheckOut = currentCheckOut;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final origNights = currentCheckOut.difference(currentCheckIn).inDays;
            final newNights = (newCheckOut ?? currentCheckOut).difference(newCheckIn ?? currentCheckIn).inDays;
            final additionalNights = newNights - origNights;
            final pricePerNight = place.pricePerNight;
            final additionalCost = additionalNights * pricePerNight;

            return AlertDialog(
              title: const Text('Extend Your Stay'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Current: ${_formatDate(checkInStr)} → ${_formatDate(checkOutStr)} ($origNights nights)',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                    const SizedBox(height: 16),
                    
                    // Earlier check-in
                    const Text('New Check-in:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: newCheckIn ?? currentCheckIn,
                          firstDate: DateTime.now(),
                          lastDate: currentCheckIn,
                        );
                        if (picked != null) {
                          setDialogState(() => newCheckIn = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _formatDate(newCheckIn!.toIso8601String()),
                              style: TextStyle(
                                fontWeight: newCheckIn != currentCheckIn ? FontWeight.bold : FontWeight.normal,
                                color: newCheckIn != currentCheckIn ? Colors.green[700] : Colors.black,
                              ),
                            ),
                            const Icon(Icons.calendar_today, size: 18),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Later check-out
                    const Text('New Check-out:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: newCheckOut ?? currentCheckOut,
                          firstDate: currentCheckOut,
                          lastDate: currentCheckOut.add(const Duration(days: 90)),
                        );
                        if (picked != null) {
                          setDialogState(() => newCheckOut = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey[300]!),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _formatDate(newCheckOut!.toIso8601String()),
                              style: TextStyle(
                                fontWeight: newCheckOut != currentCheckOut ? FontWeight.bold : FontWeight.normal,
                                color: newCheckOut != currentCheckOut ? Colors.green[700] : Colors.black,
                              ),
                            ),
                            const Icon(Icons.calendar_today, size: 18),
                          ],
                        ),
                      ),
                    ),
                    
                    if (additionalNights > 0) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Additional nights:', style: TextStyle(fontSize: 13)),
                                Text('$additionalNights', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Additional cost:', style: TextStyle(fontSize: 13)),
                                Text('£${additionalCost.toStringAsFixed(2)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                    
                    const SizedBox(height: 12),
                    Text(
                      'The host will need to approve this extension request.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600], fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: additionalNights > 0
                    ? () async {
                        Navigator.pop(ctx);
                        await _submitExtensionRequest(context, bookingId, newCheckIn!, newCheckOut!);
                      }
                    : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7BA7D8),
                  ),
                  child: const Text('Request Extension', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submitExtensionRequest(BuildContext context, String bookingId, DateTime newCheckIn, DateTime newCheckOut) async {
    try {
      final token = await StorageService.getToken();
      final response = await http.post(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/bookings/$bookingId/extend'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'new_check_in_date': newCheckIn.toIso8601String().split('T')[0],
          'new_check_out_date': newCheckOut.toIso8601String().split('T')[0],
        }),
      );

      if (!context.mounted) return;

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Extension request submitted!'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      } else {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data['message'] ?? 'Failed to submit extension request'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final checkIn = _formatDate(booking['check_in']);
    final checkOut = _formatDate(booking['check_out']);
    final nights = _calculateNights();
    final bookingIdRaw = booking['booking_id']?.toString() ?? '';
    final bookingRef = booking['booking_ref']?.toString();
    final bookingId = bookingRef ?? (bookingIdRaw.length >= 8 
        ? bookingIdRaw.substring(0, 8).toUpperCase() 
        : bookingIdRaw.toUpperCase());
    final status = booking['status'] ?? 'confirmed';

    return Scaffold(
      appBar: AppBar(
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        title: const Text(
          'Booking Details',
          style: TextStyle(
            color: Color(0xFF1A1A2E),
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A2E)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE8E8E8), height: 1),
        ),
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

            // Pending status info banner
            if (status.toLowerCase() == 'pending')
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.orange.shade200),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.schedule, color: Colors.orange.shade700, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Booking Pending Approval',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: Colors.orange.shade900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'The host has 7 days to accept your booking. If they don\'t respond, the hold on your card will be released and no payment will be taken.',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.orange.shade800,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
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
                    'Reference:',
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
                    '£${double.tryParse(booking['total_price']?.toString() ?? '')?.toStringAsFixed(2) ?? '0.00'}',
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
                  // Show on Map button
                  OutlinedButton.icon(
                    onPressed: () {
                      HomeScreen.setNextTab(0);
                      HomeScreen.setFocusPlace(
                        place.placeId,
                        place.locationLat,
                        place.locationLng,
                      );
                      // Pop back to home screen
                      Navigator.of(context).popUntil((route) => route.isFirst);
                    },
                    icon: const Icon(Icons.map, size: 18),
                    label: const Text('Show on Map'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF7BA7D8),
                      backgroundColor: Colors.grey[50],
                      side: const BorderSide(color: Color(0xFF7BA7D8)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Chat button - appears for confirmed/pending bookings within 72 hours
                  if ((booking['status']?.toLowerCase() == 'confirmed' || booking['status']?.toLowerCase() == 'pending') &&
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
                  // Cancel button - appears for upcoming confirmed/pending bookings (hidden within 24h of check-in)
                  if ((booking['status']?.toLowerCase() == 'confirmed' || booking['status']?.toLowerCase() == 'pending') &&
                      _isUpcoming(booking['check_out']) &&
                      _canCancelBooking(booking['check_in']))
                    ...[
                      // Extend Stay button
                      ElevatedButton.icon(
                        onPressed: () => _requestExtendStay(context),
                        icon: const Icon(Icons.date_range, size: 18),
                        label: const Text('Extend Stay'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green[50],
                          foregroundColor: Colors.green[700],
                          side: BorderSide(color: Colors.green[300]!),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                      const SizedBox(height: 12),
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
