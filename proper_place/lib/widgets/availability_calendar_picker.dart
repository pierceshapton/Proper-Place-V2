import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';

/// Range calendar picker — select check-in and check-out in one dialog.
/// Orange = current selection, green = confirmed existing bookings.
class AvailabilityCalendarPicker extends StatefulWidget {
  final int placeId;
  final DateTime initialDate;
  final Function(DateTime checkIn, DateTime checkOut) onRangeSelected;
  final DateTime? checkInDate;
  final DateTime? checkOutDate;
  final Set<DateTime>? userBookedDates;
  final Set<DateTime>? userCheckoutDates;
  final Map<DateTime, double>? userCheckinHours;  // hour (0-24) of check-in per date
  final Map<DateTime, double>? userCheckoutHours; // hour (0-24) of check-out per date

  const AvailabilityCalendarPicker({
    super.key,
    required this.placeId,
    required this.initialDate,
    required this.onRangeSelected,
    this.checkInDate,
    this.checkOutDate,
    this.userBookedDates,
    this.userCheckoutDates,
    this.userCheckinHours,
    this.userCheckoutHours,
  });

  @override
  State<AvailabilityCalendarPicker> createState() => _AvailabilityCalendarPickerState();
}

class _AvailabilityCalendarPickerState extends State<AvailabilityCalendarPicker> {
  late DateTime currentMonth;
  Map<String, dynamic> availability = {};
  bool isLoading = true;
  int? capacity;

  DateTime? _selectedCheckIn;
  DateTime? _selectedCheckOut;

  @override
  void initState() {
    super.initState();
    currentMonth = DateTime(widget.initialDate.year, widget.initialDate.month, 1);
    _selectedCheckIn = widget.checkInDate != null
        ? DateTime(widget.checkInDate!.year, widget.checkInDate!.month, widget.checkInDate!.day)
        : null;
    _selectedCheckOut = widget.checkOutDate != null
        ? DateTime(widget.checkOutDate!.year, widget.checkOutDate!.month, widget.checkOutDate!.day)
        : null;
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    try {
      final fromDate = DateTime(currentMonth.year, currentMonth.month, 1);
      final toDate = DateTime(currentMonth.year, currentMonth.month + 3, 1).add(const Duration(days: -1));

      final token = await StorageService.getToken();
      final response = await http.get(
        Uri.parse(
          '${AppConfig.properPlaceBackendUrl}/bookings/availability/place/${widget.placeId}'
          '?from_date=${fromDate.toIso8601String().split('T')[0]}'
          '&to_date=${toDate.toIso8601String().split('T')[0]}',
        ),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          availability = data['availability'] ?? {};
          capacity = data['place']?['capacity'] ?? 1;
          isLoading = false;
        });
      } else {
        setState(() => isLoading = false);
      }
    } catch (e) {
      print('Error loading availability: $e');
      setState(() => isLoading = false);
    }
  }

  /// Check if any night in [checkIn, checkOut) overlaps with user's existing booking nights.
  /// A "night" is the check-in date through check-out-1 of each booking.
  /// Checkout boundaries of existing bookings are NOT nights (user is leaving that day).
  bool _rangeHasUserBookedNights(DateTime checkIn, DateTime checkOut) {
    var night = checkIn;
    while (night.isBefore(checkOut)) {
      final isBooked = widget.userBookedDates?.contains(night) ?? false;
      final isCheckoutBoundary = widget.userCheckoutDates?.contains(night) ?? false;
      // A date that's booked but is ONLY a checkout boundary is not a real night
      if (isBooked && !isCheckoutBoundary) {
        return true;
      }
      night = night.add(const Duration(days: 1));
    }
    return false;
  }

  void _onDateTapped(DateTime date) {
    setState(() {
      if (_selectedCheckIn == null || (_selectedCheckIn != null && _selectedCheckOut != null)) {
        // Start new selection
        _selectedCheckIn = date;
        _selectedCheckOut = null;
      } else {
        // Second tap — set checkout
        if (date.isAfter(_selectedCheckIn!)) {
          // Validate range: no existing booking nights between check-in and check-out
          if (_rangeHasUserBookedNights(_selectedCheckIn!, date)) {
            // Range overlaps existing bookings — restart with this date
            _selectedCheckIn = date;
            _selectedCheckOut = null;
          } else {
            _selectedCheckOut = date;
          }
        } else if (date.isBefore(_selectedCheckIn!)) {
          // Tapped before check-in — restart
          _selectedCheckIn = date;
          _selectedCheckOut = null;
        } else {
          // Same day — set checkout to next day
          _selectedCheckOut = date.add(const Duration(days: 1));
        }
      }
    });
  }

  String get _headerText {
    if (_selectedCheckIn == null) return 'Select check-in date';
    if (_selectedCheckOut == null) return 'Select check-out date';
    final nights = _selectedCheckOut!.difference(_selectedCheckIn!).inDays;
    return '$nights night${nights == 1 ? '' : 's'} selected';
  }

  @override
  Widget build(BuildContext context) {
    final hasRange = _selectedCheckIn != null && _selectedCheckOut != null;
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      insetPadding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with month/year navigation
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left, size: 24),
                  onPressed: () {
                    setState(() {
                      currentMonth = DateTime(currentMonth.year, currentMonth.month - 1, 1);
                      isLoading = true;
                      _loadAvailability();
                    });
                  },
                ),
                Column(
                  children: [
                    Text(
                      DateFormat('MMMM yyyy').format(currentMonth),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _headerText,
                      style: TextStyle(
                        fontSize: 12,
                        color: hasRange ? Colors.orange[800] : Colors.grey[600],
                        fontWeight: hasRange ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right, size: 24),
                  onPressed: () {
                    setState(() {
                      currentMonth = DateTime(currentMonth.year, currentMonth.month + 1, 1);
                      isLoading = true;
                      _loadAvailability();
                    });
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Calendar
          Flexible(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Weekday headers
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                            .map(
                              (day) => Expanded(
                                child: Text(
                                  day,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey[600],
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                    if (isLoading)
                      const Padding(
                        padding: EdgeInsets.all(40),
                        child: CircularProgressIndicator(),
                      )
                    else
                      _buildCalendarGrid(),
                  ],
                ),
              ),
            ),
          ),
          // Bottom bar with legend + confirm
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Column(
              children: [
                // Legend
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _legendDot(const Color(0xFF7BA7D8), 'Booked'),
                    const SizedBox(width: 12),
                    _legendDot(const Color(0xFFFFCDD2), 'Fully booked'),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: hasRange
                        ? () {
                            widget.onRangeSelected(_selectedCheckIn!, _selectedCheckOut!);
                            Navigator.pop(context);
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7BA7D8),
                      disabledBackgroundColor: Colors.grey[300],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      hasRange ? 'Confirm Dates' : 'Select your dates',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3)),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[700])),
      ],
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(currentMonth.year, currentMonth.month, 1);
    final lastDay = DateTime(currentMonth.year, currentMonth.month + 1, 0);
    final daysInMonth = lastDay.day;
    final firstWeekday = firstDay.weekday;

    final cells = <Widget>[];

    for (int i = 0; i < firstWeekday - 1; i++) {
      cells.add(const SizedBox());
    }

    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(currentMonth.year, currentMonth.month, day);
      final dateStr = date.toIso8601String().split('T')[0];
      final availData = availability[dateStr];
      cells.add(_buildDateTile(date, availData));
    }

    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 0.65,
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      children: cells,
    );
  }

  Widget _buildDateTile(DateTime date, dynamic availData) {
    final dateOnly = DateTime(date.year, date.month, date.day);
    final isPast = dateOnly.isBefore(DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day));
    final available = availData?['available'] ?? capacity ?? 1;
    final isFull = availData?['isFull'] ?? false;
    final isToday = dateOnly == DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final isUserBooked = widget.userBookedDates?.contains(dateOnly) ?? false;
    final isUserCheckout = widget.userCheckoutDates?.contains(dateOnly) ?? false;
    final isUserCheckinDay = widget.userCheckinHours?.containsKey(dateOnly) ?? false;

    // Selection state
    final isCheckIn = _selectedCheckIn != null && dateOnly == _selectedCheckIn;
    final isCheckOut = _selectedCheckOut != null && dateOnly == _selectedCheckOut;
    final isBetween = _selectedCheckIn != null &&
        _selectedCheckOut != null &&
        dateOnly.isAfter(_selectedCheckIn!) &&
        dateOnly.isBefore(_selectedCheckOut!);
    final isInRange = isCheckIn || isCheckOut || isBetween;

    // Allow boundary dates: checkout day of existing booking (can be new check-in),
    // check-in day of existing booking (can be new check-out)
    final canSelect = !isPast && !isFull && (!isUserBooked || isUserCheckout || isUserCheckinDay);

    // --- Colours ---
    const greenBooked = Color(0xFF7BA7D8); // App blue for booked dates
    const redFull = Color(0xFFFFCDD2); // fully booked
    const cream = Color(0xFFECE8DB); // App standard off-white

    Color backgroundColor;
    Gradient? gradient;

    if (isUserBooked && isUserCheckout) {
      // Leaving day: green on left, cream on right. Split at checkout hour.
      final checkoutHour = widget.userCheckoutHours?[dateOnly] ?? 12.0;
      final stop = (checkoutHour / 24.0).clamp(0.05, 0.95);
      gradient = LinearGradient(
        colors: const [greenBooked, greenBooked, cream, cream],
        stops: [0.0, stop * 0.5, stop * 0.5 + 0.3, 1.0],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );
      backgroundColor = greenBooked;
    } else if (isUserBooked) {
      // Booked / check-in day: cream on left, green on right. Split at checkin hour.
      final checkinHour = widget.userCheckinHours?[dateOnly];
      if (checkinHour != null) {
        // First day of booking — gradient starts at check-in hour
        final stop = (checkinHour / 24.0).clamp(0.05, 0.95);
        gradient = LinearGradient(
          colors: const [cream, cream, greenBooked, greenBooked],
          stops: [0.0, stop * 0.5, stop * 0.5 + 0.3, 1.0],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        );
      } else {
        // Middle days — fully booked, solid green
      }
      backgroundColor = greenBooked;
    } else if (isCheckIn && _selectedCheckOut != null) {
      // Check-in: cream→green fade (arriving)
      gradient = const LinearGradient(
        colors: [cream, greenBooked],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );
      backgroundColor = greenBooked;
    } else if (isCheckIn) {
      // Only check-in selected, no checkout yet
      backgroundColor = greenBooked;
    } else if (isCheckOut) {
      // Check-out: green→cream fade (leaving)
      gradient = const LinearGradient(
        colors: [greenBooked, cream],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );
      backgroundColor = greenBooked;
    } else if (isBetween) {
      backgroundColor = greenBooked;
    } else if (isFull) {
      backgroundColor = redFull;
    } else if (isPast) {
      backgroundColor = Colors.grey[100]!;
    } else {
      backgroundColor = cream;
    }

    // Border
    Border border;
    if (isCheckIn || isCheckOut) {
      border = Border.all(color: Colors.green, width: 2);
    } else if (isToday && !isInRange) {
      border = Border.all(color: Colors.blue, width: 2);
    } else if (isFull && !isPast) {
      border = Border.all(color: Colors.red[300]!, width: 1);
    } else {
      border = Border.all(color: Colors.grey[300]!, width: 1);
    }

    // Label text
    String? label;
    Color labelColor = Colors.black;
    if (isPast) {
      label = 'Past';
    } else if (isUserBooked && isUserCheckout) {
      label = 'Leaving';
    } else if (isUserBooked) {
      label = 'Booked';
    } else if (isCheckIn) {
      label = 'Check in';
    } else if (isCheckOut) {
      label = 'Check out';
    } else if (isFull) {
      label = 'Full';
    }

    return GestureDetector(
      onTap: canSelect ? () => _onDateTapped(dateOnly) : null,
      child: Container(
        decoration: BoxDecoration(
          border: border,
          borderRadius: BorderRadius.circular(6),
          gradient: gradient,
          color: gradient == null ? backgroundColor : null,
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  date.day.toString(),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 2),
                if (label != null)
                  Text(label, style: TextStyle(fontSize: 10, color: labelColor))
                else if (!isBetween)
                  Column(
                    children: [
                      Text(
                        '$available',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black),
                      ),
                      const Text('spaces', style: TextStyle(fontSize: 10, color: Colors.black)),
                    ],
                  )
                else
                  const SizedBox(height: 14), // placeholder height for between-dates
              ],
            ),
          ),
        ),
      ),
    );
  }
}
