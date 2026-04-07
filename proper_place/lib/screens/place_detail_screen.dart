import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/models/place.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/payment_service.dart';
import 'package:proper_place/screens/home_screen.dart';
import 'package:proper_place/widgets/availability_calendar_picker.dart';

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
  int _currentImageIndex = 0;
  bool _isProcessingPayment = false;
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  TimeOfDay _checkInTime = const TimeOfDay(hour: 12, minute: 0); // Default midday
  TimeOfDay _checkOutTime = const TimeOfDay(hour: 12, minute: 0); // Default midday
  List<Map<String, dynamic>> reviews = [];
  List<Map<String, dynamic>> existingBookings = [];
  bool isLoadingReviews = true;
  bool isLoadingBookings = true;
  int _siteCapacity = 1;
  List<String> _vehicleFitIssues = [];
  
  // Fee rate per hour for early/late times
  static const double hourlyFeeRate = 5.0;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
    _loadReviews();
    _loadExistingBookings();
    _loadVehicleFit();
  }

  Future<void> _loadVehicleFit() async {
    final issues = await _checkVehicleFit();
    if (mounted) {
      setState(() => _vehicleFitIssues = issues);
    }
  }

  Future<void> _loadExistingBookings() async {
    try {
      final placeId = widget.place['id'];
      // Load capacity from the place data or default to 1
      final cap = widget.place['capacity'];
      _siteCapacity = (cap is int ? cap : (cap is String ? int.tryParse(cap) ?? 1 : 1)).clamp(1, 9999);

      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/bookings/place/$placeId'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          existingBookings = List<Map<String, dynamic>>.from(data['bookings'] ?? []);
          isLoadingBookings = false;
        });
      } else {
        setState(() => isLoadingBookings = false);
      }
    } catch (e) {
      print('Error loading bookings: $e');
      setState(() => isLoadingBookings = false);
    }
  }

  Future<void> _loadReviews() async {
    try {
      final placeId = widget.place['id'];
      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/reviews/places/$placeId/reviews'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          reviews = List<Map<String, dynamic>>.from(data['reviews'] ?? []);
          isLoadingReviews = false;
        });
      } else {
        // Non-200 response (404, 500, etc.) - stop loading and show empty state
        setState(() {
          reviews = [];
          isLoadingReviews = false;
        });
      }
    } catch (e) {
      setState(() {
        reviews = [];
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
  
  // Calculate early check-in fee (arriving before 12:00)
  double get earlyCheckinFee {
    if (_checkInTime.hour < 12) {
      return (12 - _checkInTime.hour) * hourlyFeeRate;
    }
    return 0;
  }
  
  // Calculate late check-out fee (leaving after 12:00)
  double get lateCheckoutFee {
    if (_checkOutTime.hour > 12) {
      return (_checkOutTime.hour - 12) * hourlyFeeRate;
    }
    return 0;
  }
  
  double get basePrice {
    final priceRaw = widget.place['price_per_night'] ?? 0;
    final price = priceRaw is String ? double.tryParse(priceRaw) ?? 0.0 : (priceRaw is num ? priceRaw.toDouble() : 0.0);
    return price * nightsCount;
  }

  double get totalPrice {
    return basePrice + earlyCheckinFee + lateCheckoutFee;
  }
  
  // Check if a date is fully booked (all spaces taken)
  bool _isDateBooked(DateTime date) {
    final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    int count = 0;
    for (var booking in existingBookings) {
      final checkIn = booking['check_in_date'].toString().substring(0, 10);
      final checkOut = booking['check_out_date'].toString().substring(0, 10);
      if (dateStr.compareTo(checkIn) >= 0 && dateStr.compareTo(checkOut) < 0) {
        count++;
      }
    }
    return count >= _siteCapacity;
  }
  
  // Check if selected date range conflicts with existing bookings (any night at capacity)
  bool _hasConflict() {
    if (_checkInDate == null || _checkOutDate == null) return false;
    
    DateTime night = DateTime(_checkInDate!.year, _checkInDate!.month, _checkInDate!.day);
    final checkOut = DateTime(_checkOutDate!.year, _checkOutDate!.month, _checkOutDate!.day);
    
    while (night.isBefore(checkOut)) {
      if (_isDateBooked(night)) return true;
      night = night.add(const Duration(days: 1));
    }
    return false;
  }

  // Check if user's vehicle dimensions fit the place's limits
  Future<List<String>> _checkVehicleFit() async {
    final issues = <String>[];
    final userDimensions = await StorageService.getVehicleDimensions();
    
    final userHeight = userDimensions['height'] as double;
    final userWidth = userDimensions['width'] as double;
    final userLength = userDimensions['length'] as double;
    
    // Parse place limits
    final maxHeight = _parseDouble(widget.place['max_vehicle_height_ft']);
    final maxWidth = _parseDouble(widget.place['max_vehicle_width_ft']);
    final maxLength = _parseDouble(widget.place['max_vehicle_length_ft']);
    
    // Check each dimension
    if (maxHeight != null && userHeight > maxHeight) {
      issues.add('Your vehicle height (${userHeight.toStringAsFixed(1)}ft) exceeds the maximum allowed (${maxHeight.toStringAsFixed(1)}ft)');
    }
    if (maxWidth != null && userWidth > maxWidth) {
      issues.add('Your vehicle width (${userWidth.toStringAsFixed(1)}ft) exceeds the maximum allowed (${maxWidth.toStringAsFixed(1)}ft)');
    }
    if (maxLength != null && userLength > maxLength) {
      issues.add('Your vehicle length (${userLength.toStringAsFixed(0)}ft) exceeds the maximum allowed (${maxLength.toStringAsFixed(0)}ft)');
    }
    
    return issues;
  }
  
  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }


  void _selectDate(BuildContext context, {required bool isCheckIn}) async {
    // For checkout, start at checkout date or day after check-in
    final initialDate = isCheckIn 
      ? (_checkInDate ?? DateTime.now())
      : (_checkOutDate ?? (_checkInDate?.add(const Duration(days: 1)) ?? DateTime.now().add(const Duration(days: 1))));
    
    // Minimum date for checkout is the day after check-in
    final minDateForCheckout = isCheckIn 
      ? null 
      : (_checkInDate?.add(const Duration(days: 1)) ?? DateTime.now().add(const Duration(days: 1)));

    showDialog(
      context: context,
      builder: (context) => AvailabilityCalendarPicker(
        placeId: int.parse(widget.place['id'].toString()),
        initialDate: initialDate,
        isCheckIn: isCheckIn,
        minDate: minDateForCheckout,
        checkInDate: _checkInDate,
        checkOutDate: _checkOutDate,
        onDateSelected: (picked) {
          setState(() {
            if (isCheckIn) {
              _checkInDate = picked;
              // Set checkout to at least the day after check-in
              if (_checkOutDate == null || _checkOutDate!.isBefore(picked.add(const Duration(days: 1)))) {
                _checkOutDate = picked.add(const Duration(days: 1));
              }
            } else {
              _checkOutDate = picked;
            }
          });
        },
      ),
    );
  }
  
  void _selectTime(BuildContext context, {required bool isCheckIn}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isCheckIn ? _checkInTime : _checkOutTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
              onSurface: Colors.black,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: Colors.black,
              ),
            ),
          ),
          child: MediaQuery(
            data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
            child: child!,
          ),
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          _checkInTime = picked;
        } else {
          _checkOutTime = picked;
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
    
    // Check for conflicts with existing bookings
    if (_hasConflict()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selected dates conflict with an existing booking'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Vehicle size check is now handled by the banner - block booking entirely
    if (_vehicleFitIssues.isNotEmpty) {
      return;
    }

    setState(() => _isProcessingPayment = true);

    try {
      // Re-check availability on the server before taking payment
      final placeId = widget.place['id'];
      try {
        final availResp = await http.get(
          Uri.parse('${AppConfig.properPlaceBackendUrl}/bookings/availability/place/$placeId'
              '?from_date=${_checkInDate!.toIso8601String().substring(0, 10)}'
              '&to_date=${_checkOutDate!.toIso8601String().substring(0, 10)}'),
        );
        if (availResp.statusCode == 200) {
          final data = jsonDecode(availResp.body);
          final availability = data['availability'] as Map<String, dynamic>? ?? {};
          for (var entry in availability.entries) {
            final dayData = entry.value as Map<String, dynamic>;
            if (dayData['isFull'] == true) {
              setState(() => _isProcessingPayment = false);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Sorry, this site is fully booked on ${entry.key}. Please choose different dates.'),
                    backgroundColor: Colors.red,
                  ),
                );
                _loadExistingBookings();
              }
              return;
            }
          }
        }
      } catch (_) {
        // If availability check fails, proceed and let backend reject if needed
      }

      // Process payment via Stripe (authorises card but doesn't capture yet)
      final paymentIntentId = await PaymentService.processPayment(
        amount: totalPrice,
        currency: 'GBP',
        bookingId: 'booking_${DateTime.now().millisecondsSinceEpoch}',
        context: context,
        placeId: widget.place['id'] is int ? widget.place['id'] : int.tryParse(widget.place['id'].toString()),
      );

      if (paymentIntentId == null) {
        // User cancelled or payment failed — don't create booking
        setState(() => _isProcessingPayment = false);
        return;
      }

      // Payment authorised — now create the booking (pending host approval)
      final token = await StorageService.getToken();
      // Format times as HH:mm
      final checkInTimeStr = '${_checkInTime.hour.toString().padLeft(2, '0')}:${_checkInTime.minute.toString().padLeft(2, '0')}';
      final checkOutTimeStr = '${_checkOutTime.hour.toString().padLeft(2, '0')}:${_checkOutTime.minute.toString().padLeft(2, '0')}';
      
      final response = await http.post(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/bookings'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'place_id': widget.place['id'],
          'check_in_date': _checkInDate!.toIso8601String(),
          'check_out_date': _checkOutDate!.toIso8601String(),
          'check_in_time': checkInTimeStr,
          'check_out_time': checkOutTimeStr,
          'total_price': totalPrice,
          'payment_intent_id': paymentIntentId,
        }),
      );

      if (response.statusCode == 201) {
        final bookingData = jsonDecode(response.body)['booking'];
        final bookingRef = bookingData?['booking_ref'];
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Booking submitted! Ref: ${bookingRef ?? 'Success'} — awaiting host approval (7 days to respond)'),
              duration: const Duration(seconds: 4),
            ),
          );
          // Navigate to Bookings tab (index 1 for user mode)
          HomeScreen.setNextTab(1);
          Navigator.of(context).pushNamedAndRemoveUntil('/home', (route) => false);
        }
      } else {
        final error = jsonDecode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error['message'] ?? 'Error creating booking')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error creating booking: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessingPayment = false);
    }
  }

  void _showFullScreenImage(BuildContext context, String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            elevation: 0,
          ),
          body: Center(
            child: InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(
                imageUrl,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showOnMap(BuildContext context) {
    // Get coordinates from place
    final latRaw = widget.place['latitude'];
    final lngRaw = widget.place['longitude'];
    
    final lat = latRaw is String ? double.tryParse(latRaw) : (latRaw is num ? latRaw.toDouble() : null);
    final lng = lngRaw is String ? double.tryParse(lngRaw) : (lngRaw is num ? lngRaw.toDouble() : null);
    
    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location coordinates not available')),
      );
      return;
    }
    
    final placeName = widget.place['name'] ?? 'Place';
    final location = LatLng(lat, lng);
    
    // Show map dialog zoomed into the location
    showDialog(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: Column(
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(16),
                  color: const Color(0xFF7BA7D8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          placeName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                // Map
                Expanded(
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: location,
                      zoom: 12,
                    ),
                    markers: {
                      Marker(
                        markerId: MarkerId(widget.place['id'].toString()),
                        position: location,
                        infoWindow: InfoWindow(title: placeName),
                      ),
                    },
                    zoomControlsEnabled: true,
                    myLocationButtonEnabled: false,
                    mapToolbarEnabled: false,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rawImageUrl = widget.place['image_url'] ??
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800';
    final imageUrl = Place.toFullImageUrl(rawImageUrl) ?? rawImageUrl;
    // Build full image list from image_urls, falling back to single image_url
    final rawImageUrls = widget.place['image_urls'] as List? ?? [];
    final allImages = rawImageUrls.isNotEmpty
        ? rawImageUrls.map((url) => Place.toFullImageUrl(url.toString()) ?? url.toString()).toList()
        : [imageUrl];
    final priceRaw = widget.place['price_per_night'] ?? 50;
    final pricePerNight = priceRaw is String ? double.tryParse(priceRaw) ?? 50.0 : (priceRaw as num).toDouble();
    final rating = widget.place['rating'] ?? 4.5;
    final facilities = widget.place['facilities'] as List? ?? [];

    return Scaffold(
      appBar: AppBar(
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        title: const Text(
          'Place Details',
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Vehicle size warning banner
            if (_vehicleFitIssues.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                color: const Color(0xFFFFEBEE),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Icon(Icons.warning_rounded, color: const Color(0xFFB71C1C), size: 28),
                        Icon(Icons.warning_amber_rounded, color: const Color(0xFFFFEBEE), size: 24),
                        Icon(Icons.warning_amber_rounded, color: const Color(0xFFD32F2F), size: 22),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Your vehicle is too large for this site',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFC62828),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _vehicleFitIssues.join(' \u2022 '),
                            style: const TextStyle(fontSize: 12, color: Color(0xFFB71C1C)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Hide unsuitable sites'),
                            content: const Text(
                              'You can hide all sites that are too small for your vehicle in the Settings page under Vehicle Dimensions.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(context).pop(),
                                child: const Text('OK'),
                              ),
                            ],
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFD32F2F).withOpacity(0.15),
                        ),
                        child: const Icon(Icons.info_outline, color: Color(0xFFD32F2F), size: 20),
                      ),
                    ),
                  ],
                ),
              ),

            // Image Gallery
            Container(
              height: 300,
              color: Colors.grey[300],
              child: allImages.length > 1
                  ? Stack(
                      children: [
                        PageView.builder(
                          controller: _imageController,
                          itemCount: allImages.length,
                          onPageChanged: (index) {
                            setState(() => _currentImageIndex = index);
                          },
                          itemBuilder: (context, index) {
                            return Image.network(
                              allImages[index],
                              fit: BoxFit.cover,
                              width: double.infinity,
                              errorBuilder: (_, __, ___) => Container(
                                color: Colors.grey[300],
                                child: const Icon(Icons.image, size: 48),
                              ),
                            );
                          },
                        ),
                        // Image counter
                        Positioned(
                          bottom: 12,
                          left: 0,
                          right: 0,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(allImages.length, (index) {
                              return Container(
                                width: 8,
                                height: 8,
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _currentImageIndex == index
                                      ? Colors.white
                                      : Colors.white.withOpacity(0.4),
                                ),
                              );
                            }),
                          ),
                        ),
                        // Image count badge
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${_currentImageIndex + 1}/${allImages.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Image.network(
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
                      Expanded(
                        child: Text(
                          widget.place['address'] ?? 'Location',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Show on Map Button
                  OutlinedButton.icon(
                    onPressed: () => _showOnMap(context),
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
                  const SizedBox(height: 16),

                  // Description
                  Text(
                    widget.place['description'] ?? 'No description',
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                  const SizedBox(height: 24),

                  // Booking Section (Calendar)
                  IgnorePointer(
                    ignoring: _vehicleFitIssues.isNotEmpty,
                    child: Opacity(
                      opacity: _vehicleFitIssues.isNotEmpty ? 0.4 : 1.0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
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
                        const SizedBox(height: 8),
                        Text(
                          'Standard times are 12:00 (midday). Early arrival or late departure incurs additional fees.',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 16),

                        // Check-in Date and Time Row
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Check-in', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                // Date picker
                                Expanded(
                                  flex: 2,
                                  child: InkWell(
                                    onTap: () => _selectDate(context, isCheckIn: true),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey[300]!),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_today, size: 16, color: Color(0xFF7BA7D8)),
                                          const SizedBox(width: 8),
                                          Text(
                                            _checkInDate != null
                                                ? '${_checkInDate!.day}/${_checkInDate!.month}/${_checkInDate!.year}'
                                                : 'Select date',
                                            style: TextStyle(
                                              color: _checkInDate != null ? Colors.black : Colors.grey[500],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Time picker
                                Expanded(
                                  child: InkWell(
                                    onTap: () => _selectTime(context, isCheckIn: true),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: _checkInTime.hour < 12 ? Colors.orange : Colors.grey[300]!,
                                        ),
                                        borderRadius: BorderRadius.circular(8),
                                        color: _checkInTime.hour < 12 ? Colors.orange.withOpacity(0.1) : null,
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.access_time, size: 16, color: Color(0xFF7BA7D8)),
                                          const SizedBox(width: 4),
                                          Text(
                                            '${_checkInTime.hour.toString().padLeft(2, '0')}:${_checkInTime.minute.toString().padLeft(2, '0')}',
                                            style: TextStyle(
                                              color: _checkInTime.hour < 12 ? Colors.orange[800] : Colors.black,
                                              fontWeight: _checkInTime.hour < 12 ? FontWeight.w600 : FontWeight.normal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (_checkInTime.hour < 12)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Early arrival +£${earlyCheckinFee.toStringAsFixed(0)}',
                                  style: TextStyle(fontSize: 12, color: Colors.orange[800]),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Check-out Date and Time Row
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Check-out', style: TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                // Date picker
                                Expanded(
                                  flex: 2,
                                  child: InkWell(
                                    onTap: () => _selectDate(context, isCheckIn: false),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey[300]!),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.calendar_today, size: 16, color: Color(0xFF7BA7D8)),
                                          const SizedBox(width: 8),
                                          Text(
                                            _checkOutDate != null
                                                ? '${_checkOutDate!.day}/${_checkOutDate!.month}/${_checkOutDate!.year}'
                                                : 'Select date',
                                            style: TextStyle(
                                              color: _checkOutDate != null ? Colors.black : Colors.grey[500],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Time picker
                                Expanded(
                                  child: InkWell(
                                    onTap: () => _selectTime(context, isCheckIn: false),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: _checkOutTime.hour > 12 ? Colors.orange : Colors.grey[300]!,
                                        ),
                                        borderRadius: BorderRadius.circular(8),
                                        color: _checkOutTime.hour > 12 ? Colors.orange.withOpacity(0.1) : null,
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.access_time, size: 16, color: Color(0xFF7BA7D8)),
                                          const SizedBox(width: 4),
                                          Text(
                                            '${_checkOutTime.hour.toString().padLeft(2, '0')}:${_checkOutTime.minute.toString().padLeft(2, '0')}',
                                            style: TextStyle(
                                              color: _checkOutTime.hour > 12 ? Colors.orange[800] : Colors.black,
                                              fontWeight: _checkOutTime.hour > 12 ? FontWeight.w600 : FontWeight.normal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (_checkOutTime.hour > 12)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Late departure +£${lateCheckoutFee.toStringAsFixed(0)}',
                                  style: TextStyle(fontSize: 12, color: Colors.orange[800]),
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
                                  Text('£${basePrice.toStringAsFixed(2)}'),
                                ],
                              ),
                              if (earlyCheckinFee > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Early check-in fee', style: TextStyle(color: Colors.orange[800])),
                                      Text('£${earlyCheckinFee.toStringAsFixed(2)}', style: TextStyle(color: Colors.orange[800])),
                                    ],
                                  ),
                                ),
                              if (lateCheckoutFee > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Late check-out fee', style: TextStyle(color: Colors.orange[800])),
                                      Text('£${lateCheckoutFee.toStringAsFixed(2)}', style: TextStyle(color: Colors.orange[800])),
                                    ],
                                  ),
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

                        // Conflict Warning
                        if (_hasConflict())
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.warning, color: Colors.red, size: 20),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Selected dates conflict with existing booking',
                                    style: TextStyle(color: Colors.red, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Book Button
                        ElevatedButton(
                          onPressed: (_hasConflict() || _isProcessingPayment) ? null : _createBooking,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF7BA7D8),
                            disabledBackgroundColor: Colors.grey[300],
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: _isProcessingPayment
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                              )
                            : const Text(
                            'Book Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Your card will be authorised at the time of booking. Payment is only captured once the host approves your stay. All funds are held securely by Stripe (our payment processor) — not by Proper Place — until the stay has completed, as protection for all parties.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            height: 1.4,
                          ),
                        ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Reviews Section (only show if populated)
                  if (isLoadingReviews)
                    const Center(child: CircularProgressIndicator())
                  else if (reviews.isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Reviews',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
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
                                                review['user_name'] ?? review['name'] ?? 'Anonymous',
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
                                          // Review photos
                                          if (review['photo_urls'] != null && (review['photo_urls'] as List).isNotEmpty) ...[  
                                            const SizedBox(height: 10),
                                            SizedBox(
                                              height: 180,
                                              child: ListView.builder(
                                                scrollDirection: Axis.horizontal,
                                                itemCount: (review['photo_urls'] as List).length,
                                                itemBuilder: (context, index) {
                                                  final url = (review['photo_urls'] as List)[index];
                                                  return GestureDetector(
                                                    onTap: () => _showFullScreenImage(context, url.toString()),
                                                    child: Padding(
                                                      padding: const EdgeInsets.only(right: 8),
                                                      child: ClipRRect(
                                                        borderRadius: BorderRadius.circular(10),
                                                        child: Image.network(
                                                          url.toString(),
                                                          width: 240,
                                                          height: 180,
                                                          fit: BoxFit.cover,
                                                          loadingBuilder: (context, child, progress) {
                                                            if (progress == null) return child;
                                                            return Container(
                                                              width: 240,
                                                              height: 180,
                                                              color: Colors.grey[200],
                                                              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                                            );
                                                          },
                                                          errorBuilder: (_, __, ___) => Container(
                                                            width: 240,
                                                            height: 180,
                                                            color: Colors.grey[200],
                                                            child: const Icon(Icons.broken_image, color: Colors.grey),
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                  );
                                                },
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

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
                          spacing: 16,
                          runSpacing: 10,
                          children: [
                            for (var facility in facilities)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(_getFacilityIcon(facility.toString()), size: 20, color: const Color(0xFF7BA7D8)),
                                  const SizedBox(width: 6),
                                  Text(
                                    facility.toString(),
                                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                                  ),
                                ],
                              ),
                          ],
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

                  // Vehicle Size Limits
                  if (widget.place['max_vehicle_height_ft'] != null ||
                      widget.place['max_vehicle_width_ft'] != null ||
                      widget.place['max_vehicle_length_ft'] != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF93C5FD)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.directions_car, color: const Color(0xFF2563EB), size: 22),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Vehicle Size Limits',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1E40AF),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Check your vehicle fits before booking',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  if (widget.place['max_vehicle_height_ft'] != null)
                                    _buildVehicleSizeItem(
                                      'Height',
                                      '${widget.place['max_vehicle_height_ft']}ft',
                                      Icons.height,
                                    ),
                                  if (widget.place['max_vehicle_width_ft'] != null)
                                    _buildVehicleSizeItem(
                                      'Width',
                                      '${widget.place['max_vehicle_width_ft']}ft',
                                      Icons.swap_horiz,
                                    ),
                                  if (widget.place['max_vehicle_length_ft'] != null)
                                    _buildVehicleSizeItem(
                                      'Length',
                                      '${widget.place['max_vehicle_length_ft']}ft',
                                      Icons.straighten,
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

                  // Access Route Description
                  if (widget.place['access_route_description'] != null && 
                      widget.place['access_route_description'].toString().isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFB923C)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.route, color: const Color(0xFFF97316), size: 22),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Access Route',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFFC2410C),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'How to reach this site',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                widget.place['access_route_description'],
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

                  // Business Description (if available)
                  if (widget.place['business_description'] != null && 
                      widget.place['business_description'].toString().isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'About This Business',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0F4F8),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            widget.place['business_description'],
                            style: TextStyle(
                              color: Colors.grey[700],
                              height: 1.4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),

                  // Opening Hours
                  if (widget.place['opening_hours'] != null &&
                      widget.place['opening_hours'].toString().isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF86EFAC)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.access_time, color: Color(0xFF16A34A), size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Opening Hours',
                                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      widget.place['opening_hours'].toString(),
                                      style: TextStyle(color: Colors.grey[700]),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),

                  // Kitchen Hours
                  if (widget.place['kitchen_hours'] != null &&
                      widget.place['kitchen_hours'].toString().isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.restaurant_menu, color: Color(0xFFD97706), size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Kitchen Hours',
                                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      widget.place['kitchen_hours'].toString(),
                                      style: TextStyle(color: Colors.grey[700]),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),

                  // Food Menu Description
                  if (widget.place['food_menu_description'] != null &&
                      widget.place['food_menu_description'].toString().isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFDF2F8),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFF9A8D4)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.menu_book, color: Color(0xFFDB2777), size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Food Menu',
                                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF9D174D)),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      widget.place['food_menu_description'].toString(),
                                      style: TextStyle(color: Colors.grey[700], height: 1.4),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                ],
              ),
            ),
          ],
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

  Widget _buildVehicleSizeItem(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF2563EB), size: 20),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E40AF),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
  }
}
