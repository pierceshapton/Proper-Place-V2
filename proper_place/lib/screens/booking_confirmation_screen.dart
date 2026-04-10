import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:proper_place/models/place.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/payment_service.dart';
import 'package:proper_place/screens/home_screen.dart';
import 'package:proper_place/screens/profile_screen.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class BookingConfirmationScreen extends StatefulWidget {
  final Place place;

  const BookingConfirmationScreen({Key? key, required this.place})
      : super(key: key);

  @override
  State<BookingConfirmationScreen> createState() =>
      _BookingConfirmationScreenState();
}

class _BookingConfirmationScreenState extends State<BookingConfirmationScreen> {
  late DateTime currentMonth;
  DateTime? checkInDate;
  DateTime? checkOutDate;
  int numberOfNights = 1;
  bool isSubmitting = false;
  Map<String, int> bookedSpaces = {};
  bool isLoadingBookings = true;
  String? _userVanReg;

  @override
  void initState() {
    super.initState();
    currentMonth = DateTime.now();
    checkInDate = DateTime.now();
    checkOutDate = DateTime.now().add(const Duration(days: 1));
    _loadBookings();
    _loadUserVanReg();
  }

  Future<void> _loadUserVanReg() async {
    try {
      final token = await StorageService.getToken();
      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/auth/me'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final reg = data['user']?['vehicle_registration'];
        if (mounted && reg != null && reg.toString().isNotEmpty) {
          setState(() => _userVanReg = reg.toString());
        }
      }
    } catch (_) {}
  }

  /// Validates UK number plate formats:
  /// Standard (post-2001): AB12 CDE
  /// Prefix (1983-2001): A123 BCD
  /// Suffix (1963-1983): ABC 123D
  /// NI plates: ABC 1234
  /// Personalised: A1, A1B, AB1, ABC1, A1 BCD, etc.
  static bool isValidUkPlate(String plate) {
    final cleaned = plate.replaceAll(RegExp(r'\s+'), '').toUpperCase();
    if (cleaned.length < 2 || cleaned.length > 8) return false;
    final patterns = [
      RegExp(r'^[A-Z]{2}[0-9]{2}[A-Z]{3}$'),         // Standard: AB12CDE
      RegExp(r'^[A-Z][0-9]{1,3}[A-Z]{3}$'),           // Prefix: A123BCD
      RegExp(r'^[A-Z]{3}[0-9]{1,3}[A-Z]$'),           // Suffix: ABC123D
      RegExp(r'^[A-Z]{1,3}[0-9]{1,4}$'),              // NI / personalised: ABC1234, A1, AB12
      RegExp(r'^[0-9]{1,4}[A-Z]{1,3}$'),              // Reverse personalised: 1ABC, 12AB
      RegExp(r'^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$'),   // Mixed personalised: A1BCD, AB1C
      RegExp(r'^[A-Z]{3}[0-9]{1,4}[A-Z]?$'),          // Dateless: ABC1234
    ];
    return patterns.any((p) => p.hasMatch(cleaned));
  }

  Future<void> _loadBookings() async {
    try {
      final bookings = await ApiService.getBookingsForPlace(placeId: widget.place.placeId);
      
      final Map<String, int> spacesMap = {};
      for (var booking in bookings) {
        final checkIn = DateTime.parse(booking['check_in']);
        final checkOut = DateTime.parse(booking['check_out']);
        
        // Count booking for each date in range
        for (var date = checkIn; date.isBefore(checkOut); date = date.add(const Duration(days: 1))) {
          final dateStr = _formatDate(date);
          spacesMap[dateStr] = (spacesMap[dateStr] ?? 0) + 1;
        }
      }
      
      if (mounted) {
        setState(() {
          bookedSpaces = spacesMap;
          isLoadingBookings = false;
        });
      }
    } catch (e) {
      print('Error loading bookings: $e');
      if (mounted) {
        setState(() {
          isLoadingBookings = false;
        });
      }
    }
  }

  int getAvailableSpaces(DateTime date) {
    final dateStr = _formatDate(date);
    final booked = bookedSpaces[dateStr] ?? 0;
    return widget.place.capacity - booked;
  }

  bool isDateFullyBooked(DateTime date) {
    return getAvailableSpaces(date) <= 0;
  }

  bool isDateInRange(DateTime date) {
    if (checkInDate == null || checkOutDate == null) return false;
    return date.isAfter(checkInDate!) &&
        date.isBefore(checkOutDate!) &&
        date != checkInDate &&
        date != checkOutDate;
  }

  bool isDateSelected(DateTime date) {
    if (checkInDate == null) return false;
    return date.year == checkInDate!.year &&
        date.month == checkInDate!.month &&
        date.day == checkInDate!.day;
  }

  bool isDateCheckOut(DateTime date) {
    if (checkOutDate == null) return false;
    return date.year == checkOutDate!.year &&
        date.month == checkOutDate!.month &&
        date.day == checkOutDate!.day;
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  Future<void> _selectCheckInDate(DateTime date) async {
    if (isDateFullyBooked(date)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This date is fully booked'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      checkInDate = date;
      if (checkOutDate != null && checkOutDate!.isBefore(checkInDate!)) {
        checkOutDate = checkInDate!.add(const Duration(days: 1));
      }
      _updateNumberOfNights();
    });
  }

  Future<void> _selectCheckOutDate(DateTime date) async {
    if (checkInDate == null) return;

    if (date.isBefore(checkInDate!) || date.isAtSameMomentAs(checkInDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Check-out must be after check-in'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      checkOutDate = date;
      _updateNumberOfNights();
    });
  }

  void _updateNumberOfNights() {
    if (checkInDate != null && checkOutDate != null) {
      numberOfNights = checkOutDate!.difference(checkInDate!).inDays;
      if (numberOfNights <= 0) {
        numberOfNights = 1;
        checkOutDate = checkInDate!.add(const Duration(days: 1));
      }
    }
  }

  Widget _buildCalendar() {
    final firstDay = DateTime(currentMonth.year, currentMonth.month, 1);
    final lastDay = DateTime(currentMonth.year, currentMonth.month + 1, 0);
    final daysInMonth = lastDay.day;
    final startingWeekday = firstDay.weekday % 7; // 0 = Sunday

    return Column(
      children: [
        // Month navigation
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () {
                  setState(() {
                    currentMonth =
                        DateTime(currentMonth.year, currentMonth.month - 1);
                  });
                },
              ),
              Text(
                '${_monthName(currentMonth.month)} ${currentMonth.year}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {
                  setState(() {
                    currentMonth =
                        DateTime(currentMonth.year, currentMonth.month + 1);
                  });
                },
              ),
            ],
          ),
        ),
        // Day headers
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: const [
              _DayHeader('Sun'),
              _DayHeader('Mon'),
              _DayHeader('Tue'),
              _DayHeader('Wed'),
              _DayHeader('Thu'),
              _DayHeader('Fri'),
              _DayHeader('Sat'),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Calendar grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1.2,
            ),
            itemCount: 42, // 6 weeks * 7 days
            itemBuilder: (context, index) {
              if (index < startingWeekday || index >= startingWeekday + daysInMonth) {
                return const SizedBox.shrink();
              }

              final day = index - startingWeekday + 1;
              final date = DateTime(currentMonth.year, currentMonth.month, day);
              final availableSpaces = getAvailableSpaces(date);
              final isFullyBooked = availableSpaces <= 0;
              final inRange = isDateInRange(date);
              final isCheckIn = isDateSelected(date);
              final isCheckOut = isDateCheckOut(date);
              final isPast = date.isBefore(DateTime.now()) &&
                  date.day != DateTime.now().day;

              Color backgroundColor = Colors.transparent;
              Color textColor = Colors.black;

              if (isPast) {
                backgroundColor = Colors.grey[300]!;
                textColor = Colors.grey[600]!;
              } else if (isFullyBooked) {
                backgroundColor = Colors.red[100]!;
                textColor = Colors.red;
              } else if (isCheckIn || isCheckOut) {
                backgroundColor = const Color(0xFF7BA7D8);
                textColor = Colors.white;
              } else if (inRange) {
                backgroundColor = Colors.blue[100]!;
                textColor = Colors.blue[900]!;
              }

              return GestureDetector(
                onTap: isPast || isFullyBooked
                    ? null
                    : isCheckIn
                        ? () => _selectCheckOutDate(date.add(const Duration(days: 1)))
                        : () => _selectCheckInDate(date),
                child: Container(
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    border: Border.all(
                      color: isCheckIn || isCheckOut
                          ? const Color(0xFF7BA7D8)
                          : Colors.grey[300]!,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$day',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      if (!isPast && !isFullyBooked)
                        Text(
                          '${availableSpaces} spaces',
                          style: TextStyle(
                            fontSize: 10,
                            color: textColor.withOpacity(0.7),
                          ),
                        ),
                      if (isFullyBooked)
                        Text(
                          'Full',
                          style: TextStyle(
                            fontSize: 10,
                            color: textColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        // Legend
        Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Legend',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 16,
                runSpacing: 8,
                children: [
                  _LegendItem(
                    color: const Color(0xFF7BA7D8),
                    label: 'Selected',
                  ),
                  _LegendItem(
                    color: Colors.blue[100]!,
                    label: 'In Range',
                  ),
                  _LegendItem(
                    color: Colors.red[100]!,
                    label: 'Full',
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
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

  void _showConfirmationDialog(double totalPrice) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Review Your Booking'),
          content: SingleChildScrollView(
            child: ListBody(
              children: [
                Text('Place: ${widget.place.name}'),
                const SizedBox(height: 8),
                Text('Check-in: ${_formatDate(checkInDate!)}'),
                Text('Check-out: ${_formatDate(checkOutDate!)}'),
                Text('Van Reg: ${_userVanReg ?? "Not set"}'),
                const SizedBox(height: 8),
                Text('Total: £${totalPrice.toStringAsFixed(0)}'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _submitBooking(totalPrice);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7BA7D8),
              ),
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submitBooking(double totalPrice) async {
    setState(() {
      isSubmitting = true;
    });

    try {
      // Get actual user ID from storage
      final userId = await StorageService.getUserId();
      if (userId == null || userId.isEmpty) {
        throw Exception('User not authenticated. Please log in again.');
      }

      debugPrint('� BOOKING: User ID: $userId');
      debugPrint('🟦 BOOKING: Total price: £${totalPrice.toStringAsFixed(2)}');
      debugPrint('🟦 BOOKING: About to call PaymentService.processPayment...');

      // Process payment FIRST before creating booking
      final paymentSuccess = await PaymentService.processPayment(
        amount: totalPrice,
        currency: 'GBP',
        bookingId: 'booking_${DateTime.now().millisecondsSinceEpoch}',
        context: context,
      );

      debugPrint('🟦 BOOKING: Payment returned: $paymentSuccess');

      if (!paymentSuccess) {
        debugPrint('❌ BOOKING: Payment was cancelled by user');
        setState(() {
          isSubmitting = false;
        });
        return;
      }

      debugPrint('✅ BOOKING: Payment successful, creating booking...');

      // Create booking ONLY after successful payment
      final booking = await ApiService.createBooking(
        placeId: widget.place.placeId,
        guestId: userId,
        checkIn: _formatDate(checkInDate!),
        checkOut: _formatDate(checkOutDate!),
        totalPrice: totalPrice,
        vanRegistration: _userVanReg ?? '',
      );

      debugPrint('✅ BOOKING: Booking created successfully');

      // Extract the nested booking data and normalize field names
      final bookingData = booking['booking'] ?? booking;
      final normalizedBooking = {
        'booking_id': bookingData['id']?.toString() ?? '',
        'booking_ref': bookingData['booking_ref'],
        'place_id': bookingData['place_id']?.toString() ?? '',
        'check_in': bookingData['check_in_date'] ?? '',
        'check_out': bookingData['check_out_date'] ?? '',
        'status': bookingData['status'] ?? 'confirmed',
        'total_price': bookingData['total_price'] ?? totalPrice,
      };

      if (mounted) {
        // Navigate to Bookings tab with booking detail on top
        final navigator = Navigator.of(context);
        HomeScreen.setNextTab(1);
        navigator.pushNamedAndRemoveUntil('/home', (route) => false);
        navigator.pushNamed('/booking-detail', arguments: {
          'booking': normalizedBooking,
          'place': widget.place,
        });
      }
    } catch (e) {
      debugPrint('❌ BOOKING: Booking error: $e');
      setState(() {
        isSubmitting = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking failed: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  void _showBookingSuccessDialog(Map<String, dynamic> booking) {
    // Determine booking tab based on place approval status
    String targetTab = 'confirmed';
    String statusMessage = 'Booking Confirmed!';
    String statusDetail = 'Your booking has been confirmed.';

    if (widget.place.approvalStatus != null) {
      if (widget.place.approvalStatus!.toLowerCase() == 'approved') {
        targetTab = 'confirmed';
        statusMessage = 'Booking Confirmed!';
        statusDetail = 'Your booking is confirmed and ready.';
      } else if (widget.place.approvalStatus!.toLowerCase() == 'pending') {
        targetTab = 'pending';
        statusMessage = 'Booking Submitted!';
        statusDetail = 'Your booking is pending host approval.';
      }
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(
            statusMessage,
            style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: ListBody(
              children: [
                Center(
                  child: Icon(
                    Icons.check_circle,
                    color: Colors.green,
                    size: 60,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Reference: ${booking['booking_ref'] ?? booking['booking_id'] ?? "N/A"}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 12),
                Text('Place: ${widget.place.name}'),
                Text('Check-in: ${_formatDate(checkInDate!)}'),
                Text('Check-out: ${_formatDate(checkOutDate!)}'),
                const SizedBox(height: 12),
                Text(
                  statusDetail,
                  style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
                ),
                if (targetTab == 'pending') ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, color: Colors.orange.shade700, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'The host has 7 days to accept your booking. If they don\'t respond, the hold on your card will be released and no payment will be taken.',
                            style: TextStyle(fontSize: 13, color: Colors.orange.shade900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                // Navigate directly to booking detail screen
                Navigator.of(context).pushReplacementNamed(
                  '/booking-detail',
                  arguments: {
                    'booking': booking,
                    'place': widget.place,
                  },
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
              ),
              child: const Text('View Booking', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalPrice = widget.place.pricePerNight * numberOfNights;
    final availableOnCheckIn =
        checkInDate != null ? getAvailableSpaces(checkInDate!) : 0;

    return Scaffold(
      appBar: AppBar(
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        title: const Text(
          'Booking Confirmation',
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Place Card
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
              ),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image carousel
                  if (widget.place.imageUrls.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        height: 200,
                        child: PageView.builder(
                          itemCount: widget.place.imageUrls.length,
                          itemBuilder: (context, index) {
                            return Image.network(
                              widget.place.imageUrls[index],
                              fit: BoxFit.cover,
                              width: double.infinity,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: Colors.grey[300],
                                  child: const Icon(Icons.image, color: Colors.grey),
                                );
                              },
                            );
                          },
                        ),
                      ),
                    )
                  else if (widget.place.imageUrl != null &&
                      widget.place.imageUrl!.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        widget.place.imageUrl!,
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.place.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Capacity: ${widget.place.capacity} spaces',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: availableOnCheckIn > 0
                              ? Colors.green
                              : Colors.red,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          availableOnCheckIn > 0 ? 'Available' : 'Full',
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
                    widget.place.address,
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '£${widget.place.pricePerNight.toStringAsFixed(0)}/night',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF7BA7D8),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Calendar
            const Text(
              'Select Dates',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildCalendar(),

            // Price Breakdown
            Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Price Breakdown',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                          '£${widget.place.pricePerNight.toStringAsFixed(0)} × $numberOfNights nights'),
                      Text(
                        '£${totalPrice.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '£${totalPrice.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF7BA7D8),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Van Registration (from profile)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_car, color: Color(0xFF7BA7D8), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Van Reg: ',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                  Text(
                    _userVanReg ?? 'Not set',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: _userVanReg != null ? Colors.grey[800] : Colors.red,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () async {
                      await Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const ProfileScreen(startInEditMode: true)),
                      );
                      _loadUserVanReg();
                    },
                    child: const Text(
                      'Edit',
                      style: TextStyle(
                        color: Color(0xFF7BA7D8),
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Book Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: availableOnCheckIn > 0 && !isSubmitting
                      ? const Color(0xFF7BA7D8)
                      : Colors.grey,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: availableOnCheckIn > 0 && checkInDate != null && checkOutDate != null && !isSubmitting
                    ? () {
                        if (_userVanReg == null || _userVanReg!.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please set your van registration in your profile (More > Profile) before booking'),
                              backgroundColor: Colors.red,
                              duration: Duration(seconds: 4),
                            ),
                          );
                          return;
                        }
                        _showConfirmationDialog(totalPrice);
                      }
                    : null,
                child: isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Confirm Booking',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _DayHeader extends StatelessWidget {
  final String day;

  const _DayHeader(this.day);

  @override
  Widget build(BuildContext context) {
    return Text(
      day,
      style: const TextStyle(
        fontWeight: FontWeight.bold,
        fontSize: 12,
        color: Colors.grey,
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 12),
        ),
      ],
    );
  }
}
