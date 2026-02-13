import 'package:flutter/material.dart';
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
  String? _userName = 'User';
  String? _userRole = 'user';
  bool _isHostMode = false;
  bool _isOfflineMode = false;
  bool _isHowThisWorksExpanded = false;
  bool _isContactUsExpanded = false;
  String? _hostApplicationStatus;
  bool _isLoading = false;
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    // Load data in background after UI renders
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

  void _onScroll() {
    // Limit scroll to stop when logout section is visible
    final maxScroll = _scrollController.position.maxScrollExtent - 115;
    if (_scrollController.offset > maxScroll) {
      _scrollController.jumpTo(maxScroll);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
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

  void _activateApprovedHostMode() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Activate Host Mode?'),
        content: const Text(
          'You will now access the host side of the app where you can list and manage your properties.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await StorageService.setHostMode(true);
              if (mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/home',
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple[600],
            ),
            child: const Text('Activate'),
          ),
        ],
      ),
    );
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
      appBar: AppBar(
        title: const Text('More'),
        backgroundColor: const Color(0xFF7BA7D8),
      ),
      body: ListView(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          // Profile Section
          _buildProfileCard(),
          const SizedBox(height: 24),

          // Contact Us Section (Help & Support)
          _buildContactUsSection(),
          const SizedBox(height: 24),

          // How This Works Section (hide for admins)
          if (_userRole != 'admin') ...[
            _buildHowThisWorksSection(),
            const SizedBox(height: 24),
          ],

          // Become a Host Section (only if not already in host mode and not admin)
          if (!_isHostMode && _userRole != 'admin') ...[
            _buildBecomeHostSection(),
            const SizedBox(height: 24),
          ],

          // Settings Section
          _buildSettingsSection(),
          const SizedBox(height: 24),

          // Activate Host Mode (when approved but not yet in host mode)
          if (_hostApplicationStatus == 'approved') ...[
            _buildActivateHostModeApprovedCard(),
            const SizedBox(height: 24),
          ],

          // Conditional: Host Mode Activation
          if (_userRole == 'host' && !_isHostMode) ...[
            _buildActivateHostModeCard(),
            const SizedBox(height: 24),
          ],

          // Conditional: Admin Dashboard (ONLY for admins)
          if (_userRole == 'admin') ...[
            _buildAdminDashboardCard(),
            const SizedBox(height: 24),
          ],

          // Sign Out Section
          _buildSignOutSection(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildProfileCard() {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const ProfileScreen(),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Color(0xFF3B82F6),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  (_userName?.isNotEmpty ?? false)
                      ? _userName![0].toUpperCase()
                      : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
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
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.shield, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        _userRole?.replaceFirst(
                                _userRole![0], _userRole![0].toUpperCase()) ??
                            'User',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400], size: 28),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Settings',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Column(
            children: [
              _buildSettingToggle(
                icon: Icons.cloud_off,
                title: 'Offline Mode',
                subtitle: 'View locations without booking',
                value: _isOfflineMode,
                onChanged: (value) async {
                  await StorageService.setOfflineMode(value);
                  setState(() => _isOfflineMode = value);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingToggle({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF7BA7D8), size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
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
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: const Color(0xFF7BA7D8),
          ),
        ],
      ),
    );
  }

  Widget _buildBecomeHostSection() {
    final isApplicationPending = _hostApplicationStatus == 'pending';
    final isApplicationApproved = _hostApplicationStatus == 'approved';

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.home_work,
                color: const Color(0xFF7BA7D8),
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _userRole == 'host' ? 'Activate Host Mode' : 'Apply to Become a Host',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isApplicationApproved
                          ? 'Your application has been approved!'
                          : isApplicationPending
                              ? 'Application pending admin review...'
                              : 'As a host, you can list and manage properties',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (isApplicationApproved)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _switchToHostMode,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7BA7D8),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.home_work, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Activate Host Mode',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (!isApplicationPending)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const HostApplicationFormScreen(),
                    ),
                  ).then((_) {
                    // Reload user data when returning from form
                    _loadUserData();
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7BA7D8),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.home_work, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Apply to Become a Host',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Application Under Review',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey,
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

  Widget _buildHowThisWorksSection() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: () => setState(
                () => _isHowThisWorksExpanded = !_isHowThisWorksExpanded),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.info, color: Color(0xFF3B82F6), size: 24),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'How This Works',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF3B82F6),
                      ),
                    ),
                  ),
                  Icon(
                    _isHowThisWorksExpanded
                        ? Icons.expand_less
                        : Icons.expand_more,
                    color: const Color(0xFF3B82F6),
                  ),
                ],
              ),
            ),
          ),
          if (_isHowThisWorksExpanded) ...[
            Divider(color: Colors.blue[200], height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBulletPoint(
                      'Your registration is shared with hosts when you book'),
                  _buildBulletPoint(
                      'Hosts verify it matches your vehicle on arrival'),
                  _buildBulletPoint(
                      'Kept on record for security and any post-visit issues'),
                  _buildBulletPoint(
                      'Helps us maintain a safe community for all users'),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '• ',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF3B82F6),
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF3B82F6),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivateHostModeCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.purple[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.apartment, color: Colors.purple[600], size: 24),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Activate Host Mode',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'As a host, you can list and manage places',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _switchToHostMode,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple[600],
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.apartment, color: Colors.white, size: 20),
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

  Widget _buildActivateHostModeApprovedCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.purple[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.purple[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.apartment, color: Colors.purple[600], size: 24),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Activate Host Mode',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'As a host, you can list and manage places',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _activateApprovedHostMode,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple[600],
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.apartment, color: Colors.white, size: 20),
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

  Widget _buildAdminDashboardCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.security, color: Color(0xFF3B82F6), size: 24),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Admin Dashboard',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Access platform administration tools and settings',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _switchToAdminMode,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.security, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Open Admin Dashboard',
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

  Widget _buildContactUsSection() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                _isContactUsExpanded = !_isContactUsExpanded;
              });
            },
            child: Row(
              children: [
                Icon(
                  Icons.help,
                  color: const Color(0xFF7BA7D8),
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Help & Support',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Icon(
                  _isContactUsExpanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.grey[400],
                ),
              ],
            ),
          ),
          if (_isContactUsExpanded) ...[
            const SizedBox(height: 16),
            // FAQs Link
            GestureDetector(
              onTap: () {
                // Open FAQs (can be a URL or a screen)
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('FAQs - Coming soon'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.question_answer, color: const Color(0xFF7BA7D8), size: 20),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Frequently Asked Questions',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Icon(Icons.open_in_new, color: Colors.grey[400], size: 18),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Contact Form Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ContactUsFormScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7BA7D8),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.mail_outline, color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Send Us a Message',
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
        ],
      ),
    );
  }

  Widget _buildSignOutSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Sign Out',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Log out of your Proper Place account',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[700],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _showLogoutConfirmation,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[600],
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Logout',
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
}
