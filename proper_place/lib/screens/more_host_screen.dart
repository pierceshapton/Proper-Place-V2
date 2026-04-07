import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/place_service.dart';
import 'package:proper_place/services/api_service.dart';
import 'welcome_screen.dart';

class MoreHostScreen extends StatefulWidget {
  const MoreHostScreen({super.key});

  @override
  State<MoreHostScreen> createState() => _MoreHostScreenState();
}

class _MoreHostScreenState extends State<MoreHostScreen> {
  // Colors matching website
  static const Color headerGrey = Color(0xFFF5F5F5);
  static const Color cream = Color(0xFFF8F5F0);
  static const Color lightBlue = Color(0xFF5B8FC4);
  static const Color accentBlue = Color(0xFF4A7EB3);

  Map<String, dynamic>? user;
  bool isLoading = true;
  List<Map<String, dynamic>> _rejectedPlaces = []; // unused, kept for compatibility

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      final email = await StorageService.getUserEmail();
      final name = await StorageService.getUserName();
      final role = await StorageService.getUserRole();
      setState(() {
        user = {
          'name': name ?? 'Host User',
          'email': email ?? 'host@example.com',
          'role': role ?? 'host',
        };
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _loadRejectedPlaces() async {
    try {
      final places = await PlaceService.getHostPlaces();
      final rejected = places
          .where((p) => (p['approval_status'] ?? '') == 'rejected')
          .map<Map<String, dynamic>>((p) => Map<String, dynamic>.from(p))
          .toList();
      if (mounted) {
        setState(() {
          _rejectedPlaces = rejected;
        });
      }
    } catch (e) {
      // Silently fail - this is optional info
    }
  }

  String _getInitials(String? name) {
    if (name == null || name.isEmpty) return 'PP';
    final names = name.split(' ');
    if (names.length >= 2) {
      return '${names[0][0]}${names[1][0]}'.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showLogoutConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text(
            'Are you sure you want to log out of your Proper Place account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _logout();
            },
            child: const Text('Sign Out', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    await StorageService.clearUserData();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const WelcomeScreen()),
        (route) => false,
      );
    }
  }

  void _switchToUserMode() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Switch to User Mode?'),
        content: const Text(
          'You will no longer see your host dashboard and bookings. You can switch back anytime.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await StorageService.setHostMode(false);
              if (mounted) {
                Navigator.of(context).pushNamedAndRemoveUntil(
                  '/home',
                  (Route<dynamic> route) => false,
                );
              }
            },
            child: const Text('Switch',
                style: TextStyle(color: Color(0xFFD97706))),
          ),
        ],
      ),
    );
  }

  Future<void> _showPayoutSetup() async {
    // Show loading while fetching status
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: lightBlue)),
    );

    bool connected = false;
    bool payoutsEnabled = false;

    try {
      final status = await ApiService.getPayoutStatus();
      connected = status['connected'] == true;
      payoutsEnabled = status['details_submitted'] == true;
    } catch (e) {
      // Default to not connected
    }

    if (!mounted) return;
    Navigator.pop(context); // dismiss loading

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),

            Icon(
              payoutsEnabled ? Icons.check_circle : Icons.account_balance,
              color: payoutsEnabled ? const Color(0xFF10B981) : lightBlue,
              size: 48,
            ),
            const SizedBox(height: 16),

            Text(
              payoutsEnabled ? 'Payouts Active' : (connected ? 'Setup Incomplete' : 'Set Up Payouts'),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black),
            ),
            const SizedBox(height: 12),

            Text(
              payoutsEnabled
                  ? 'Your account is connected and ready to receive referral bonuses automatically.'
                  : connected
                      ? 'Your Stripe account is connected but needs more details before payouts can be sent.'
                      : 'Connect your bank account via Stripe to receive booking payouts automatically. Guests cannot book your site until this is set up.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.5),
            ),
            const SizedBox(height: 24),

            if (!payoutsEnabled)
              GestureDetector(
                onTap: () async {
                  Navigator.pop(ctx);
                  // Show loading
                  if (!mounted) return;
                  showDialog(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const Center(child: CircularProgressIndicator(color: lightBlue)),
                  );

                  try {
                    final url = await ApiService.setupPayoutAccount();
                    if (!mounted) return;
                    Navigator.pop(context); // dismiss loading
                    if (url.isNotEmpty) {
                      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                    }
                  } catch (e) {
                    if (!mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: lightBlue,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.account_balance, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        connected ? 'Complete Setup' : 'Connect Bank Account',
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),

            if (payoutsEnabled) ...[
              GestureDetector(
                onTap: () async {
                  Navigator.pop(ctx);
                  if (!mounted) return;
                  showDialog(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const Center(child: CircularProgressIndicator(color: lightBlue)),
                  );

                  try {
                    final result = await ApiService.retryPendingPayouts();
                    if (!mounted) return;
                    Navigator.pop(context);
                    final paid = result['paid'] ?? 0;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(paid > 0 ? '£${paid * 25} paid out!' : 'No pending payouts'),
                        backgroundColor: const Color(0xFF10B981),
                      ),
                    );
                  } catch (e) {
                    if (!mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: ${e.toString()}'), backgroundColor: Colors.red),
                    );
                  }
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.refresh, color: Colors.white, size: 20),
                      SizedBox(width: 8),
                      Text('Collect Pending Bonuses', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Info box
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Color(0xFF64748B), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Powered by Stripe. Your bank details are securely handled by Stripe and never stored by Proper Place.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: lightBlue),
        ),
      );
    }

    return Scaffold(
      backgroundColor: cream,
      body: CustomScrollView(
        slivers: [
          // Header Section
          SliverToBoxAdapter(
            child: Container(
              color: headerGrey,
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 12,
                left: 20,
                right: 20,
                bottom: 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Row
                  Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: const BoxDecoration(
                          color: Color(0xFFD97706),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            _getInitials(user?['name']),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
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
                              user?['name'] ?? 'Host User',
                              style: const TextStyle(
                                color: Color(0xFF1A1A1A),
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Host Account',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Content Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Host Status Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCD34D)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD97706).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.shield_outlined,
                            color: Color(0xFFD97706),
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Host Mode Active',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'You can manage your properties',
                                style: TextStyle(
                                  color: Color(0xFF92400E),
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Quick Actions
                  _buildSectionTitle('Host Actions'),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.add_home_outlined,
                    title: 'Add New Place',
                    subtitle: 'List a new property',
                    onTap: () => Navigator.pushNamed(context, '/host/create-site'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.home_outlined,
                    title: 'My Properties',
                    subtitle: 'Manage your listed places',
                    onTap: () => Navigator.pushNamed(context, '/host/places'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.calendar_month_outlined,
                    title: 'Bookings',
                    subtitle: 'View and manage bookings',
                    onTap: () => Navigator.pushNamed(context, '/host/bookings'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.star_outline,
                    title: 'Reviews',
                    subtitle: 'See what guests are saying',
                    onTap: () => Navigator.pushNamed(context, '/host/reviews'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.account_balance_outlined,
                    title: 'Payout Setup',
                    subtitle: 'Set up your bank for referral bonuses',
                    onTap: _showPayoutSetup,
                  ),
                  const SizedBox(height: 24),

                  // Important Documents
                  _buildSectionTitle('Important Documents'),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        _buildDocumentRow(
                          icon: Icons.menu_book_outlined,
                          title: 'Host Welcome Guide',
                          onTap: () => _launchUrl('https://proper-place.co.uk/how-it-works'),
                        ),
                        const Divider(height: 1),
                        _buildDocumentRow(
                          icon: Icons.balance_outlined,
                          title: 'Hosting Terms & Conditions',
                          onTap: () => _launchUrl('https://proper-place.co.uk/terms'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Website Links
                  _buildSectionTitle('Explore Proper Place'),
                  const SizedBox(height: 12),
                  _buildWebsiteLinkCard(
                    icon: Icons.language,
                    title: 'Visit Our Website',
                    subtitle: 'proper-place.co.uk',
                    onTap: () => _launchUrl('https://proper-place.co.uk'),
                  ),
                  const SizedBox(height: 12),
                  _buildWebsiteLinkCard(
                    icon: Icons.home_work_outlined,
                    title: 'Become a Host Guide',
                    subtitle: 'Tips for successful hosting',
                    onTap: () => _launchUrl('https://proper-place.co.uk/become-host'),
                  ),
                  const SizedBox(height: 24),

                  // Help & Support
                  _buildSectionTitle('Help & Support'),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.mail_outline,
                    title: 'Contact Support',
                    subtitle: 'Get help from our team',
                    onTap: () => _launchUrl('https://proper-place.co.uk/contact'),
                  ),
                  const SizedBox(height: 24),

                  // Switch Mode
                  _buildSectionTitle('Account'),
                  const SizedBox(height: 12),
                  _buildSwitchModeCard(),
                  const SizedBox(height: 24),

                  // Sign Out
                  _buildSignOutCard(),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: lightBlue,
        fontSize: 14,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: lightBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: lightBlue, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildWebsiteLinkCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: accentBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accentBlue, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.open_in_new, color: accentBlue, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentRow({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: lightBlue, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const Icon(Icons.open_in_new, color: Colors.grey, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchModeCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD97706).withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFD97706).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.swap_horiz, color: Color(0xFFD97706), size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Switch to User Mode',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Browse and book Proper Places',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _switchToUserMode,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFD97706),
                side: const BorderSide(color: Color(0xFFD97706)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Switch Mode',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSignOutCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.logout, color: Colors.red, size: 24),
              SizedBox(width: 12),
              Text(
                'Sign Out',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Log out of your Proper Place account',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _showLogoutConfirmation,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[600],
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Logout',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
