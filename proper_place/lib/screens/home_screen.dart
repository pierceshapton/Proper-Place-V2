import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/notification_service.dart';
import 'package:proper_place/widgets/notification_badge.dart';
import 'map_places_screen_new.dart';
import 'my_bookings_screen.dart';
import 'favorites_screen.dart';
import 'more_user_screen.dart';
import 'dashboard_screen.dart';
import 'my_places_host_screen.dart';
import 'bookings_host_screen.dart';
import 'reviews_host_screen.dart';
import 'more_host_screen.dart';
import 'chat_host_screen.dart';
import 'admin_dashboard_screen.dart';
import 'admin_approvals_screen.dart';
import 'admin_host_chat_screen.dart';
import 'admin_contact_messages_screen.dart';
import 'admin_more_screen.dart';

/// Reusable custom bottom navigation bar widget
class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final List<Map<String, dynamic>> items; // {icon: IconData, label: String, badge?: int}
  final Map<int, int>? badgeCounts; // {tabIndex: count}

  const CustomBottomNavBar({
    Key? key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.badgeCounts,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFFAF9F6),
      child: Container(
        padding: const EdgeInsets.only(top: 10, bottom: 16, left: 8, right: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF9F6),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(
          items.length,
          (index) => Expanded(
            child: _buildNavItem(
              index,
              items[index]['icon'] as IconData,
              items[index]['label'] as String,
              index == currentIndex,
              () => onTap(index),
              badgeCounts?[index] ?? 0,
            ),
          ),
        ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    int index,
    IconData icon,
    String label,
    bool isSelected,
    VoidCallback onTap,
    int badgeCount,
  ) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 22,
                  color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF9CA3AF),
                ),
                if (badgeCount > 0)
                  NotificationBadge(
                    count: badgeCount,
                    size: 18,
                    backgroundColor: Colors.red,
                    textStyle: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: isSelected ? 10 : 9,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF9CA3AF),
              ),
              overflow: TextOverflow.ellipsis,
            ),
            if (isSelected)
              Container(
                margin: const EdgeInsets.only(top: 3),
                width: 16,
                height: 2,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
  
  /// Static method to set the tab for when the home screen appears
  static void setNextTab(int tabIndex) {
    _HomeScreenState.setNextTab(tabIndex);
  }
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  // Static field to allow setting tab from elsewhere (e.g., booking confirmation)
  static int? _nextTabIndex;
  
  List<Map<String, dynamic>> places = [];
  bool isLoading = true;
  String searchQuery = '';
  String selectedFilter = 'all';
  int _currentIndex = 0;
  String? userRole;
  bool isHostMode = false;
  bool isAdminMode = false;
  
  // Notification counts
  Map<int, int> _badgeCounts = {};
  Timer? _notificationRefreshTimer;
  final NotificationService _notificationService = NotificationService();
  
  /// Call this to set the tab index for the next time HomeScreen appears
  static void setNextTab(int tabIndex) {
    _nextTabIndex = tabIndex;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    
    // Setup notification timer immediately (non-blocking)
    _notificationRefreshTimer = Timer.periodic(
      const Duration(seconds: 2),
      (_) => _loadNotificationCounts(),
    );
    
    // Defer ALL data loading to after UI renders to prevent blocking
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(Duration.zero, () async {
        // Load role and mode first - these are needed for badge count mapping
        await Future.wait([
          _loadUserRole(),
          _loadHostMode(),
          _loadAdminMode(),
        ]);
        // Now load places and notification counts
        _loadPlaces();
        _loadNotificationCounts();
        
        // Show welcome popup on first login
        _checkShowWelcome();
      });
      
      // Handle navigation with selectedTab argument or static variable
      int? tabToSet;
      
      // Check if a static tab index was set (from booking confirmation)
      if (_nextTabIndex != null) {
        tabToSet = _nextTabIndex;
        _nextTabIndex = null; // Clear it for next time
      } else {
        // Otherwise check route arguments
        final args = ModalRoute.of(context)?.settings.arguments;
        if (args is Map<String, dynamic> && args.containsKey('selectedTab')) {
          tabToSet = args['selectedTab'] as int;
        }
      }
      
      if (tabToSet != null) {
        setState(() {
          _currentIndex = tabToSet!;
        });
      }
    });
  }

  @override
  void dispose() {
    _notificationRefreshTimer?.cancel(); // Cancel the notification refresh timer
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Refresh host mode and admin mode when app is resumed
      _loadHostMode();
      _loadAdminMode();
      _loadNotificationCounts(); // Refresh notifications when app is resumed
    }
  }

  Future<void> _checkShowWelcome() async {
    try {
      // Use per-user welcome flag tied to user ID
      final userId = await StorageService.getUserId();
      if (userId == null) return;
      
      final prefs = await SharedPreferences.getInstance();
      final key = 'has_seen_welcome_$userId';
      final hasSeen = prefs.getBool(key) ?? false;
      debugPrint('[Welcome] userId=$userId, hasSeen=$hasSeen, mounted=$mounted');
      
      if (!hasSeen && mounted) {
        await prefs.setBool(key, true);
        debugPrint('[Welcome] Flag set for user $userId, showing dialog');
        if (mounted) {
          // Small delay to ensure the home screen is fully rendered
          await Future.delayed(const Duration(milliseconds: 500));
          if (mounted) _showWelcomeDialog();
        }
      }
    } catch (e) {
      debugPrint('[Welcome] Error: $e');
    }
  }

  void _showWelcomeDialog() {
    bool agreedToTerms = false;
    bool agreedToPrivacy = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final allAgreed = agreedToTerms && agreedToPrivacy;
          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.landscape_outlined, size: 56, color: Color(0xFF4A7EB3)),
                    const SizedBox(height: 16),
                    const Text(
                      'Welcome to Proper Place!',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1A1A2E)),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    _welcomeStep(Icons.search, 'Find a Proper Place',
                        'Browse unique overnight stops listed by hosts across the UK.'),
                    const SizedBox(height: 14),
                    _welcomeStep(Icons.calendar_today_outlined, 'Book Your Stay',
                        'Select your dates, confirm the booking and message your host.'),
                    const SizedBox(height: 14),
                    _welcomeStep(Icons.directions_car_outlined, 'Arrive & Enjoy',
                        'Follow the host\'s directions, check in and enjoy your stay.'),
                    const SizedBox(height: 14),
                    _welcomeStep(Icons.star_outline, 'Leave a Review',
                        'Share your experience to help the motorhome community.'),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0F7FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.lock_outline, size: 22, color: Color(0xFF4A7EB3)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text('Secure Payments',
                                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1A1A2E))),
                                SizedBox(height: 4),
                                Text(
                                  'All payments are securely processed through a third party: Stripe. Proper Place does not see or hold any of your payment information.',
                                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Terms of Service checkbox
                    _policyCheckbox(
                      value: agreedToTerms,
                      onChanged: (v) => setDialogState(() => agreedToTerms = v ?? false),
                      label: 'I agree to the ',
                      linkText: 'Terms of Service',
                      url: 'https://proper-place.co.uk/terms',
                    ),
                    const SizedBox(height: 8),
                    // Privacy Policy checkbox
                    _policyCheckbox(
                      value: agreedToPrivacy,
                      onChanged: (v) => setDialogState(() => agreedToPrivacy = v ?? false),
                      label: 'I acknowledge the ',
                      linkText: 'Privacy Policy',
                      url: 'https://proper-place.co.uk/privacy',
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: allAgreed ? () => Navigator.of(ctx).pop() : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: allAgreed ? const Color(0xFF4A7EB3) : const Color(0xFFD1D5DB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Get Started', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _policyCheckbox({
    required bool value,
    required ValueChanged<bool?> onChanged,
    required String label,
    required String linkText,
    required String url,
  }) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: value,
              onChanged: onChanged,
              activeColor: const Color(0xFF4A7EB3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: label,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                  ),
                  WidgetSpan(
                    child: GestureDetector(
                      onTap: () async {
                        final uri = Uri.parse(url);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      child: Text(
                        linkText,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF4A7EB3),
                          decoration: TextDecoration.underline,
                          decorationColor: Color(0xFF4A7EB3),
                        ),
                      ),
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

  Widget _welcomeStep(IconData icon, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF0F7FF),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 22, color: const Color(0xFF4A7EB3)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF1A1A2E))),
              const SizedBox(height: 2),
              Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _loadUserRole() async {
    try {
      final role = await Future.any([
        StorageService.getUserRole(),
        Future.delayed(const Duration(seconds: 3), () => null),
      ]);
      if (mounted) {
        setState(() {
          userRole = role ?? 'normal_user';
        });
      }
    } catch (e) {
      debugPrint('[App] Error loading role: $e');
      if (mounted) {
        setState(() {
          userRole = 'normal_user';
        });
      }
    }
  }

  Future<void> _loadHostMode() async {
    try {
      final hostMode = await Future.any([
        StorageService.getHostMode(),
        Future.delayed(const Duration(seconds: 3), () => false),
      ]);
      
      bool modeToSet = hostMode ?? false;
      if (!(hostMode ?? false) && (userRole == 'admin' || userRole == 'host')) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final hasHostModeKey = prefs.containsKey('host_mode');
          if (!hasHostModeKey) {
            modeToSet = true;
          }
        } catch (e) {
          debugPrint('Error checking SharedPreferences: $e');
        }
      }
      
      if (mounted) {
        setState(() {
          isHostMode = modeToSet;
          _currentIndex = 0;
        });
      }
    } catch (e) {
      debugPrint('[App] Error loading host mode: $e');
      if (mounted) {
        setState(() {
          isHostMode = (userRole == 'admin' || userRole == 'host') ? true : false;
          _currentIndex = 0;
        });
      }
    }
  }

  Future<void> _loadAdminMode() async {
    try {
      final adminMode = await Future.any([
        StorageService.getAdminMode(),
        Future.delayed(const Duration(seconds: 3), () => false),
      ]);
      if (mounted) {
        setState(() {
          isAdminMode = adminMode ?? false;
        });
      }
    } catch (e) {
      debugPrint('[App] Error loading admin mode: $e');
      if (mounted) {
        setState(() {
          isAdminMode = false;
        });
      }
    }
  }

  /// Load notification counts from API
  Future<void> _loadNotificationCounts() async {
    try {
      // Determine current mode to pass to backend
      String? mode;
      if (userRole == 'admin' && isAdminMode) {
        mode = 'admin';
      } else if (isHostMode) {
        mode = 'host';
      } else {
        mode = 'user';
      }
      final counts = await _notificationService.getNotificationCounts(mode: mode).timeout(
        const Duration(seconds: 5),
        onTimeout: () => <String, int>{},
      );
      
      if (!mounted) return;
      
      setState(() {
        _badgeCounts = {};
        
        // Map API counts to tab indices based on current mode
        if (userRole == 'admin' && isAdminMode) {
          // Admin mode: Dashboard (0), Approvals (1), Chat (2), More (3)
          // Don't overwrite badge while admin is viewing that tab
          if (_currentIndex != 1) {
            _badgeCounts[1] = counts['pendingApprovals'] ?? 0; // Approvals tab
          }
          if (_currentIndex != 2) {
            _badgeCounts[2] = counts['unreadMessages'] ?? 0; // Chat tab
          }
          if (_currentIndex != 3) {
            _badgeCounts[3] = counts['pendingHostApplications'] ?? 0; // More tab
          }
        } else if (isHostMode) {
          // Host mode: Dashboard (0), Sites (1), Bookings (2), Chat (3), More (4)
          // Don't overwrite bookings badge while host is viewing that tab (already marked seen)
          if (_currentIndex != 2) {
            _badgeCounts[2] = counts['pendingBookings'] ?? 0; // Bookings tab
          }
          _badgeCounts[3] = counts['unreadMessages'] ?? 0; // Chat tab
          // Don't show sites badge while host is viewing Sites tab (already marked seen)
          if (_currentIndex != 1) {
            _badgeCounts[1] = counts['siteSubmissions'] ?? 0; // Sites tab - status changes
          }
        } else {
          // User mode: Map (0), Bookings (1), Saved (2), More (3)
          _badgeCounts[1] = counts['unreadMessages'] ?? 0; // Bookings tab - unread messages (no Chat tab in user mode)
        }
      });
    } catch (error) {
      debugPrint('[HomeScreen] Error loading notification counts: $error');
      // Silently fail - notifications are not critical
    }
  }

  /// Build navigation items based on user role and host mode
  List<Map<String, dynamic>> _getNavItems() {
    // Admin mode
    if (userRole == 'admin' && isAdminMode) {
      return [
        {'icon': CupertinoIcons.house, 'label': 'Dashboard'},
        {'icon': CupertinoIcons.checkmark_shield, 'label': 'Approvals'},
        {'icon': CupertinoIcons.chat_bubble, 'label': 'Chat'},
        {'icon': CupertinoIcons.ellipsis, 'label': 'More'},
      ];
    }
    // Host mode
    if (isHostMode) {
      final placesLabel = places.length == 1 ? 'My site' : 'Sites';
      return [
        {'icon': CupertinoIcons.house, 'label': 'Dashboard'},
        {'icon': Icons.directions_bus, 'label': placesLabel},
        {'icon': CupertinoIcons.calendar, 'label': 'Bookings'},
        {'icon': CupertinoIcons.chat_bubble, 'label': 'Chat'},
        {'icon': CupertinoIcons.ellipsis, 'label': 'More'},
      ];
    }
    // User/normal mode
    return [
      {'icon': CupertinoIcons.map, 'label': 'Map'},
      {'icon': CupertinoIcons.calendar, 'label': 'Bookings'},
      {'icon': CupertinoIcons.heart, 'label': 'Saved'},
      {'icon': CupertinoIcons.ellipsis, 'label': 'More'},
    ];
  }

  /// Get navigation items based on user role and host mode (old BottomNavigationBarItem version - deprecated)
  List<BottomNavigationBarItem> _getOldNavItems() {
    // If admin user is in admin mode
    if (userRole == 'admin' && isAdminMode) {
      return const [
        BottomNavigationBarItem(
          icon: Icon(Icons.dashboard_outlined),
          activeIcon: Icon(Icons.dashboard),
          label: 'Dashboard',
          backgroundColor: Color(0xFF3B82F6),
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.shield_outlined),
          activeIcon: Icon(Icons.shield),
          label: 'Approvals',
          backgroundColor: Color(0xFF3B82F6),
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.chat_outlined),
          activeIcon: Icon(Icons.chat),
          label: 'Chat',
          backgroundColor: Color(0xFF3B82F6),
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.more_horiz),
          label: 'More',
          backgroundColor: Color(0xFF3B82F6),
        ),
      ];
    }
    // If in host mode (host user or admin user in host mode)
    if (isHostMode) {
      return [
        BottomNavigationBarItem(
          icon: const Icon(Icons.home_outlined),
          activeIcon: const Icon(Icons.home),
          label: 'Dashboard',
          backgroundColor: const Color(0xFF7BA7D8),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.people_outline),
          activeIcon: const Icon(Icons.people),
          label: 'Host Requests',
          backgroundColor: const Color(0xFF7BA7D8),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.calendar_today_outlined),
          activeIcon: const Icon(Icons.calendar_today),
          label: 'Bookings',
          backgroundColor: const Color(0xFF7BA7D8),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.chat_bubble_outline),
          activeIcon: const Icon(Icons.chat_bubble),
          label: 'Host Chat',
          backgroundColor: const Color(0xFF7BA7D8),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.more_horiz),
          activeIcon: const Icon(Icons.more_horiz),
          label: 'More',
          backgroundColor: const Color(0xFF7BA7D8),
        ),
      ];
    }
    // Normal user or host in user mode
    return const [
      BottomNavigationBarItem(
        icon: Icon(Icons.map_outlined),
        activeIcon: Icon(Icons.map),
        label: 'Map',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.event_outlined),
        activeIcon: Icon(Icons.event),
        label: 'Bookings',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.favorite_border),
        activeIcon: Icon(Icons.favorite),
        label: 'Favourites',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.more_horiz_outlined),
        activeIcon: Icon(Icons.more_horiz),
        label: 'More',
      ),
    ];
  }

  /// Get the appropriate screen for the current tab based on role and host mode
  Widget _getScreenForTab(int index) {
    debugPrint('[HomeScreen] _getScreenForTab($index) role=$userRole adminMode=$isAdminMode hostMode=$isHostMode');
    // Admin in admin mode
    if (userRole == 'admin' && isAdminMode) {
      return index == 0
          ? AdminDashboardScreen(
              onTabChanged: (tabIndex) {
                setState(() {
                  _currentIndex = tabIndex;
                });
              },
              badgeCounts: _badgeCounts,
            )
          : index == 1
              ? AdminApprovalsScreen(onRefresh: _loadNotificationCounts)
              : index == 2
                  ? AdminHostChatScreen(onRefresh: _loadNotificationCounts)
                  : const AdminMoreScreen();
    }
    // Host in host mode (or admin user in host mode)
    else if (isHostMode) {
      return index == 0
          ? DashboardScreen(
              onTabChanged: (tabIndex) {
                setState(() {
                  _currentIndex = tabIndex;
                });
              },
            )
          : index == 1
              ? const MyPlacesHostScreen()
              : index == 2
                  ? BookingsHostScreen(onRefresh: _loadNotificationCounts)
                  : index == 3
                      ? ChatHostScreen(onRefresh: _loadNotificationCounts)
                      : const MoreHostScreen();
    } else {
      // Normal user mode (or admin/host in user mode)
      return index == 0
          ? _buildPlacesView()
          : index == 1
              ? MyBookingsScreen(onRefresh: _loadNotificationCounts)
              : index == 2
                  ? const FavoritesScreen()
                  : const MoreUserScreen();
    }
  }

  /// Sample test data for development
  List<Map<String, dynamic>> _getTestPlaces() {
    return [
      {
        'id': '1',
        'name': 'Cozy Studio in London',
        'description': 'A beautiful studio apartment in central London',
        'address': '123 Oxford Street, London',
        'latitude': 51.5158,
        'longitude': -0.1280,
        'price_per_night': 75,
        'rating': 4.8,
        'image_url':
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        'image_urls': [
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
          'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
        ],
        'host_id': 'user_1',
      },
      {
        'id': '2',
        'name': 'Brighton Beach House',
        'description': 'Modern beachfront property with sea views',
        'address': '456 Marine Parade, Brighton',
        'latitude': 50.8225,
        'longitude': 0.0820,
        'price_per_night': 120,
        'rating': 4.6,
        'image_url':
            'https://images.unsplash.com/photo-1506521295845-a2da8b73490f?w=600',
        'image_urls': [
          'https://images.unsplash.com/photo-1506521295845-a2da8b73490f?w=800',
          'https://images.unsplash.com/photo-1505873242700-f289a29e7eca?w=800',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        ],
        'host_id': 'user_1',
      },
      {
        'id': '3',
        'name': 'Manchester City Apartment',
        'description': 'Spacious 2-bedroom in city center',
        'address': '789 Deansgate, Manchester',
        'latitude': 53.4808,
        'longitude': -2.2426,
        'price_per_night': 85,
        'rating': 4.5,
        'image_url':
            'https://images.unsplash.com/photo-1574643106519-3346bda99cf0?w=600',
        'image_urls': [
          'https://images.unsplash.com/photo-1574643106519-3346bda99cf0?w=800',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
          'https://images.unsplash.com/photo-1512836248287-c1954e1b7cda?w=800',
        ],
        'host_id': 'user_2',
      },
      {
        'id': '4',
        'name': 'Edinburgh Castle View',
        'description': 'Charming flat with castle views',
        'address': '321 Royal Mile, Edinburgh',
        'latitude': 55.9533,
        'longitude': -3.1896,
        'price_per_night': 95,
        'rating': 4.9,
        'image_url':
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600',
        'image_urls': [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
          'https://images.unsplash.com/photo-1577720643272-265f434b4610?w=800',
          'https://images.unsplash.com/photo-1566844537348-c63ba2a75c77?w=800',
        ],
        'host_id': 'user_2',
      },
    ];
  }

  Future<void> _loadPlaces() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConfig.properPlaceBackendUrl}/places'),
      ).timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw TimeoutException('Places API timeout'),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final placesFromApi =
            List<Map<String, dynamic>>.from(data['places'] ?? []);

        if (mounted) {
          setState(() {
            // Use API data if available, otherwise use test data
            places = placesFromApi.isNotEmpty ? placesFromApi : _getTestPlaces();
            isLoading = false;
          });
        }
      } else {
        // Use test data if API fails
        if (mounted) {
          setState(() {
            places = _getTestPlaces();
            isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading places: $e');
      if (mounted) {
        // Use test data as fallback
        setState(() {
          places = _getTestPlaces();
          isLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get filteredPlaces {
    var filtered = places;

    if (searchQuery.isNotEmpty) {
      filtered = filtered
          .where((p) =>
              (p['name'] ?? '')
                  .toLowerCase()
                  .contains(searchQuery.toLowerCase()) ||
              (p['address'] ?? '')
                  .toLowerCase()
                  .contains(searchQuery.toLowerCase()))
          .toList();
    }

    return filtered;
  }

  Widget _buildPlacesView() {
    return const MapPlacesScreen();
  }

  @override
  Widget build(BuildContext context) {
    if (userRole == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF7BA7D8)),
        ),
      );
    }

    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        appBar: null,
        backgroundColor: const Color(0xFFFAF9F6),
        body: isLoading && _currentIndex == 0
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFF7BA7D8)),
              )
            : _getScreenForTab(_currentIndex),
        bottomNavigationBar: CustomBottomNavBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
              // Immediately clear badge when tapping a tab
              if (isHostMode && index == 2) {
                _badgeCounts[2] = 0;
              }
              if (userRole == 'admin' && isAdminMode) {
                _badgeCounts[index] = 0;
              }
            });
          },
          items: _getNavItems(),
          badgeCounts: _badgeCounts,
        ),
      ),
    );
  }
}
