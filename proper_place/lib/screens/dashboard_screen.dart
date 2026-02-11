import 'package:flutter/material.dart';
import 'package:proper_place/services/chat_service.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onTabChanged;
  final List<Map<String, dynamic>>? conversations;
  final List<Map<String, dynamic>>? bookings;

  const DashboardScreen({
    super.key,
    required this.onTabChanged,
    this.conversations,
    this.bookings,
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

  @override
  void initState() {
    super.initState();
    _chatService = ChatService();
    _calculateMetrics();
  }

  void _calculateMetrics() {
    _unreadCount = 0;
    _totalBookings = 0;
    _pendingPaymentsCount = 0;
    _totalRevenue = 0.0;
    double totalDays = 0;
    int completedBookings = 0;

    // Use provided data or sample data
    var conversations = widget.conversations ?? _getSampleConversations();
    var bookings = widget.bookings ?? _getSampleBookings();

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

  /// Sample conversations data for testing
  List<Map<String, dynamic>> _getSampleConversations() {
    return [
      {
        'id': '1',
        'closed': false,
        'guestName': 'Alice Johnson',
        'guestAvatar': 'AJ',
        'placeName': 'Cozy Studio Apartment',
        'lastMessage': 'Thank you! We had an amazing stay!',
        'timestamp': '2 min ago',
        'unread': 1, // Unread
        'messages': [],
      },
      {
        'id': '2',
        'closed': true,
        'guestName': 'Bob Wilson',
        'guestAvatar': 'BW',
        'placeName': 'Beachfront Villa',
        'lastMessage': 'Check-in was smooth, thanks!',
        'timestamp': '1 day ago',
        'unread': 0,
        'messages': [],
      },
      {
        'id': '3',
        'closed': false,
        'guestName': 'Carol Davis',
        'guestAvatar': 'CD',
        'placeName': 'Mountain Cabin',
        'lastMessage': 'Do you have heating for winter?',
        'timestamp': '1 hour ago',
        'unread': 1, // Unread
        'messages': [],
      },
    ];
  }

  /// Sample bookings data for testing
  List<Map<String, dynamic>> _getSampleBookings() {
    return [
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
      {
        'id': 3,
        'guestName': 'Mike Thompson',
        'placeName': 'Forest Retreat',
        'checkIn': DateTime(2025, 12, 20),
        'checkOut': DateTime(2025, 12, 27),
        'status': 'Completed',
        'amount': '£750.00',
        'guestEmail': 'mike@example.com',
        'guestPhone': '+44 555 123 4567',
      },
    ];
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
