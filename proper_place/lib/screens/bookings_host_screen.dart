import 'package:flutter/material.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../services/chat_service.dart';
import '../services/storage_service.dart';
import '../services/notification_service.dart';
import 'login_screen.dart';

class BookingsHostScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const BookingsHostScreen({super.key, this.onRefresh});

  @override
  State<BookingsHostScreen> createState() => _BookingsHostScreenState();
}

class _BookingsHostScreenState extends State<BookingsHostScreen> {
  late DateTime _selectedDate;
  late DateTime _focusedDate;
  String _selectedFilter = 'Confirmed';
  bool _isLoading = true;
  String? _error;
  bool _sessionExpired = false;

  final List<String> _filters = [
    'Confirmed',
    'Pending',
    'Completed',
    'All'
  ];

  // Real bookings data - loaded from API
  Map<DateTime, List<Map<String, dynamic>>> _bookingsByDate = {};
  Map<int, int> _unreadByBooking = {};
  Timer? _unreadPollingTimer;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
    _focusedDate = DateTime.now();
    _loadHostBookings();
    _loadUnreadCounts();
    _markBookingsAsSeen();
    _unreadPollingTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _loadUnreadCounts();
    });
  }

  Future<void> _markBookingsAsSeen() async {
    try {
      await ApiService.markHostBookingsSeen();
      widget.onRefresh?.call();
    } catch (_) {}
  }

  @override
  void dispose() {
    _unreadPollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadUnreadCounts() async {
    try {
      final counts = await NotificationService().getUnreadByBooking();
      if (mounted) {
        setState(() {
          _unreadByBooking = counts;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadHostBookings() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Fetch all bookings for host's places in one call
      final bookings = await ApiService.getHostBookings();

      Map<DateTime, List<Map<String, dynamic>>> bookingsByDate = {};

      for (var booking in bookings) {
        final checkInStr = (booking['check_in_date'] ?? booking['check_in'] ?? '').toString();
        final checkOutStr = (booking['check_out_date'] ?? booking['check_out'] ?? '').toString();

        if (checkInStr.isEmpty) continue;

        DateTime checkInDate;
        DateTime checkOutDate;
        try {
          checkInDate = DateTime.parse(checkInStr);
          checkOutDate = checkOutStr.isNotEmpty
              ? DateTime.parse(checkOutStr)
              : checkInDate;
        } catch (e) {
          continue;
        }

        final dateKey = DateTime(checkInDate.year, checkInDate.month, checkInDate.day);

        final bookingRecord = {
          'id': booking['id'] ?? '',
          'guestId': booking['user_id'],
          'guestName': booking['guest_name'] ?? 'Guest',
          'placeName': booking['place_name'] ?? 'Unknown Place',
          'checkIn': checkInDate,
          'checkOut': checkOutDate,
          'status': _normalizeBookingStatus(booking['status'] ?? 'pending'),
          'amount': _formatPrice(booking['total_price'] ?? 0),
          'guestEmail': booking['guest_email'] ?? '',
          'guestPhone': booking['contact_phone'] ?? '',
        };

        if (bookingsByDate[dateKey] == null) {
          bookingsByDate[dateKey] = [];
        }
        bookingsByDate[dateKey]!.add(bookingRecord);
      }

      setState(() {
        _bookingsByDate = bookingsByDate;
        _isLoading = false;
      });
    } catch (e) {
      final errorMessage = e.toString();
      setState(() {
        _isLoading = false;
        // Check if it's a session expiry
        if (errorMessage.contains('Session expired') || 
            errorMessage.contains('401') ||
            errorMessage.contains('authentication')) {
          _error = 'Session expired. Please log in again.';
          _sessionExpired = true;
        } else {
          _error = 'Error loading bookings: $e';
        }
      });
    }
  }

  String _normalizeBookingStatus(String status) {
    final lower = status.toLowerCase();
    if (lower.contains('confirm') || lower.contains('approved')) {
      return 'Confirmed';
    }
    if (lower.contains('pend')) {
      return 'Pending';
    }
    if (lower.contains('complet') || lower.contains('finished')) {
      return 'Completed';
    }
    if (lower.contains('cancel')) {
      return 'Cancelled';
    }
    return 'Pending';
  }

  String _formatPrice(dynamic price) {
    try {
      if (price is String) {
        return price.contains('£') ? price : '£${price}';
      }
      return '£${(price as num?)?.toStringAsFixed(2) ?? '0.00'}';
    } catch (e) {
      return '£0.00';
    }
  }

  List<Map<String, dynamic>> get _bookingsForSelectedDate {
    final allBookings = <Map<String, dynamic>>[];
    final now = DateTime.now();
    
    print('\n📅 _bookingsForSelectedDate called at: $now');
    
    for (var dateBookings in _bookingsByDate.values) {
      for (var booking in dateBookings) {
        // Auto-complete bookings past checkout date at midday
        final bookingCopy = Map<String, dynamic>.from(booking);
        final checkOut = bookingCopy['checkOut'] as DateTime;
        final checkOutAtNoon = DateTime(checkOut.year, checkOut.month, checkOut.day, 12, 0);
        final bookingId = bookingCopy['id'] ?? 'unknown';
        final currentStatus = bookingCopy['status'] as String;
        
        print('  Booking $bookingId: CheckOut=$checkOut, CheckOutAtNoon=$checkOutAtNoon, CurrentStatus=$currentStatus');
        
        if (now.isAfter(checkOutAtNoon) && bookingCopy['status'] != 'Cancelled') {
          print('    → Auto-completing (now is after checkout noon)');
          bookingCopy['status'] = 'Completed';
        }
        
        allBookings.add(bookingCopy);
      }
    }

    if (_selectedFilter == 'All') {
      return allBookings;
    }

    return allBookings.where((b) => b['status'] == _selectedFilter).toList();
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
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _sessionExpired ? Icons.lock_outline : Icons.error,
                        size: 64,
                        color: _sessionExpired ? const Color(0xFF6B96C8) : Colors.red,
                      ),
                      const SizedBox(height: 16),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_sessionExpired)
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                              (route) => false,
                            );
                          },
                          icon: const Icon(Icons.login),
                          label: const Text('Log In'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF6B96C8),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                          ),
                        )
                      else
                        ElevatedButton(
                          onPressed: _loadHostBookings,
                          child: const Text('Retry'),
                        ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadHostBookings,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
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
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFF64748B),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                backgroundColor: isSelected
                                    ? const Color(0xFF4F46E5)
                                    : Colors.grey[100],
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
                              'No bookings',
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

          // Amount and unread badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                booking['amount'],
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if ((_unreadByBooking[_bookingIdInt(booking)] ?? 0) > 0)
                GestureDetector(
                  onTap: () => _openChatPopup(booking),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.chat_bubble, size: 10, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          '${_unreadByBooking[_bookingIdInt(booking)]} new message${_unreadByBooking[_bookingIdInt(booking)]! > 1 ? 's' : ''}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
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
              if (_canCancelBooking(booking))
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
                _openChatPopup(booking);
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

  bool _canCancelBooking(Map<String, dynamic> booking) {
    final status = booking['status'] as String;
    final bookingId = booking['id'] ?? 'unknown';
    final checkIn = booking['checkIn'] as DateTime?;
    final checkOut = booking['checkOut'] as DateTime?;
    
    print('🔍 _canCancelBooking - ID: $bookingId, Status: $status, CheckIn: $checkIn, CheckOut: $checkOut');
    
    // Never allow cancel if Completed
    if (status == 'Completed') {
      print('  ✗ Status is Completed - hiding button');
      return false;
    }
    
    // For Confirmed bookings, check if within 24 hours of check-in
    if (status == 'Confirmed') {
      final checkInDate = booking['checkIn'] as DateTime;
      final now = DateTime.now();
      final hoursUntilCheckIn = checkInDate.difference(now).inHours;
      
      print('  Confirmed booking - hours until check-in: $hoursUntilCheckIn');
      
      // Hide cancel if check-in is within the next 24 hours
      if (hoursUntilCheckIn <= 24 && hoursUntilCheckIn >= 0) {
        print('  ✗ Within 24 hours of check-in - hiding button');
        return false;
      }
    }
    
    print('  ✓ Showing cancel button');
    return true;
  }

  void _openChatPopup(Map<String, dynamic> booking) {
    final guestId = booking['guestId'];
    final guestName = booking['guestName'] ?? 'Guest';
    final placeName = booking['placeName'] ?? '';
    final bookingId = booking['id'];

    if (guestId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open chat — guest info missing')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => _ChatPopupDialog(
        guestId: guestId is int ? guestId : int.parse(guestId.toString()),
        guestName: guestName,
        placeName: placeName,
        bookingId: bookingId is int ? bookingId : int.tryParse(bookingId.toString()),
      ),
    ).then((_) => _loadUnreadCounts());
  }

  int _bookingIdInt(Map<String, dynamic> booking) {
    final id = booking['id'];
    if (id is int) return id;
    return int.tryParse(id.toString()) ?? 0;
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
              // Refresh notification counts after cancellation
              widget.onRefresh?.call();
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

class _ChatPopupDialog extends StatefulWidget {
  final int guestId;
  final String guestName;
  final String placeName;
  final int? bookingId;

  const _ChatPopupDialog({
    required this.guestId,
    required this.guestName,
    required this.placeName,
    this.bookingId,
  });

  @override
  State<_ChatPopupDialog> createState() => _ChatPopupDialogState();
}

class _ChatPopupDialogState extends State<_ChatPopupDialog> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  int? _currentUserId;
  Timer? _messagePollingTimer;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _messagePollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _init() async {
    final userId = await StorageService.getUserId();
    _currentUserId = userId != null ? int.tryParse(userId) : null;
    await _fetchMessages();
    // Start polling for new messages and status updates every 3 seconds
    _messagePollingTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (!mounted) {
        _messagePollingTimer?.cancel();
        return;
      }
      try {
        if (widget.bookingId != null) {
          await ChatService().markBookingAsRead(widget.bookingId!);
        } else {
          await ChatService().markConversationAsRead(widget.guestId);
        }
        final messages = await ChatService().getMessagesWithUser(widget.guestId);
        if (mounted) {
          final oldCount = _messages.length;
          setState(() {
            _messages = messages;
          });
          if (messages.length > oldCount) _scrollToBottom();
        }
      } catch (_) {}
    });
  }

  Future<void> _fetchMessages() async {
    try {
      if (widget.bookingId != null) {
        await ChatService().markBookingAsRead(widget.bookingId!);
      } else {
        await ChatService().markConversationAsRead(widget.guestId);
      }
      final messages = await ChatService().getMessagesWithUser(widget.guestId);
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty || _isSending) return;

    _messageController.clear();
    setState(() => _isSending = true);

    try {
      final sentMessage = await ChatService().sendMessage(
        receiverId: widget.guestId,
        content: content,
        bookingId: widget.bookingId,
      );
      if (mounted) {
        setState(() {
          _messages.add(sentMessage);
          _isSending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e')),
        );
      }
    }
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return '';
    try {
      final date = DateTime.parse(timestamp.toString()).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 1) return 'now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  String _getMessageStatus(Map<String, dynamic> msg, bool isMine) {
    if (!isMine) return '';
    final read = msg['read'] == true;
    final delivered = msg['delivered'] == true;
    if (read) return 'read';
    if (delivered) return 'delivered';
    return 'sent';
  }

  Widget _buildReadReceipt(String status) {
    switch (status) {
      case 'sent':
        return Icon(Icons.done, size: 12, color: Colors.grey[500]);
      case 'delivered':
        return Icon(Icons.done_all, size: 12, color: Colors.grey[500]);
      case 'read':
        return const Icon(Icons.done_all, size: 12, color: Colors.blue);
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.7,
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: Color(0xFF7BA7D8),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Center(
                        child: Text(
                          _getInitials(widget.guestName),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.guestName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (widget.placeName.isNotEmpty)
                            Text(
                              widget.placeName,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const Icon(Icons.close, color: Colors.white, size: 22),
                    ),
                  ],
                ),
              ),
              // Messages
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _messages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.chat_bubble_outline, size: 40, color: Colors.grey[300]),
                                const SizedBox(height: 8),
                                Text(
                                  'No messages yet',
                                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Send a message to start the conversation',
                                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(12),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final message = _messages[i];
                              final isMe = message['sender_id'] == _currentUserId;
                              return Column(
                                crossAxisAlignment: isMe
                                    ? CrossAxisAlignment.end
                                    : CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    constraints: BoxConstraints(
                                      maxWidth: MediaQuery.of(context).size.width * 0.6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isMe
                                          ? const Color(0xFF7BA7D8)
                                          : const Color(0xFFF3F4F6),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      message['content'] ?? '',
                                      style: TextStyle(
                                        color: isMe ? Colors.white : Colors.black,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                                    children: [
                                      if (isMe) ...[
                                        _buildReadReceipt(_getMessageStatus(message, isMe)),
                                        const SizedBox(width: 4),
                                      ],
                                      Text(
                                        _formatTimestamp(message['created_at']),
                                        style: const TextStyle(
                                          color: Color(0xFF9CA3AF),
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                ],
                              );
                            },
                          ),
              ),
              // Input
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Colors.grey[200]!)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        textInputAction: TextInputAction.send,
                        decoration: InputDecoration(
                          hintText: 'Type a message...',
                          hintStyle: TextStyle(color: Colors.grey[500]),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          isDense: true,
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _sendMessage,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _isSending
                              ? Colors.grey[300]
                              : const Color(0xFF7BA7D8),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: _isSending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send, size: 18, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
