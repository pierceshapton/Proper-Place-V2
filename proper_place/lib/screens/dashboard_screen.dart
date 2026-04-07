import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:proper_place/services/chat_service.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/place_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'stripe_payout_setup_screen.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onTabChanged;

  const DashboardScreen({
    super.key,
    required this.onTabChanged,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with WidgetsBindingObserver {
  late ChatService _chatService;
  int _unreadCount = 0;
  int _totalBookings = 0;
  int _pendingPaymentsCount = 0;
  double _totalRevenue = 0.0;
  double _avgLengthOfStay = 0.0;
  bool _isLoading = true;
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _bookings = [];
  bool _payoutsEnabled = false; // default false until confirmed by API

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _chatService = ChatService();
    _loadDataAndCalculateMetrics();
    _checkPayoutStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPayoutStatus();
    }
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

  Future<void> _checkPayoutStatus() async {
    // Load cached value first so banner shows immediately if needed
    final cached = await StorageService.getStripePayoutsEnabled();
    if (mounted) {
      setState(() {
        _payoutsEnabled = cached;
      });
    }

    // Then verify against the server and update cache
    try {
      final status = await ApiService.getPayoutStatus();
      final enabled = status['details_submitted'] == true;
      await StorageService.setStripePayoutsEnabled(enabled);
      if (mounted) {
        setState(() {
          _payoutsEnabled = enabled;
        });
      }
    } catch (_) {
      // On API failure, keep cached value (which defaults to false)
    }
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

  Future<void> _showReferralPopup() async {
    // Show loading while fetching referral code
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6))),
    );

    String? referralCode;
    try {
      final response = await ApiService.getReferralCode();
      print('[REFERRAL DEBUG] API returned: "$response"');
      referralCode = response;
    } catch (e) {
      print('[REFERRAL DEBUG] API call FAILED: $e');
      // Generate a local fallback code
      final randomHex = List.generate(8, (i) => '0123456789ABCDEF'[(DateTime.now().microsecond + i.hashCode) % 16]).join();
      referralCode = 'PP-$randomHex';
    }

    if (!mounted) return;
    Navigator.pop(context); // dismiss loading

    final referralLink = 'https://proper-place.co.uk/host-signup?ref=$referralCode';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Gift icon
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF3B82F6).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.card_giftcard, color: Color(0xFF3B82F6), size: 40),
            ),
            const SizedBox(height: 16),

            // Title
            const Text(
              'Refer a Host, Earn £25!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 12),

            // Description
            const Text(
              'Know someone with a great space for motorhomes? '
              'Share your referral link and you\'ll receive a £25 bonus '
              'once they list their site and receive their first guest booking.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),

            // Referral code box
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      referralCode ?? '',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: referralLink));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Referral link copied!'),
                          backgroundColor: Color(0xFF10B981),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Copy',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Share button
            GestureDetector(
              onTap: () {
                SharePlus.instance.share(
                  ShareParams(
                    text: 'Join Proper Place as a host and earn money from your land! '
                        'Use my referral code: $referralCode\n\n$referralLink',
                  ),
                );
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.share, color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Share Referral Link',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // How it works
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'How it works',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF92400E)),
                  ),
                  SizedBox(height: 8),
                  _ReferralStep(number: '1', text: 'Share your link with another potential host'),
                  SizedBox(height: 6),
                  _ReferralStep(number: '2', text: 'They sign up and list their site'),
                  SizedBox(height: 6),
                  _ReferralStep(number: '3', text: 'After their first guest booking, you get £25!'),
                ],
              ),
            ),
          ],
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
          // Stripe payout setup banner
          if (!_payoutsEnabled)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const StripePayoutSetupScreen()),
                  );
                  _checkPayoutStatus();
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF59E0B)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.account_balance, color: Color(0xFFD97706), size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Set Up Payouts',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF92400E)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Guests can\u2019t book until you connect your bank account. Tap to set up now.',
                              style: TextStyle(fontSize: 13, color: Colors.brown[700], height: 1.3),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Color(0xFFD97706)),
                    ],
                  ),
                ),
              ),
            ),

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
          const SizedBox(height: 12),

          // Refer a Host Card
          GestureDetector(
            onTap: _showReferralPopup,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF3B82F6).withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: const Icon(Icons.card_giftcard, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Refer a Host',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Earn £25 for every host you refer!',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 18),
                ],
              ),
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

class _ReferralStep extends StatelessWidget {
  final String number;
  final String text;

  const _ReferralStep({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: const BoxDecoration(
            color: Color(0xFFF59E0B),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 13, color: Color(0xFF92400E)),
          ),
        ),
      ],
    );
  }
}
