import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/models/place.dart';
import 'package:proper_place/services/storage_service.dart';
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
  final int _currentImageIndex = 0;
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  TimeOfDay _checkInTime = const TimeOfDay(hour: 12, minute: 0); // Default midday
  TimeOfDay _checkOutTime = const TimeOfDay(hour: 12, minute: 0); // Default midday
  List<Map<String, dynamic>> reviews = [];
  List<Map<String, dynamic>> existingBookings = [];
  bool isLoadingReviews = true;
  bool isLoadingBookings = true;
  
  // Fee rate per hour for early/late times
  static const double hourlyFeeRate = 5.0;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
    _loadReviews();
    _loadExistingBookings();
  }

  Future<void> _loadExistingBookings() async {
    try {
      final placeId = widget.place['id'];
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
      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/reviews?place_id=${widget.place['id']}'),
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
  
  // Check if a date is booked (unavailable)
  bool _isDateBooked(DateTime date) {
    for (var booking in existingBookings) {
      final checkIn = DateTime.parse(booking['check_in_date'].toString().substring(0, 10));
      final checkOut = DateTime.parse(booking['check_out_date'].toString().substring(0, 10));
      
      // Date is booked if it falls within an existing booking
      // A date is available if it's the checkout date (person leaves at midday)
      if (date.isAfter(checkIn.subtract(const Duration(days: 1))) && 
          date.isBefore(checkOut)) {
        return true;
      }
    }
    return false;
  }
  
  // Check if selected date range conflicts with existing bookings
  bool _hasConflict() {
    if (_checkInDate == null || _checkOutDate == null) return false;
    
    for (var booking in existingBookings) {
      final existingCheckIn = DateTime.parse(booking['check_in_date'].toString().substring(0, 10));
      final existingCheckOut = DateTime.parse(booking['check_out_date'].toString().substring(0, 10));
      
      // Check for overlap
      // New booking overlaps if: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
      if (_checkInDate!.isBefore(existingCheckOut) && _checkOutDate!.isAfter(existingCheckIn)) {
        return true;
      }
    }
    return false;
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

    try {
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
          'status': 'pending',
        }),
      );

      if (response.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking created successfully!')),
        );
        Navigator.of(context).pop();
      } else {
        final error = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error['message'] ?? 'Error creating booking')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating booking: $e')),
      );
    }
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
                      zoom: 15,
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
    final priceRaw = widget.place['price_per_night'] ?? 50;
    final pricePerNight = priceRaw is String ? double.tryParse(priceRaw) ?? 50.0 : (priceRaw as num).toDouble();
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

                  // Vehicle Size Limits - Important for motorhome users
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
                          onPressed: _hasConflict() ? null : _createBooking,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF7BA7D8),
                            disabledBackgroundColor: Colors.grey[300],
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
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'No reviews at this site yet. Please leave a review after your stay to help out other guests!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 14,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
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
