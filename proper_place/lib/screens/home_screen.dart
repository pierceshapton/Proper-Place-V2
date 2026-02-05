import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:proper_place/services/storage_service.dart';
import 'map_places_screen_new.dart';
import 'my_bookings_screen.dart';
import 'favorites_screen.dart';
import 'more_user_screen.dart';
import 'dashboard_screen.dart';
import 'my_places_host_screen.dart';
import 'bookings_host_screen.dart';
import 'reviews_host_screen.dart';
import 'more_host_screen.dart';
import 'admin_dashboard_screen.dart';
import 'admin_host_requests_screen.dart';
import 'admin_approvals_screen.dart';
import 'admin_host_chat_screen.dart';
import 'admin_more_screen.dart';

/// Reusable custom bottom navigation bar widget
class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final List<Map<String, dynamic>> items; // {icon: IconData, label: String}

  const CustomBottomNavBar({
    Key? key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 12, bottom: 10, left: 8, right: 8),
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
  ) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF9CA3AF),
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
  
  /// Call this to set the tab index for the next time HomeScreen appears
  static void setNextTab(int tabIndex) {
    _nextTabIndex = tabIndex;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadUserRole();
    _loadHostMode();
    _loadAdminMode();
    _loadPlaces();
    
    // Handle navigation with selectedTab argument or static variable
    WidgetsBinding.instance.addPostFrameCallback((_) {
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
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Refresh host mode and admin mode when app is resumed
      _loadHostMode();
      _loadAdminMode();
    }
  }

  Future<void> _loadUserRole() async {
    try {
      final role = await StorageService.getUserRole();
      print('[App] Loaded role from storage: $role');
      setState(() {
        userRole = role ?? 'normal_user'; // Default to normal_user
        // Host mode will be loaded separately by _loadHostMode()
        // Don't override it here, let the storage preference take precedence
      });
    } catch (e) {
      print('[App] Error loading role: $e');
      setState(() {
        userRole = 'normal_user';
      });
    }
  }

  Future<void> _loadHostMode() async {
    try {
      final hostMode = await StorageService.getHostMode();
      // For admin/host users without a saved preference, default to true
      bool modeToSet = hostMode;
      if (!hostMode && (userRole == 'admin' || userRole == 'host')) {
        // Check if this is the first load (no preference set) vs deliberate false
        final prefs = await SharedPreferences.getInstance();
        final hasHostModeKey = prefs.containsKey('host_mode');
        if (!hasHostModeKey) {
          modeToSet = true; // First load for admin/host: default to true
        }
      }
      setState(() {
        isHostMode = modeToSet;
        _currentIndex = 0; // Reset to first tab when mode changes
      });
    } catch (e) {
      // On error, set sensible defaults
      setState(() {
        isHostMode = (userRole == 'admin' || userRole == 'host') ? true : false;
        _currentIndex = 0; // Reset to first tab when mode changes
      });
    }
  }

  Future<void> _loadAdminMode() async {
    try {
      final adminMode = await StorageService.getAdminMode();
      setState(() {
        isAdminMode = adminMode;
      });
    } catch (e) {
      setState(() {
        isAdminMode = false;
      });
    }
  }

  /// Build navigation items based on user role and host mode
  List<Map<String, dynamic>> _getNavItems() {
    // Admin mode
    if (userRole == 'admin' && isAdminMode) {
      return [
        {'icon': CupertinoIcons.house, 'label': 'Dashboard'},
        {'icon': CupertinoIcons.person_2, 'label': 'Requests'},
        {'icon': CupertinoIcons.checkmark_shield, 'label': 'Approvals'},
        {'icon': CupertinoIcons.chat_bubble, 'label': 'Chat'},
        {'icon': CupertinoIcons.ellipsis, 'label': 'More'},
      ];
    }
    // Host mode
    if (isHostMode) {
      return [
        {'icon': CupertinoIcons.house, 'label': 'Dashboard'},
        {'icon': CupertinoIcons.person_2, 'label': 'Requests'},
        {'icon': CupertinoIcons.checkmark_shield, 'label': 'Approvals'},
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
          icon: Icon(Icons.people_outline),
          activeIcon: Icon(Icons.people),
          label: 'Host Requests',
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
          label: 'Host Chat',
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
          icon: const Icon(Icons.shield_outlined),
          activeIcon: const Icon(Icons.shield),
          label: 'Approvals',
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
    // Admin in admin mode
    if (userRole == 'admin' && isAdminMode) {
      return index == 0
          ? const AdminDashboardScreen()
          : index == 1
              ? const AdminHostRequestsScreen()
              : index == 2
                  ? const AdminApprovalsScreen()
                  : index == 3
                      ? const AdminHostChatScreen()
                      : const AdminMoreScreen();
    }
    // Host in host mode (or admin user in host mode)
    else if (isHostMode) {
      return index == 0
          ? DashboardScreen(
              onTabChanged: (tabIndex) {
                // Handle dashboard tab changes
              },
            )
          : index == 1
              ? const MyPlacesHostScreen()
              : index == 2
                  ? const BookingsHostScreen()
                  : index == 3
                      ? const ReviewsHostScreen()
                      : const MoreHostScreen();
    } else {
      // Normal user mode (or admin/host in user mode)
      return index == 0
          ? _buildPlacesView()
          : index == 1
              ? const MyBookingsScreen()
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
        Uri.parse('http://localhost:3001/places'),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final placesFromApi =
            List<Map<String, dynamic>>.from(data['places'] ?? []);

        setState(() {
          // Use API data if available, otherwise use test data
          places = placesFromApi.isNotEmpty ? placesFromApi : _getTestPlaces();
          isLoading = false;
        });
      } else {
        // Use test data if API fails
        setState(() {
          places = _getTestPlaces();
          isLoading = false;
        });
      }
    } catch (e) {
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
            });
          },
          items: _getNavItems(),
        ),
      ),
    );
  }
}
