import 'package:flutter/material.dart';
import 'package:proper_place/services/chat_service.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/place_service.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onTabChanged;

  const DashboardScreen({
    super.key,
    required this.onTabChanged,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late ChatService _chatService;
  int _unreadCount = 0;
  int _totalBookings = 0;
  int _pendingPaymentsCount = 0;
  double _totalRevenue = 0.0;
  double _avgLengthOfStay = 0.0;
  bool _isLoading = true;
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _bookings = [];

  @override
  void initState() {
    super.initState();
    _chatService = ChatService();
    _loadDataAndCalculateMetrics();
  }

  Future<void> _loadDataAndCalculateMetrics() async {
    setState(() => _isLoading = true);
    
    try {
      // Load conversations from API
      final conversationsData = await _chatService.getConversations();
      _conversations = conversationsData.map((c) => c as Map<String, dynamic>).toList();
      
      // Load bookings from all host places
      final places = await PlaceService.getHostPlaces();
      List<Map<String, dynamic>> allBookings = [];
      
      for (var place in places) {
        final placeId = place['id'] ?? place['place_id'] ?? '';
        if (placeId.toString().isEmpty) continue;
        
        try {
          final bookings = await ApiService.getBookingsForPlace(placeId: placeId.toString());
          for (var booking in bookings) {
            final checkInStr = (booking['check_in'] ?? booking['check_in_date'] ?? '').toString();
            final checkOutStr = (booking['check_out'] ?? booking['check_out_date'] ?? '').toString();
            
            DateTime? checkIn;
            DateTime? checkOut;
            try {
              if (checkInStr.isNotEmpty) checkIn = DateTime.parse(checkInStr);
              if (checkOutStr.isNotEmpty) checkOut = DateTime.parse(checkOutStr);
            } catch (e) {
              // Use null if parsing fails
            }
            
            allBookings.add({
              'id': booking['id'] ?? booking['booking_id'] ?? '',
              'guestName': booking['guest_name'] ?? booking['user_name'] ?? 'Guest',
              'placeName': place['name'] ?? 'Unknown Place',
              'checkIn': checkIn,
              'checkOut': checkOut,
              'status': _normalizeStatus(booking['status'] ?? 'pending'),
              'amount': _formatPrice(booking['total_price'] ?? 0),
              'guestEmail': booking['guest_email'] ?? booking['user_email'] ?? '',
              'guestPhone': booking['contact_phone'] ?? booking['phone'] ?? '',
            });
          }
        } catch (e) {
          print('Error loading bookings for place $placeId: $e');
        }
      }
      
      _bookings = allBookings;
    } catch (e) {
      print('Error loading dashboard data: $e');
    }
    
    _calculateMetrics();
    setState(() => _isLoading = false);
  }

  String _normalizeStatus(String status) {
    final lower = status.toLowerCase();
    if (lower == 'confirmed' || lower == 'accepted') return 'Confirmed';
    if (lower == 'pending') return 'Pending';
    if (lower == 'completed') return 'Completed';
    if (lower == 'cancelled' || lower == 'canceled') return 'Cancelled';
    return status;
  }

  String _formatPrice(dynamic price) {
    if (price == null) return '£0.00';
    final amount = price is num ? price.toDouble() : double.tryParse(price.toString()) ?? 0.0;
    return '£${amount.toStringAsFixed(2)}';
  }

  void _calculateMetrics() {
    _unreadCount = 0;
    _totalBookings = 0;
    _pendingPaymentsCount = 0;
    _totalRevenue = 0.0;
    double totalDays = 0;
    int completedBookings = 0;

    // Use loaded data
    var conversations = _conversations;
    var bookings = _bookings;

    // Calculate unread conversations count (open/unread only)
    if (conversations.isNotEmpty) {
      for (var conv in conversations) {
        if (conv['closed'] != true && (conv['unread'] as int? ?? 0) > 0) {
          _unreadCount++;
        }
      }
    }

    // Calculate bookings metrics
    if (bookings.isNotEmpty) {
      for (var booking in bookings) {
        final status = booking['status'] as String? ?? '';
        
        // Count all pending/confirmed bookings
        if (status == 'Pending' || status == 'Confirmed') {
          _totalBookings++;
        }

        // Count confirmed bookings for pending payments
        if (status == 'Confirmed') {
          _pendingPaymentsCount++;
        }

        // Calculate revenue and length of stay for stats
        if (status == 'Completed' || status == 'Confirmed') {
          final amountStr = (booking['amount'] as String? ?? '£0.00')
              .replaceAll('£', '')
              .replaceAll(',', '');
          _totalRevenue += double.tryParse(amountStr) ?? 0.0;
          
          final checkIn = booking['checkIn'] as DateTime?;
          final checkOut = booking['checkOut'] as DateTime?;
          if (checkIn != null && checkOut != null) {
            totalDays += checkOut.difference(checkIn).inDays;
            completedBookings++;
          }
        }
      }
    }

    // Calculate average length of stay (no decimals)
    if (completedBookings > 0) {
      _avgLengthOfStay = (totalDays / completedBookings).roundToDouble();
    }

    setState(() {});
  }

  void _showSalesSummaryPopup() {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Sales Summary',
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(Icons.close, size: 24),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Average Length of Stay
              _buildSalesMetric(
                title: 'Average Length of Stay',
                value: '${_avgLengthOfStay.toStringAsFixed(0)} nights',
                icon: Icons.nights_stay,
                color: const Color(0xFF3B82F6),
              ),
              const SizedBox(height: 16),

              // Total Revenue
              _buildSalesMetric(
                title: 'Total Revenue',
                value: '£${_totalRevenue.toStringAsFixed(2)}',
                icon: Icons.trending_up,
                color: const Color(0xFF10B981),
              ),
              const SizedBox(height: 16),

              // Total Bookings
              _buildSalesMetric(
                title: 'Total Bookings',
                value: '$_totalBookings bookings',
                icon: Icons.calendar_month,
                color: const Color(0xFFA855F7),
              ),
              const SizedBox(height: 24),

              // Close Button
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text(
                      'Close',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSalesMetric({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const SizedBox.shrink(),
        title: const Text(
          'Dashboard',
          style: TextStyle(
            color: Colors.black,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Unread Messages Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(3); // Chat tab
            },
            child: _buildMetricCard(
              title: 'Unread Messages',
              value: '$_unreadCount',
              icon: Icons.chat_bubble_outline,
              backgroundColor: const Color(0xFFD4E4F7),
              iconColor: const Color(0xFF3B82F6),
            ),
          ),
          const SizedBox(height: 12),

          // Manage Bookings Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(2); // Bookings tab
            },
            child: _buildMetricCard(
              title: 'Manage Bookings',
              value: '$_totalBookings',
              icon: Icons.calendar_today_outlined,
              backgroundColor: const Color(0xFFD1FAE5),
              iconColor: const Color(0xFF10B981),
            ),
          ),
          const SizedBox(height: 12),

          // Sales Summary Card
          GestureDetector(
            onTap: _showSalesSummaryPopup,
            child: _buildMetricCard(
              title: 'Sales Summary',
              value: '',
              icon: Icons.visibility_outlined,
              backgroundColor: const Color(0xFFE9D5FF),
              iconColor: const Color(0xFFA855F7),
              showValue: false,
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color backgroundColor,
    required Color iconColor,
    bool showValue = true,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              if (showValue)
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          Container(
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
            child: Icon(
              icon,
              color: iconColor,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }
}
