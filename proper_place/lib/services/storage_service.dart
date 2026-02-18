import 'package:shared_preferences/shared_preferences.dart';

/// Service for managing local storage operations
class StorageService {
  static const String _tokenKey = 'access_token';
  static const String _userIdKey = 'user_id';
  static const String _userEmailKey = 'user_email';
  static const String _userNameKey = 'user_name';
  static const String _userRoleKey = 'user_role';
  static const String _hostModeKey = 'host_mode';
  static const String _adminModeKey = 'admin_mode';
  static const String _offlineModeKey = 'offline_mode';
  static const String _cachedPlacesKey = 'cached_places';
  static const String _cachedBookingsKey = 'cached_bookings';
  static const String _mapLatKey = 'map_last_lat';
  static const String _mapLngKey = 'map_last_lng';
  static const String _mapZoomKey = 'map_last_zoom';
  static const String _hostApplicationStatusKey = 'host_application_status';
  static const String _hasUnreadNotificationsKey = 'has_unread_notifications';

  // In-memory cache to avoid repeated disk reads
  static String? _cachedToken;

  /// Save authentication token
  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    _cachedToken = token; // Update cache
  }

  /// Load authentication token (with in-memory caching)
  static Future<String?> getToken() async {
    // Return cached token if available
    if (_cachedToken != null) {
      return _cachedToken;
    }
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey);
    return _cachedToken;
  }
  
  /// Clear the token cache (call on logout)
  static void clearTokenCache() {
    _cachedToken = null;
  }

  /// Save user ID
  static Future<void> saveUserId(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userIdKey, userId);
  }

  /// Load user ID
  static Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userIdKey);
  }

  /// Save user email
  static Future<void> saveUserEmail(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userEmailKey, email);
  }

  /// Load user email
  static Future<String?> getUserEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userEmailKey);
  }

  /// Save user name
  static Future<void> saveUserName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userNameKey, name);
  }

  /// Load user name
  static Future<String?> getUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userNameKey);
  }

  /// Save user role
  static Future<void> saveUserRole(String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userRoleKey, role);
  }

  /// Load user role
  static Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userRoleKey);
  }

  /// Set host mode (for hosts to switch between user and host view)
  static Future<void> setHostMode(bool isHostMode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hostModeKey, isHostMode);
  }

  /// Get host mode
  static Future<bool> getHostMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hostModeKey) ?? false;
  }

  /// Set admin mode (for admins to switch between user and admin view)
  static Future<void> setAdminMode(bool isAdminMode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_adminModeKey, isAdminMode);
  }

  /// Get admin mode
  static Future<bool> getAdminMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_adminModeKey) ?? true; // Default to true for admins
  }

  /// Clear all stored data (logout)
  static Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _cachedToken = null; // Clear in-memory cache
  }

  /// Clear user data for logout (keeps preferences)
  static Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userIdKey);
    await prefs.remove(_userEmailKey);
    await prefs.remove(_userNameKey);
    await prefs.remove(_userRoleKey);
    await prefs.remove(_hostModeKey);
    await prefs.remove(_adminModeKey);
    _cachedToken = null; // Clear in-memory cache
  }

  /// Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Set offline mode
  static Future<void> setOfflineMode(bool isOffline) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_offlineModeKey, isOffline);
  }

  /// Get offline mode
  static Future<bool> getOfflineMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_offlineModeKey) ?? false;
  }

  /// Cache places data (as JSON string)
  static Future<void> cachePlaces(String placesJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cachedPlacesKey, placesJson);
  }

  /// Get cached places (returns JSON string)
  static Future<String?> getCachedPlaces() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_cachedPlacesKey);
  }

  /// Cache bookings data (as JSON string)
  static Future<void> cacheBookings(String bookingsJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_cachedBookingsKey, bookingsJson);
  }

  /// Get cached bookings (returns JSON string)
  static Future<String?> getCachedBookings() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_cachedBookingsKey);
  }

  /// Cache map location (latitude, longitude, zoom)
  static Future<void> cacheMapLocation({
    required double latitude,
    required double longitude,
    required double zoom,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_mapLatKey, latitude);
    await prefs.setDouble(_mapLngKey, longitude);
    await prefs.setDouble(_mapZoomKey, zoom);
  }

  /// Get cached map location
  static Future<Map<String, double>> getCachedMapLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final lat = prefs.getDouble(_mapLatKey) ?? 54.5; // Default to UK center
    final lng = prefs.getDouble(_mapLngKey) ?? -3.5;
    final zoom = prefs.getDouble(_mapZoomKey) ?? 6.0;
    return {'latitude': lat, 'longitude': lng, 'zoom': zoom};
  }

  /// Save host application status ('pending', 'approved', 'rejected', or null)
  static Future<void> setHostApplicationStatus(String? status) async {
    final prefs = await SharedPreferences.getInstance();
    if (status == null) {
      await prefs.remove(_hostApplicationStatusKey);
    } else {
      await prefs.setString(_hostApplicationStatusKey, status);
    }
  }

  /// Get host application status
  static Future<String?> getHostApplicationStatus() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_hostApplicationStatusKey);
  }

  /// Set unread notifications flag
  static Future<void> setHasUnreadNotifications(bool hasUnread) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hasUnreadNotificationsKey, hasUnread);
  }

  /// Get unread notifications flag
  static Future<bool> getHasUnreadNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hasUnreadNotificationsKey) ?? false;
  }

  /// Generic method to save a string value
  static Future<void> saveString(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  /// Generic method to retrieve a string value
  static Future<String?> getString(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  /// Generic method to remove a string value
  static Future<void> removeString(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}
