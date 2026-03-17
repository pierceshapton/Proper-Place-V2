import 'dart:async';
import 'package:flutter/material.dart';
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
  String selectedTab = 'confirmed';
  Map<int, int> _unreadByBooking = {};
  Timer? _unreadPollingTimer;

  @override
  void initState() {
    super.initState();
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
        title: const Text('My Bookings'),
        backgroundColor: const Color(0xFF7BA7D8),
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
            return Column(
              children: [
                // Filter tabs - always show
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        _buildFilterTab('Confirmed', 'confirmed'),
                        const SizedBox(width: 8),
                        _buildFilterTab('Pending', 'pending'),
                        const SizedBox(width: 8),
                        _buildFilterTab('Completed', 'completed'),
                        const SizedBox(width: 8),
                        _buildFilterTab('Cancelled', 'cancelled'),
                      ],
                    ),
                  ),
                ),
                // Empty state
                Expanded(
                  child: Center(
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
                  ),
                ),
              ],
            );
          }

          final bookings = snapshot.data ?? [];
          final filteredBookings = bookings
              .where((b) => (b['status'] ?? 'confirmed').toLowerCase() == selectedTab)
              .toList();

          return Column(
            children: [
              // Filter tabs - always show
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      _buildFilterTab('Confirmed', 'confirmed'),
                      const SizedBox(width: 8),
                      _buildFilterTab('Pending', 'pending'),
                      const SizedBox(width: 8),
                      _buildFilterTab('Completed', 'completed'),
                      const SizedBox(width: 8),
                      _buildFilterTab('Cancelled', 'cancelled'),
                    ],
                  ),
                ),
              ),
              // Content
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async {
                    setState(() {
                      bookingsFuture = ApiService.getGuestBookings(guestId: guestId);
                    });
                    await bookingsFuture;
                    _loadUnreadCounts();
                  },
                  child: filteredBookings.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredBookings.length,
                          itemBuilder: (context, index) {
                            return _buildBookingCard(filteredBookings[index]);
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

  Widget _buildFilterTab(String label, String value) {
    final isSelected = selectedTab == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedTab = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF7BA7D8) : Colors.grey[100],
          border: isSelected ? null : Border.all(color: const Color(0xFFE2E8F0), width: 1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
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
    final bookingIdShort = bookingIdStr.length >= 8 
        ? bookingIdStr.substring(0, 8).toUpperCase()
        : bookingIdStr.toUpperCase();
    final status = booking['status'] ?? 'unknown';
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
                        'Booking #$bookingIdShort',
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

