import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/notification_service.dart';
import 'package:proper_place/screens/booking_detail_screen.dart';
import 'package:proper_place/screens/review_submission_screen.dart';
import 'package:proper_place/screens/chat_screen.dart';
import 'package:proper_place/models/place.dart';

class MyBookingsScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const MyBookingsScreen({Key? key, this.onRefresh}) : super(key: key);

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  late Future<List<dynamic>> bookingsFuture;
  String guestId = 'temp-guest-id';
  String selectedTab = 'all';
  Map<int, int> _unreadByBooking = {};
  Timer? _unreadPollingTimer;
  final TextEditingController _searchController = TextEditingController();
  bool _showCalendarView = false;
  late DateTime _calendarMonth;
  DateTime? _selectedCalendarDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _calendarMonth = DateTime(now.year, now.month);
    // Check if there's a saved booking tab target (from payment confirmation)
    _loadBookingTabPreference();
    // Initialize with temp ID first, then load real one
    bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
    _loadRealUserIdAndRefresh();
    _loadUnreadCounts();
    // Poll for new unread messages every 2 seconds
    _unreadPollingTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _loadUnreadCounts();
    });
  }

  @override
  void dispose() {
    _unreadPollingTimer?.cancel();
    _searchController.dispose();
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

  Future<void> _loadBookingTabPreference() async {
    final tabTarget = await StorageService.getString('booking_tab_target');
    if (tabTarget != null && tabTarget.isNotEmpty) {
      setState(() {
        selectedTab = tabTarget;
      });
      // Clear the preference after using it
      await StorageService.removeString('booking_tab_target');
    }
  }

  Future<void> _loadRealUserIdAndRefresh() async {
    try {
      final userId = await StorageService.getUserId();
      debugPrint('DEBUG: userId from storage = $userId');
      if (userId != null && userId.isNotEmpty && mounted) {
        debugPrint('DEBUG: Setting guestId to $userId');
        setState(() {
          guestId = userId;
          bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
        });
      } else {
        debugPrint('DEBUG: userId is null or empty, keeping temp-guest-id');
      }
    } catch (e) {
      debugPrint('Error loading user ID: $e');
    }
  }

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
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return months[month - 1];
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return Colors.green;
      case 'current':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  bool _isUpcoming(String? checkOutDate) {
    if (checkOutDate == null || checkOutDate.isEmpty) {
      return false;
    }
    try {
      final date = DateTime.parse(checkOutDate);
      return date.isAfter(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  bool _isCurrent(String? checkInDate, String? checkOutDate, String? checkInTime, String? checkOutTime) {
    if (checkInDate == null || checkOutDate == null) return false;
    try {
      final now = DateTime.now();
      final inParts = (checkInTime ?? '12:00').split(':');
      final outParts = (checkOutTime ?? '12:00').split(':');
      final checkIn = DateTime.parse(checkInDate).add(Duration(
        hours: int.tryParse(inParts[0]) ?? 12,
        minutes: inParts.length > 1 ? (int.tryParse(inParts[1]) ?? 0) : 0,
      ));
      final checkOut = DateTime.parse(checkOutDate).add(Duration(
        hours: int.tryParse(outParts[0]) ?? 12,
        minutes: outParts.length > 1 ? (int.tryParse(outParts[1]) ?? 0) : 0,
      ));
      return !now.isBefore(checkIn) && now.isBefore(checkOut);
    } catch (e) {
      return false;
    }
  }

  String _displayStatus(Map<String, dynamic> booking) {
    final status = (booking['status'] ?? 'unknown').toString().toLowerCase();
    if (status == 'confirmed' && _isCurrent(booking['check_in'], booking['check_out'], booking['check_in_time'], booking['check_out_time'])) {
      return 'current';
    }
    return status;
  }

  // Check if stay has ended (checkout date is in the past)
  bool _isStayEnded(String? checkOutDate) {
    if (checkOutDate == null || checkOutDate.isEmpty) return false;
    try {
      final checkOut = DateTime.parse(checkOutDate);
      return checkOut.isBefore(DateTime.now());
    } catch (e) {
      return false;
    }
  }

  // Navigate to review screen
  void _openReviewScreen(Map<String, dynamic> booking) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ReviewSubmissionScreen(booking: booking),
      ),
    );
    
    // Refresh bookings if review was submitted
    if (result == true && mounted) {
      setState(() {
        bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
      });
    }
  }

  void _cancelBooking(String bookingId, String bookingIdDisplay) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Cancel Booking?'),
          content: const Text('Are you sure you want to cancel this booking? This action cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Keep Booking'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                _performCancellation(bookingId, bookingIdDisplay);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Cancel Booking', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _performCancellation(String bookingId, String bookingIdDisplay) async {
    try {
      await ApiService.cancelBooking(bookingId: bookingId);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking $bookingIdDisplay cancelled successfully'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
        
        // Refresh the bookings list after cancellation
        setState(() {
          bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
        });
        
        // Refresh notification counts
        widget.onRefresh?.call();
        
        // Wait a brief moment for the UI to update, then ensure cancelled bookings are not shown
        await Future.delayed(const Duration(milliseconds: 500));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to cancel booking: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const SizedBox.shrink(),
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        title: const Text(
          'My Bookings',
          style: TextStyle(
            color: Color(0xFF1A1A2E),
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          IconButton(
            icon: Icon(
              _showCalendarView ? Icons.list : Icons.calendar_month,
              color: const Color(0xFF1A1A2E),
            ),
            tooltip: _showCalendarView ? 'List view' : 'Calendar view',
            onPressed: () => setState(() => _showCalendarView = !_showCalendarView),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: const Color(0xFFE8E8E8),
            height: 1,
          ),
        ),
      ),
      body: FutureBuilder<List<dynamic>>(
        future: bookingsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
                      });
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.calendar_today, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No bookings yet',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Start by booking a place from the map',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          final bookings = snapshot.data ?? [];
          final filteredBookings = selectedTab == 'all'
              ? List<dynamic>.from(bookings)
              : selectedTab == 'current'
                ? bookings.where((b) => _displayStatus(b) == 'current').toList()
                : selectedTab == 'confirmed'
                  ? bookings.where((b) {
                      final s = (b['status'] ?? 'confirmed').toLowerCase();
                      return s == 'confirmed' && !_isCurrent(b['check_in'], b['check_out'], b['check_in_time'], b['check_out_time']);
                    }).toList()
                  : bookings
                      .where((b) => (b['status'] ?? 'confirmed').toLowerCase() == selectedTab)
                      .toList();
          // Apply search filter
          final query = _searchController.text.toLowerCase();
          final searchedBookings = query.isEmpty
              ? filteredBookings
              : filteredBookings.where((b) {
                  final id = (b['booking_id'] ?? b['id'] ?? '').toString().toLowerCase();
                  final ref = (b['booking_ref'] ?? '').toString().toLowerCase();
                  final status = (b['status'] ?? '').toString().toLowerCase();
                  final checkIn = (b['check_in'] ?? '').toString().toLowerCase();
                  final checkOut = (b['check_out'] ?? '').toString().toLowerCase();
                  final price = (b['total_price'] ?? '').toString().toLowerCase();
                  final placeName = (b['place_name'] ?? b['name'] ?? '').toString().toLowerCase();
                  final formattedCheckIn = _formatDate(b['check_in']).toLowerCase();
                  final formattedCheckOut = _formatDate(b['check_out']).toLowerCase();
                  return id.contains(query) ||
                      ref.contains(query) ||
                      status.contains(query) ||
                      checkIn.contains(query) ||
                      checkOut.contains(query) ||
                      price.contains(query) ||
                      placeName.contains(query) ||
                      formattedCheckIn.contains(query) ||
                      formattedCheckOut.contains(query);
                }).toList();
          // Sort newest first by created_at
          searchedBookings.sort((a, b) {
            final aDate = DateTime.tryParse(a['created_at']?.toString() ?? '') ?? DateTime(2000);
            final bDate = DateTime.tryParse(b['created_at']?.toString() ?? '') ?? DateTime(2000);
            return bDate.compareTo(aDate);
          });

          if (_showCalendarView) {
            return _buildCalendarView(bookings);
          }

          return Column(
            children: [
              // Search + filter row
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 4, 0),
                child: Row(
                  children: [
                    if (selectedTab != 'all') ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1A1A2E),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${selectedTab[0].toUpperCase()}${selectedTab.substring(1)}',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(width: 6),
                            GestureDetector(
                              onTap: () => setState(() => selectedTab = 'all'),
                              child: const Icon(Icons.close, size: 16, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (value) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'Search bookings...',
                          hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
                          prefixIcon: Icon(Icons.search, color: Colors.grey[400], size: 20),
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide(color: Colors.grey[300]!),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide(color: Colors.grey[300]!),
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: Icon(
                        Icons.filter_list,
                        color: selectedTab == 'all' ? const Color(0xFF6B7280) : const Color(0xFF1A1A2E),
                      ),
                      onSelected: (value) => setState(() => selectedTab = value),
                      itemBuilder: (context) => [
                        _buildFilterMenuItem('All', 'all'),
                        _buildFilterMenuItem('Current', 'current'),
                        _buildFilterMenuItem('Confirmed', 'confirmed'),
                        _buildFilterMenuItem('Pending', 'pending'),
                        _buildFilterMenuItem('Completed', 'completed'),
                        _buildFilterMenuItem('Cancelled', 'cancelled'),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async {
                    setState(() {
                      bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
                    });
                    await bookingsFuture;
                    _loadUnreadCounts();
                  },
                  child: searchedBookings.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: searchedBookings.length,
                          itemBuilder: (context, index) {
                            return _buildBookingCard(searchedBookings[index]);
                          },
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  // ── Calendar view ──

  /// Build a map: normalised date → list of bookings that cover that date
  Map<DateTime, List<Map<String, dynamic>>> _buildDateBookingMap(List<dynamic> bookings) {
    final map = <DateTime, List<Map<String, dynamic>>>{};
    for (final b in bookings) {
      final status = (b['status'] ?? '').toString().toLowerCase();
      if (status == 'cancelled') continue; // skip cancelled
      final checkIn = DateTime.tryParse(b['check_in']?.toString() ?? '');
      final checkOut = DateTime.tryParse(b['check_out']?.toString() ?? '');
      if (checkIn == null || checkOut == null) continue;
      var d = DateTime(checkIn.year, checkIn.month, checkIn.day);
      final end = DateTime(checkOut.year, checkOut.month, checkOut.day);
      while (!d.isAfter(end)) {
        map.putIfAbsent(d, () => []).add(Map<String, dynamic>.from(b));
        d = d.add(const Duration(days: 1));
      }
    }
    return map;
  }

  Widget _buildCalendarView(List<dynamic> allBookings) {
    final dateMap = _buildDateBookingMap(allBookings);
    final year = _calendarMonth.year;
    final month = _calendarMonth.month;
    final firstOfMonth = DateTime(year, month, 1);
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final startWeekday = firstOfMonth.weekday; // 1=Mon .. 7=Sun
    final today = DateTime.now();
    final todayNorm = DateTime(today.year, today.month, today.day);
    final monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Bookings for selectedCalendarDate
    final selectedBookings = _selectedCalendarDate != null
        ? (dateMap[_selectedCalendarDate!] ?? [])
        : <Map<String, dynamic>>[];

    return Column(
      children: [
        // Month navigation
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left, color: Color(0xFF1A1A2E)),
                onPressed: () {
                  setState(() {
                    _calendarMonth = DateTime(year, month - 1);
                    _selectedCalendarDate = null;
                  });
                },
              ),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _calendarMonth = DateTime(today.year, today.month);
                    _selectedCalendarDate = null;
                  });
                },
                child: Text(
                  '${monthNames[month - 1]} $year',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1A1A2E),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: Color(0xFF1A1A2E)),
                onPressed: () {
                  setState(() {
                    _calendarMonth = DateTime(year, month + 1);
                    _selectedCalendarDate = null;
                  });
                },
              ),
            ],
          ),
        ),

        // Day-of-week headers
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                .map((d) => Expanded(
                      child: Center(
                        child: Text(d,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[500])),
                      ),
                    ))
                .toList(),
          ),
        ),
        const SizedBox(height: 4),

        // Day grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: _buildDayGrid(firstOfMonth, daysInMonth, startWeekday, dateMap, todayNorm),
        ),

        // Legend
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            children: [
              _legendDot(Colors.orange, 'Pending'),
              const SizedBox(width: 12),
              _legendDot(Colors.green, 'Confirmed'),
              const SizedBox(width: 12),
              _legendDot(Colors.blue, 'Current'),
              const SizedBox(width: 12),
              _legendDot(Colors.grey, 'Completed'),
            ],
          ),
        ),

        const Divider(height: 1),

        // Selected day bookings
        Expanded(
          child: selectedBookings.isEmpty
              ? Center(
                  child: Text(
                    _selectedCalendarDate != null
                        ? 'No bookings on ${_formatDate(_selectedCalendarDate!.toIso8601String())}'
                        : 'Tap a date to see bookings',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                  itemCount: selectedBookings.length,
                  itemBuilder: (context, i) => _buildBookingCard(selectedBookings[i]),
                ),
        ),
      ],
    );
  }

  Widget _buildDayGrid(
    DateTime firstOfMonth,
    int daysInMonth,
    int startWeekday,
    Map<DateTime, List<Map<String, dynamic>>> dateMap,
    DateTime todayNorm,
  ) {
    final cells = <Widget>[];
    // Empty cells before day 1
    for (var i = 1; i < startWeekday; i++) {
      cells.add(const SizedBox());
    }
    for (var day = 1; day <= daysInMonth; day++) {
      final date = DateTime(firstOfMonth.year, firstOfMonth.month, day);
      final bookingsOnDay = dateMap[date];
      final isToday = date == todayNorm;
      final isSelected = date == _selectedCalendarDate;

      // Determine the "most important" status colour for this day
      Color? dotColor;
      if (bookingsOnDay != null && bookingsOnDay.isNotEmpty) {
        // Priority: current > confirmed > pending > completed
        for (final b in bookingsOnDay) {
          final s = _displayStatus(b);
          if (s == 'current') { dotColor = Colors.blue; break; }
          if (s == 'confirmed' && dotColor != Colors.blue) dotColor = Colors.green;
          if (s == 'pending' && dotColor == null) dotColor = Colors.orange;
          if (s == 'completed' && dotColor == null) dotColor = Colors.grey;
        }
      }

      cells.add(
        GestureDetector(
          onTap: () {
            setState(() {
              _selectedCalendarDate = date;
            });
          },
          child: Container(
            margin: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFF1A1A2E)
                  : dotColor?.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: isToday && !isSelected
                  ? Border.all(color: const Color(0xFF1A1A2E), width: 1.5)
                  : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$day',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isToday || isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : isToday
                            ? const Color(0xFF1A1A2E)
                            : Colors.black87,
                  ),
                ),
                if (dotColor != null && !isSelected) ...[
                  const SizedBox(height: 2),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: dotColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
                if (dotColor != null && isSelected) ...[
                  const SizedBox(height: 2),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    // Wrap in a GridView
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.0,
      children: cells,
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      ],
    );
  }

  PopupMenuEntry<String> _buildFilterMenuItem(String label, String value) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          if (selectedTab == value)
            const Icon(Icons.check, size: 18, color: Color(0xFF1A1A2E))
          else
            const SizedBox(width: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontWeight: selectedTab == value ? FontWeight.w700 : FontWeight.w500,
              color: const Color(0xFF1A1A2E),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(50),
            ),
            child: Icon(
              Icons.calendar_today,
              color: Colors.grey[600],
              size: 64,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'No $selectedTab bookings',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You don\'t have any $selectedTab bookings yet',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> booking) {
    final bookingId = booking['booking_id'] ?? 'N/A';
    final bookingIdStr = bookingId.toString();
    final bookingRef = booking['booking_ref'];
    final bookingIdShort = bookingRef ?? (bookingIdStr.length >= 8 
        ? bookingIdStr.substring(0, 8).toUpperCase()
        : bookingIdStr.toUpperCase());
    final status = _displayStatus(booking);
    final checkIn = _formatDate(booking['check_in']);
    final checkOut = _formatDate(booking['check_out']);
    final totalPrice = booking['total_price'] ?? '0';
    final isUpcoming = _isUpcoming(booking['check_out']);
    final placeId = booking['place_id'] ?? '';
    final bookingIdInt = int.tryParse(bookingIdStr) ?? 0;
    final unreadCount = _unreadByBooking[bookingIdInt] ?? 0;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () {
          // Convert placeId to String if it's an int
          final placeIdStr = placeId is int ? placeId.toString() : placeId as String;
          debugPrint('DEBUG: Booking card tapped - place_id=$placeIdStr');
          _openBookingDetails(placeIdStr, booking);
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        bookingRef != null ? bookingRef : 'Booking #$bookingIdShort',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor(status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '£${double.tryParse(totalPrice.toString())?.toStringAsFixed(0) ?? totalPrice}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF7BA7D8),
                        ),
                      ),
                      if (unreadCount > 0) ...[
                        const SizedBox(height: 4),
                        GestureDetector(
                          onTap: () => _openChat(booking),
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
                                  '$unreadCount new message${unreadCount > 1 ? 's' : ''}',
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
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Check-in: $checkIn'),
                        Text('Check-out: $checkOut'),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Tap for details & directions',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
                  fontStyle: FontStyle.italic,
                ),
              ),
              if (status.toLowerCase() == 'confirmed' && isUpcoming) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: Text(
                    'Tap for more options',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue[600],
                      fontStyle: FontStyle.italic,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
              // Chat button for confirmed and pending bookings
              if (status.toLowerCase() == 'confirmed' || status.toLowerCase() == 'pending') ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _openChat(booking),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: const Text('Chat with Host'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF7BA7D8),
                      side: const BorderSide(color: Color(0xFF7BA7D8)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
              // Chat button for completed bookings (within 72hr window or reopened)
              if (status.toLowerCase() == 'completed') ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _openChat(booking),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: const Text('Chat with Host'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF7BA7D8),
                      side: const BorderSide(color: Color(0xFF7BA7D8)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
              // Review button for completed bookings (only after checkout date has passed)
              if (status.toLowerCase() == 'completed' && _isStayEnded(booking['check_out'])) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _openReviewScreen(booking),
                    icon: const Icon(Icons.rate_review, size: 18),
                    label: const Text('Leave a Review'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7BA7D8),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openBookingDetails(String placeId, Map<String, dynamic> booking) async {
    try {
      debugPrint('DEBUG: Opening booking details for place_id=$placeId');
      
      // Validate placeId
      if (placeId.isEmpty) {
        debugPrint('DEBUG: Error - placeId is empty!');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Error: Place ID is missing'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
      
      // Fetch place details
      debugPrint('DEBUG: Fetching place details for place_id=$placeId');
      final placeData = await ApiService.getPlaceById(placeId: placeId);
      debugPrint('DEBUG: Place data received: $placeData');
      debugPrint('DEBUG: Place data keys: ${placeData.keys}');
      debugPrint('DEBUG: Place data is empty: ${placeData.isEmpty}');
      
      if (placeData.isEmpty) {
        debugPrint('DEBUG: WARNING - Place data is empty!');
      }
      
      // placeData is already the place object (getPlaceById extracts it)
      debugPrint('DEBUG: Creating Place object from data...');
      final place = Place.fromJson(placeData.isEmpty ? {} : placeData);
      debugPrint('DEBUG: Place parsed - name=${place.name}, placeId=${place.placeId}');
      debugPrint('DEBUG: About to navigate to detail screen for place ${place.name}');
      
      if (mounted) {
        debugPrint('DEBUG: Widget is mounted, proceeding with navigation');
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => BookingDetailScreen(
              booking: booking,
              place: place,
            ),
          ),
        );
        debugPrint('DEBUG: Returned from detail screen with result=$result');
        
        // If a booking was cancelled (result == true), refresh the list and show cancelled tab
        if (result == true && mounted) {
          debugPrint('DEBUG: Booking was cancelled, refreshing list');
          setState(() {
            bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
            selectedTab = 'cancelled'; // Switch to cancelled tab to show the cancelled booking
          });
        }
      } else {
        debugPrint('DEBUG: Widget not mounted, cannot navigate');
      }
    } catch (e, stackTrace) {
      debugPrint('DEBUG: Error opening booking details: $e');
      debugPrint('DEBUG: Stack trace: $stackTrace');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading place details: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  bool _isChatAvailable(String? checkInStr, String? checkOutStr) {
    if (checkInStr == null || checkOutStr == null || checkInStr.isEmpty || checkOutStr.isEmpty) {
      return false;
    }
    try {
      final checkIn = DateTime.parse(checkInStr);
      final checkOut = DateTime.parse(checkOutStr);
      final now = DateTime.now();
      
      // Chat is available from 72 hours before check-in until check-out
      final seventyTwoHoursBefore = checkIn.subtract(const Duration(hours: 72));
      return now.isAfter(seventyTwoHoursBefore) && now.isBefore(checkOut);
    } catch (e) {
      return false;
    }
  }

  Future<void> _openChat(Map<String, dynamic> booking) async {
    final bookingId = (booking['booking_id'] ?? '').toString();
    final placeId = booking['place_id'];
    final hostId = booking['host_id'];
    final hostName = (booking['host_name'] ?? 'Host').toString();

    if (bookingId.isEmpty || placeId == null || hostId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot open chat: Missing booking or host information')),
        );
      }
      return;
    }

    final placeIdInt = placeId is int ? placeId : int.tryParse(placeId.toString()) ?? 0;
    final hostIdInt = hostId is int ? hostId : int.tryParse(hostId.toString()) ?? 0;

    if (hostIdInt == 0) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot open chat: Host information not available')),
        );
      }
      return;
    }

    if (mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatScreen(
            bookingId: bookingId,
            placeId: placeIdInt,
            hostName: hostName,
            hostId: hostIdInt,
          ),
        ),
      );
      // Refresh unread counts after returning from chat
      _loadUnreadCounts();
    }
  }
}

