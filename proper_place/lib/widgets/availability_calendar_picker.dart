import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:proper_place/config/app_config.dart';

/// Clean, minimal calendar picker showing available spaces per date
class AvailabilityCalendarPicker extends StatefulWidget {
  final int placeId;
  final DateTime initialDate;
  final Function(DateTime) onDateSelected;
  final bool isCheckIn;
  final DateTime? minDate; // Minimum selectable date (e.g., day after check-in for checkout)
  final DateTime? checkInDate; // For highlighting the check-in date
  final DateTime? checkOutDate; // For highlighting the check-out date

  const AvailabilityCalendarPicker({
    super.key,
    required this.placeId,
    required this.initialDate,
    required this.onDateSelected,
    required this.isCheckIn,
    this.minDate,
    this.checkInDate,
    this.checkOutDate,
  });

  @override
  State<AvailabilityCalendarPicker> createState() => _AvailabilityCalendarPickerState();
}

class _AvailabilityCalendarPickerState extends State<AvailabilityCalendarPicker> {
  late DateTime currentMonth;
  Map<String, dynamic> availability = {};
  bool isLoading = true;
  int? capacity;

  @override
  void initState() {
    super.initState();
    currentMonth = DateTime(widget.initialDate.year, widget.initialDate.month, 1);
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    try {
      final fromDate = DateTime(currentMonth.year, currentMonth.month, 1);
      final toDate = DateTime(currentMonth.year, currentMonth.month + 3, 1).add(const Duration(days: -1));

      final response = await http.get(
        Uri.parse(
          '${AppConfig.properPlaceBackendUrl}/bookings/availability/place/${widget.placeId}'
          '?from_date=${fromDate.toIso8601String().split('T')[0]}'
          '&to_date=${toDate.toIso8601String().split('T')[0]}',
        ),
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

  @override
  Widget build(BuildContext context) {
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
                Text(
                  DateFormat('MMMM yyyy').format(currentMonth),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                    // Calendar grid
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
        ],
      ),
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(currentMonth.year, currentMonth.month, 1);
    final lastDay = DateTime(currentMonth.year, currentMonth.month + 1, 0);
    final daysInMonth = lastDay.day;
    final firstWeekday = firstDay.weekday;

    final cells = <Widget>[];

    // Empty cells before first day
    for (int i = 0; i < firstWeekday - 1; i++) {
      cells.add(const SizedBox());
    }

    // Days of month
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
    final isPast = date.isBefore(DateTime.now().subtract(const Duration(days: 1)));
    // Normalize minDate comparison to ignore time components
    final minDateOnly = widget.minDate != null 
        ? DateTime(widget.minDate!.year, widget.minDate!.month, widget.minDate!.day)
        : null;
    final dateOnly = DateTime(date.year, date.month, date.day);
    final isBeforeMin = minDateOnly != null && dateOnly.isBefore(minDateOnly);
    final available = availData?['available'] ?? capacity ?? 1;
    final isFull = availData?['isFull'] ?? false;
    final isToday = date.day == DateTime.now().day &&
        date.month == DateTime.now().month &&
        date.year == DateTime.now().year;

    // Check if this date is check-in or check-out
    final isCheckInDate = widget.checkInDate != null && 
        DateTime(widget.checkInDate!.year, widget.checkInDate!.month, widget.checkInDate!.day) == dateOnly;
    final isCheckOutDate = widget.checkOutDate != null && 
        DateTime(widget.checkOutDate!.year, widget.checkOutDate!.month, widget.checkOutDate!.day) == dateOnly;
    
    // Check if date is between check-in and check-out (but not the dates themselves)
    final isBetween = widget.checkInDate != null && widget.checkOutDate != null &&
        dateOnly.isAfter(DateTime(widget.checkInDate!.year, widget.checkInDate!.month, widget.checkInDate!.day)) &&
        dateOnly.isBefore(DateTime(widget.checkOutDate!.year, widget.checkOutDate!.month, widget.checkOutDate!.day));

    final canSelect = !isPast && !isBeforeMin && !isFull;

    // Determine background color
    Color backgroundColor;
    if (isCheckInDate || isCheckOutDate) {
      // Light blue for both check-in and check-out dates
      backgroundColor = const Color(0xFFB3E5FC); // Light blue
    } else if (isBetween) {
      // Very light blue for dates between check-in and check-out
      backgroundColor = const Color(0xFFE1F5FE); // Very light blue
    } else if (isPast || isBeforeMin || isFull) {
      backgroundColor = Colors.grey[100]!;
    } else {
      backgroundColor = Colors.white;
    }

    return GestureDetector(
      onTap: canSelect
          ? () {
              widget.onDateSelected(date);
              if (widget.isCheckIn) {
                Navigator.pop(context);
              } else {
                Future.delayed(const Duration(seconds: 3), () {
                  if (context.mounted) Navigator.pop(context);
                });
              }
            }
          : null,
      child: Container(
        decoration: BoxDecoration(
          border: (isToday && !isCheckInDate && !isCheckOutDate)
              ? Border.all(color: Colors.blue, width: 2)
              : Border.all(color: Colors.grey[300]!, width: 1),
          borderRadius: BorderRadius.circular(6),
          color: backgroundColor,
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Day number
                Text(
                  date.day.toString(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: (isPast || (isBeforeMin && !isCheckInDate) || isFull) ? Colors.grey[400] : Colors.black,
                  ),
                ),
                const SizedBox(height: 2),
                // Availability status
                if (isPast)
                  Text(
                    'Past',
                    style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                  )
                else if (isBeforeMin && !isCheckInDate)
                  Text(
                    'Check in',
                    style: TextStyle(fontSize: 10, color: Colors.grey[400]),
                  )
                else if (isFull)
                  Text(
                    'Full',
                    style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                  )
                else
                  Column(
                    children: [
                      Text(
                        '$available',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        'spaces',
                        style: const TextStyle(fontSize: 10, color: Colors.black),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
