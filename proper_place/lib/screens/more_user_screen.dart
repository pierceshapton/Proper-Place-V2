import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/storage_service.dart';
import 'host_application_form_screen.dart';
import 'contact_us_form_screen.dart';
import 'profile_screen.dart';
import 'welcome_screen.dart';

class MoreUserScreen extends StatefulWidget {
  const MoreUserScreen({super.key});

  @override
  State<MoreUserScreen> createState() => _MoreUserScreenState();
}

class _MoreUserScreenState extends State<MoreUserScreen> {
  // Colors matching website
  static const Color headerGrey = Color(0xFFF5F5F5);
  static const Color cream = Color(0xFFF8F5F0);
  static const Color lightBlue = Color(0xFF5B8FC4);
  static const Color accentBlue = Color(0xFF4A7EB3);

  String? _userName = 'User';
  String? _userRole = 'user';
  bool _isHostMode = false;
  bool _isOfflineMode = false;
  String? _hostApplicationStatus;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      _loadUserData();
    });
  }

  Future<void> _loadUserData() async {
    try {
      final name = await StorageService.getUserName();
      final role = await StorageService.getUserRole();
      final hostMode = await StorageService.getHostMode();
      final offlineMode = await StorageService.getOfflineMode();
      final hostAppStatus = await StorageService.getHostApplicationStatus();

      if (mounted) {
        setState(() {
          _userName = name ?? 'User';
          _userRole = role ?? 'user';
          _isHostMode = hostMode;
          _isOfflineMode = offlineMode;
          _hostApplicationStatus = hostAppStatus;
        });
      }
    } catch (e) {
      debugPrint('Error loading user data: $e');
    }
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

  Future<void> _switchToHostMode() async {
    await StorageService.setHostMode(true);
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
    }
  }

  Future<void> _switchToAdminMode() async {
    await StorageService.setAdminMode(true);
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
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
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ProfileScreen(),
                        ),
                      );
                    },
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: const BoxDecoration(
                            color: lightBlue,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              (_userName?.isNotEmpty ?? false)
                                  ? _userName![0].toUpperCase()
                                  : 'U',
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
                                _userName ?? 'User',
                                style: const TextStyle(
                                  color: Color(0xFF1A1A1A),
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _userRole?.replaceFirst(
                                        _userRole![0], _userRole![0].toUpperCase()) ??
                                    'User',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(
                          Icons.chevron_right,
                          color: Colors.grey[400],
                          size: 24,
                        ),
                      ],
                    ),
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
                  // Quick Actions
                  _buildSectionTitle('Quick Actions'),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.map_outlined,
                    title: 'Find a Proper Place',
                    subtitle: 'Browse all available locations',
                    onTap: () => Navigator.pushNamed(context, '/map'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.favorite_outline,
                    title: 'My Favourites',
                    subtitle: 'View your saved Proper Places',
                    onTap: () => Navigator.pushNamed(context, '/favorites'),
                  ),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.calendar_today_outlined,
                    title: 'My Bookings',
                    subtitle: 'View your booking history',
                    onTap: () => Navigator.pushNamed(context, '/bookings'),
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
                    icon: Icons.info_outline,
                    title: 'How It Works',
                    subtitle: 'Learn about Proper Place',
                    onTap: () => _launchUrl('https://proper-place.co.uk/how-it-works'),
                  ),
                  const SizedBox(height: 12),
                  _buildWebsiteLinkCard(
                    icon: Icons.people_outline,
                    title: 'About Us',
                    subtitle: 'Meet the team behind Proper Place',
                    onTap: () => _launchUrl('https://proper-place.co.uk/about'),
                  ),
                  const SizedBox(height: 24),

                  // Help & Support
                  _buildSectionTitle('Help & Support'),
                  const SizedBox(height: 12),
                  _buildActionCard(
                    icon: Icons.mail_outline,
                    title: 'Contact Us',
                    subtitle: 'Get in touch with our team',
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ContactUsFormScreen(),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  _buildWebsiteLinkCard(
                    icon: Icons.privacy_tip_outlined,
                    title: 'Privacy Policy',
                    subtitle: 'How we protect your data',
                    onTap: () => _launchUrl('https://proper-place.co.uk/privacy'),
                  ),
                  const SizedBox(height: 12),
                  _buildWebsiteLinkCard(
                    icon: Icons.description_outlined,
                    title: 'Terms of Service',
                    subtitle: 'Our terms and conditions',
                    onTap: () => _launchUrl('https://proper-place.co.uk/terms'),
                  ),
                  const SizedBox(height: 24),

                  // Become a Host Section
                  if (!_isHostMode && _userRole != 'admin' && _userRole != 'host') ...[
                    _buildSectionTitle('Host Opportunities'),
                    const SizedBox(height: 12),
                    _buildBecomeHostCard(),
                    const SizedBox(height: 24),
                  ],

                  // Activate Host Mode (for approved hosts)
                  if (_hostApplicationStatus == 'approved' || _userRole == 'host') ...[
                    _buildSectionTitle('Host Mode'),
                    const SizedBox(height: 12),
                    _buildActivateHostCard(),
                    const SizedBox(height: 24),
                  ],

                  // Admin Access (for admins only)
                  if (_userRole == 'admin') ...[
                    _buildSectionTitle('Administration'),
                    const SizedBox(height: 12),
                    _buildAdminCard(),
                    const SizedBox(height: 24),
                  ],

                  // Settings
                  _buildSectionTitle('Settings'),
                  const SizedBox(height: 12),
                  _buildSettingsCard(),
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

  Widget _buildBecomeHostCard() {
    final isApplicationPending = _hostApplicationStatus == 'pending';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [lightBlue, accentBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: lightBlue.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 5),
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
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.home_work, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Become a Host',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isApplicationPending
                ? 'Your application is being reviewed by our team.'
                : 'Turn your land into extra income by welcoming motorhome travellers.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          if (isApplicationPending)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Application Under Review',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const HostApplicationFormScreen(),
                        ),
                      ).then((_) => _loadUserData());
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: accentBlue,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Apply Now',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => _launchUrl('https://proper-place.co.uk/become-host'),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.info_outline, color: Colors.white),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildActivateHostCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: lightBlue.withOpacity(0.3)),
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
                  color: lightBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.home_work, color: lightBlue, size: 24),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Host Mode Available',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Switch to manage your properties',
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
            child: ElevatedButton(
              onPressed: _switchToHostMode,
              style: ElevatedButton.styleFrom(
                backgroundColor: lightBlue,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.swap_horiz, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Activate Host Mode',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF3B82F6).withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.admin_panel_settings, color: Color(0xFF3B82F6), size: 28),
              SizedBox(width: 12),
              Text(
                'Admin Dashboard',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Access platform administration tools',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _switchToAdminMode,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.security, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Open Admin Dashboard',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsCard() {
    return Container(
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
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.cloud_off_outlined, color: lightBlue, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Offline Mode',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'Browse without booking',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _isOfflineMode,
                onChanged: (value) async {
                  await StorageService.setOfflineMode(value);
                  setState(() => _isOfflineMode = value);
                },
                activeColor: lightBlue,
              ),
            ],
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
