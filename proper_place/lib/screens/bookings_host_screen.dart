import 'package:flutter/material.dart';

class BookingsHostScreen extends StatefulWidget {
  const BookingsHostScreen({super.key});

  @override
  State<BookingsHostScreen> createState() => _BookingsHostScreenState();
}

class _BookingsHostScreenState extends State<BookingsHostScreen> {
  late DateTime _selectedDate;
  late DateTime _focusedDate;
  String _selectedFilter = 'All';

  final List<String> _filters = [
    'All',
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled'
  ];

  // Sample bookings data
  final Map<DateTime, List<Map<String, dynamic>>> _bookingsByDate = {
    DateTime(2026, 1, 18): [
      {
        'id': 1,
        'guestName': 'John Smith',
        'placeName': 'Avalon',
        'checkIn': DateTime(2026, 1, 18),
        'checkOut': DateTime(2026, 1, 21),
        'status': 'Confirmed',
        'amount': '£450.00',
        'guestEmail': 'john@example.com',
        'guestPhone': '+44 123 456 7890',
      },
    ],
    DateTime(2026, 1, 19): [
      {
        'id': 1,
        'guestName': 'John Smith',
        'placeName': 'Avalon',
        'checkIn': DateTime(2026, 1, 18),
        'checkOut': DateTime(2026, 1, 21),
        'status': 'Confirmed',
        'amount': '£450.00',
        'guestEmail': 'john@example.com',
        'guestPhone': '+44 123 456 7890',
      },
      {
        'id': 2,
        'guestName': 'Sarah Johnson',
        'placeName': 'Coastal Haven',
        'checkIn': DateTime(2026, 1, 19),
        'checkOut': DateTime(2026, 1, 22),
        'status': 'Pending',
        'amount': '£520.00',
        'guestEmail': 'sarah@example.com',
        'guestPhone': '+44 987 654 3210',
      },
    ],
    DateTime(2026, 1, 20): [
      {
        'id': 1,
        'guestName': 'John Smith',
        'placeName': 'Avalon',
        'checkIn': DateTime(2026, 1, 18),
        'checkOut': DateTime(2026, 1, 21),
        'status': 'Confirmed',
        'amount': '£450.00',
        'guestEmail': 'john@example.com',
        'guestPhone': '+44 123 456 7890',
      },
      {
        'id': 2,
        'guestName': 'Sarah Johnson',
        'placeName': 'Coastal Haven',
        'checkIn': DateTime(2026, 1, 19),
        'checkOut': DateTime(2026, 1, 22),
        'status': 'Pending',
        'amount': '£520.00',
        'guestEmail': 'sarah@example.com',
        'guestPhone': '+44 987 654 3210',
      },
    ],
  };

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime(2026, 1, 23);
    _focusedDate = DateTime(2026, 1, 23);
  }

  List<Map<String, dynamic>> get _bookingsForSelectedDate {
    final bookings = _bookingsByDate[DateTime(
            _selectedDate.year, _selectedDate.month, _selectedDate.day)] ??
        [];

    if (_selectedFilter == 'All') {
      return bookings;
    }

    return bookings.where((b) => b['status'] == _selectedFilter).toList();
  }

  bool _hasBooking(DateTime day) {
    final dateKey = DateTime(day.year, day.month, day.day);
    return _bookingsByDate.containsKey(dateKey) &&
        _bookingsByDate[dateKey]!.isNotEmpty;
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'Confirmed':
        return const Color(0xFF10B981);
      case 'Pending':
        return const Color(0xFFF59E0B);
      case 'Completed':
        return const Color(0xFF6366F1);
      case 'Cancelled':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 48,
        leading: const SizedBox.shrink(),
        title: RichText(
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'Proper Place ',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              TextSpan(
                text: 'Host',
                style: TextStyle(
                  color: Color(0xFF7BA7D8),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Calendar header with icon
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFE0E7FF),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
            child: const Row(
              children: [
                Icon(Icons.event, color: Color(0xFF3B82F6), size: 24),
                SizedBox(width: 12),
                Text(
                  'Select Date',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Calendar
          _buildCalendar(),
          const SizedBox(height: 24),

          // Selected date info
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFE0E7FF),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Selected:',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _formatDate(_selectedDate),
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: const Color(0xFFBFDBFE),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Dates with bookings',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Filter tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(
                      filter,
                      style: TextStyle(
                        color:
                            isSelected ? Colors.white : const Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    backgroundColor: isSelected
                        ? const Color(0xFF4F46E5)
                        : Colors.transparent,
                    side: BorderSide(
                      color: isSelected
                          ? Colors.transparent
                          : const Color(0xFFE2E8F0),
                    ),
                    onSelected: (selected) {
                      setState(() {
                        _selectedFilter = filter;
                      });
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),

          // Bookings list
          if (_bookingsForSelectedDate.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text(
                  'No bookings for this date',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 14,
                  ),
                ),
              ),
            )
          else
            ..._bookingsForSelectedDate
                .map((booking) => _buildBookingCard(booking)),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCalendar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Month header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () {
                  setState(() {
                    _focusedDate =
                        DateTime(_focusedDate.year, _focusedDate.month - 1);
                  });
                },
              ),
              Text(
                '${_monthName(_focusedDate.month)} ${_focusedDate.year}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {
                  setState(() {
                    _focusedDate =
                        DateTime(_focusedDate.year, _focusedDate.month + 1);
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Weekday labels
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                .map((day) => SizedBox(
                      width: 40,
                      child: Center(
                        child: Text(
                          day,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),

          // Calendar days
          ..._buildCalendarDays(),
        ],
      ),
    );
  }

  List<Widget> _buildCalendarDays() {
    final firstDay = DateTime(_focusedDate.year, _focusedDate.month, 1);
    final lastDay = DateTime(_focusedDate.year, _focusedDate.month + 1, 0);
    final daysInMonth = lastDay.day;
    final firstWeekday = firstDay.weekday % 7; // 0 = Sunday

    final weeks = <List<DateTime>>[];
    List<DateTime> currentWeek = [];

    // Add empty days for the first week
    for (int i = 0; i < firstWeekday; i++) {
      currentWeek.add(DateTime(
          _focusedDate.year, _focusedDate.month, 1 - (firstWeekday - i)));
    }

    // Add all days of the month
    for (int day = 1; day <= daysInMonth; day++) {
      currentWeek.add(DateTime(_focusedDate.year, _focusedDate.month, day));
      if (currentWeek.length == 7) {
        weeks.add(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining days to complete the last week
    if (currentWeek.isNotEmpty) {
      while (currentWeek.length < 7) {
        currentWeek.add(DateTime(
            _focusedDate.year, _focusedDate.month + 1, currentWeek.length - 6));
      }
      weeks.add(currentWeek);
    }

    return weeks
        .map((week) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: week.map((day) => _buildDayCell(day)).toList(),
              ),
            ))
        .toList();
  }

  Widget _buildDayCell(DateTime day) {
    final isCurrentMonth = day.month == _focusedDate.month;
    final isSelected = day.year == _selectedDate.year &&
        day.month == _selectedDate.month &&
        day.day == _selectedDate.day;
    final hasBooking = _hasBooking(day) && isCurrentMonth;

    return GestureDetector(
      onTap: isCurrentMonth
          ? () {
              setState(() {
                _selectedDate = day;
              });
            }
          : null,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF3B82F6)
              : hasBooking
                  ? const Color(0xFFBFDBFE)
                  : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Center(
          child: Text(
            day.day.toString(),
            style: TextStyle(
              color: isSelected
                  ? Colors.white
                  : isCurrentMonth
                      ? Colors.black
                      : const Color(0xFFCBD5E1),
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final statusColor = _getStatusColor(booking['status']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Guest name and status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                booking['guestName'],
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                child: Text(
                  booking['status'],
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Place name
          Text(
            booking['placeName'],
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),

          // Dates
          Row(
            children: [
              const Icon(Icons.event,
                  size: 14, color: Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Text(
                '${_formatDate(booking['checkIn'])} to ${_formatDate(booking['checkOut'])}',
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Amount
          Text(
            booking['amount'],
            style: const TextStyle(
              color: Colors.black,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    _showContactOptions(booking);
                  },
                  icon: const Icon(Icons.mail_outline, size: 16),
                  label: const Text('Contact'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF3B82F6),
                    side: const BorderSide(color: Color(0xFF3B82F6)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _showCancelBookingDialog(booking);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFEF4444)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Cancel Booking'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showContactOptions(Map<String, dynamic> booking) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Contact ${booking['guestName']}',
              style: const TextStyle(
                color: Colors.black,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                      content:
                          Text('Opening chat with ${booking['guestName']}')),
                );
              },
              icon: const Icon(Icons.chat_bubble_outline),
              label: const Text('Send Message'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Calling ${booking['guestPhone']}')),
                );
              },
              icon: const Icon(Icons.phone_outlined),
              label: Text('Call: ${booking['guestPhone']}'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF10B981),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Emailing ${booking['guestEmail']}')),
                );
              },
              icon: const Icon(Icons.email_outlined),
              label: Text('Email: ${booking['guestEmail']}'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF6366F1),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelBookingDialog(Map<String, dynamic> booking) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: Text(
          'Are you sure you want to cancel the booking from ${booking['guestName']} for ${booking['placeName']}?\n\nThis action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep Booking'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Booking cancelled'),
                  backgroundColor: Color(0xFFEF4444),
                ),
              );
            },
            child: const Text('Cancel Booking',
                style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
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

  String _formatDate(DateTime date) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    return '${weekdays[date.weekday % 7]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}
