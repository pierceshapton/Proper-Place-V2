import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Service for managing local storage operations
/// Uses flutter_secure_storage for sensitive data (tokens, PII)
/// Uses SharedPreferences for non-sensitive preferences
class StorageService {
  // Secure storage keys (sensitive data - encrypted)
  static const String _tokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _userEmailKey = 'user_email';
  static const String _userNameKey = 'user_name';
  static const String _userRoleKey = 'user_role';
  
  // SharedPreferences keys (non-sensitive preferences)
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
  static const String _stripePayoutsEnabledKey = 'stripe_payouts_enabled';
  
  // Vehicle dimensions keys
  static const String _vehicleHeightKey = 'vehicle_height_ft';
  static const String _vehicleWidthKey = 'vehicle_width_ft';
  static const String _vehicleLengthKey = 'vehicle_length_ft';
  static const String _vehicleUnitKey = 'vehicle_unit'; // 'ft' or 'm'
  static const String _sizeFilterEnabledKey = 'size_filter_enabled';
  
  // Welcome popup key
  static const String _hasSeenWelcomeKey = 'has_seen_welcome';

  // Onboarding keys
  static const String _userBioKey = 'user_bio';
  static const String _vanPhotoPathKey = 'van_photo_path';
  static const String _hostPhoneKey = 'host_phone';
  static const String _hostAddressKey = 'host_address';
  static const String _hostLatKey = 'host_address_lat';
  static const String _hostLngKey = 'host_address_lng';

  // Remember Me keys
  static const String _rememberMeKey = 'remember_me';
  static const String _rememberedEmailKey = 'remembered_email';

  // Secure storage instance for sensitive data (encrypted)
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Whether Keychain is available (false on simulators without entitlements)
  static bool _keychainAvailable = true;

  // Fallback prefix for secure keys stored in SharedPreferences
  static const String _fallbackPrefix = '_sec_';

  /// Write to secure storage with SharedPreferences fallback
  static Future<void> _secureWrite(String key, String value) async {
    if (_keychainAvailable) {
      try {
        await _secureStorage.write(key: key, value: value);
        return;
      } catch (_) {
        _keychainAvailable = false;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_fallbackPrefix$key', value);
  }

  /// Read from secure storage with SharedPreferences fallback
  static Future<String?> _secureRead(String key) async {
    if (_keychainAvailable) {
      try {
        return await _secureStorage.read(key: key);
      } catch (_) {
        _keychainAvailable = false;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('$_fallbackPrefix$key');
  }

  /// Delete from secure storage with SharedPreferences fallback
  static Future<void> _secureDelete(String key) async {
    if (_keychainAvailable) {
      try {
        await _secureStorage.delete(key: key);
        return;
      } catch (_) {
        _keychainAvailable = false;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_fallbackPrefix$key');
  }

  /// Delete all secure storage with SharedPreferences fallback
  static Future<void> _secureDeleteAll() async {
    if (_keychainAvailable) {
      try {
        await _secureStorage.deleteAll();
        return;
      } catch (_) {
        _keychainAvailable = false;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_fallbackPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }

  // In-memory cache to avoid repeated disk reads
  static String? _cachedToken;

  /// Save authentication token (ENCRYPTED)
  static Future<void> saveToken(String token) async {
    await _secureWrite(_tokenKey, token);
    _cachedToken = token; // Update cache
  }

  /// Load authentication token (with in-memory caching) (ENCRYPTED)
  static Future<String?> getToken() async {
    // Return cached token if available
    if (_cachedToken != null) {
      return _cachedToken;
    }
    _cachedToken = await _secureRead(_tokenKey);
    return _cachedToken;
  }
  
  /// Clear the token cache (call on logout)
  static void clearTokenCache() {
    _cachedToken = null;
  }

  /// Save refresh token (ENCRYPTED)
  static Future<void> saveRefreshToken(String token) async {
    await _secureWrite(_refreshTokenKey, token);
  }

  /// Load refresh token (ENCRYPTED)
  static Future<String?> getRefreshToken() async {
    return await _secureRead(_refreshTokenKey);
  }

  /// Save user ID (ENCRYPTED)
  static Future<void> saveUserId(String userId) async {
    await _secureWrite(_userIdKey, userId);
  }

  /// Load user ID (ENCRYPTED)
  static Future<String?> getUserId() async {
    return await _secureRead(_userIdKey);
  }

  /// Save user email (ENCRYPTED)
  static Future<void> saveUserEmail(String email) async {
    await _secureWrite(_userEmailKey, email);
  }

  /// Load user email (ENCRYPTED)
  static Future<String?> getUserEmail() async {
    return await _secureRead(_userEmailKey);
  }

  /// Save user name (ENCRYPTED)
  static Future<void> saveUserName(String name) async {
    await _secureWrite(_userNameKey, name);
  }

  /// Load user name (ENCRYPTED)
  static Future<String?> getUserName() async {
    return await _secureRead(_userNameKey);
  }

  /// Save user role (ENCRYPTED)
  static Future<void> saveUserRole(String role) async {
    await _secureWrite(_userRoleKey, role);
  }

  /// Load user role (ENCRYPTED)
  static Future<String?> getUserRole() async {
    return await _secureRead(_userRoleKey);
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
    // Clear secure storage (sensitive data)
    await _secureDeleteAll();
    // Clear SharedPreferences (non-sensitive data)
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _cachedToken = null; // Clear in-memory cache
  }

  /// Clear user data for logout (keeps preferences)
  static Future<void> clearUserData() async {
    // Clear secure storage (sensitive user data)
    await _secureDelete(_tokenKey);
    await _secureDelete(_refreshTokenKey);
    await _secureDelete(_userIdKey);
    await _secureDelete(_userEmailKey);
    await _secureDelete(_userNameKey);
    await _secureDelete(_userRoleKey);
    // Clear mode preferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_hostModeKey);
    await prefs.remove(_adminModeKey);
    await prefs.remove(_hasSeenWelcomeKey);
    await prefs.remove('favorite_places');
    await prefs.remove(_mapLatKey);
    await prefs.remove(_mapLngKey);
    await prefs.remove(_mapZoomKey);
    // Clear onboarding flags so fresh signup shows the popup again
    await prefs.remove('onboarding_done_global');
    // Also clear per-user flag if userId was stored
    final keys = prefs.getKeys();
    for (final key in keys) {
      if (key.startsWith('onboarding_done_')) {
        await prefs.remove(key);
      }
    }
    _cachedToken = null; // Clear in-memory cache
  }

  /// Check if user is authenticated
  static Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // ===== Remember Me =====

  /// Save remember me preference and email
  static Future<void> setRememberMe(bool remember, {String? email}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_rememberMeKey, remember);
    if (remember && email != null) {
      await prefs.setString(_rememberedEmailKey, email);
    } else if (!remember) {
      await prefs.remove(_rememberedEmailKey);
    }
  }

  /// Get remember me preference
  static Future<bool> getRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_rememberMeKey) ?? false;
  }

  /// Get remembered email
  static Future<String?> getRememberedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_rememberedEmailKey);
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
    final lat = prefs.getDouble(_mapLatKey) ?? 54.8; // Default to UK center
    final lng = prefs.getDouble(_mapLngKey) ?? -2.8;
    final zoom = prefs.getDouble(_mapZoomKey) ?? 5.7;
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

  // ===== Stripe Payout Status =====

  static Future<void> setStripePayoutsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_stripePayoutsEnabledKey, enabled);
  }

  static Future<bool> getStripePayoutsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_stripePayoutsEnabledKey) ?? false;
  }

  // ===== Vehicle Dimensions =====

  /// Save vehicle height in feet
  static Future<void> setVehicleHeight(double height) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_vehicleHeightKey, height);
  }

  /// Get vehicle height in feet (null if not set)
  static Future<double?> getVehicleHeight() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_vehicleHeightKey);
  }

  /// Save vehicle width in feet
  static Future<void> setVehicleWidth(double width) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_vehicleWidthKey, width);
  }

  /// Get vehicle width in feet (null if not set)
  static Future<double?> getVehicleWidth() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_vehicleWidthKey);
  }

  /// Save vehicle length in feet
  static Future<void> setVehicleLength(double length) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_vehicleLengthKey, length);
  }

  /// Get vehicle length in feet (null if not set)
  static Future<double?> getVehicleLength() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getDouble(_vehicleLengthKey);
  }

  /// Save vehicle unit preference ('ft' or 'm')
  static Future<void> setVehicleUnit(String unit) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_vehicleUnitKey, unit);
  }

  /// Get vehicle unit preference (default 'ft')
  static Future<String> getVehicleUnit() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_vehicleUnitKey) ?? 'ft';
  }

  /// Set size filter enabled
  static Future<void> setSizeFilterEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sizeFilterEnabledKey, enabled);
  }

  /// Get size filter enabled
  static Future<bool> getSizeFilterEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_sizeFilterEnabledKey) ?? false;
  }

  /// Get all vehicle dimensions at once
  static Future<Map<String, dynamic>> getVehicleDimensions() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'height': prefs.getDouble(_vehicleHeightKey),
      'width': prefs.getDouble(_vehicleWidthKey),
      'length': prefs.getDouble(_vehicleLengthKey),
      'unit': prefs.getString(_vehicleUnitKey) ?? 'ft',
      'filterEnabled': prefs.getBool(_sizeFilterEnabledKey) ?? false,
    };
  }

  /// Save all vehicle dimensions at once
  static Future<void> saveVehicleDimensions({
    required double height,
    required double width,
    required double length,
    required String unit,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_vehicleHeightKey, height);
    await prefs.setDouble(_vehicleWidthKey, width);
    await prefs.setDouble(_vehicleLengthKey, length);
    await prefs.setString(_vehicleUnitKey, unit);
  }

  // Welcome popup
  static Future<bool> hasSeenWelcome() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hasSeenWelcomeKey) ?? false;
  }

  static Future<void> setHasSeenWelcome(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hasSeenWelcomeKey, value);
  }

  // ===== First-login onboarding =====

  /// Returns true if onboarding has already been completed.
  /// Pass [userId] to use a per-user flag; pass null to use a device-wide
  /// fallback flag (used when the user_id isn't available locally yet).
  static Future<bool> hasCompletedOnboarding([String? userId]) async {
    final prefs = await SharedPreferences.getInstance();
    final perUserDone = userId == null
        ? false
        : (prefs.getBool('onboarding_done_$userId') ?? false);
    final globalDone = prefs.getBool('onboarding_done_global') ?? false;
    return perUserDone || globalDone;
  }

  /// Mark onboarding as done so it never shows again.
  /// Sets both the per-user flag (when [userId] is provided) and a
  /// device-wide flag so we never show the popup twice on the same device.
  static Future<void> setOnboardingCompleted([String? userId]) async {
    final prefs = await SharedPreferences.getInstance();
    if (userId != null) {
      await prefs.setBool('onboarding_done_$userId', true);
    }
    await prefs.setBool('onboarding_done_global', true);
  }

  /// Save user bio text.
  static Future<void> saveUserBio(String bio) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userBioKey, bio);
  }

  static Future<String?> getUserBio() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userBioKey);
  }

  /// Save van profile photo local path.
  static Future<void> saveVanPhotoPath(String path) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_vanPhotoPathKey, path);
  }

  static Future<String?> getVanPhotoPath() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_vanPhotoPathKey);
  }

  /// Save host phone number.
  static Future<void> saveHostPhone(String phone) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_hostPhoneKey, phone);
  }

  static Future<String?> getHostPhone() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_hostPhoneKey);
  }

  /// Save host address with coordinates.
  static Future<void> saveHostAddress({
    required String address,
    double? lat,
    double? lng,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_hostAddressKey, address);
    if (lat != null) await prefs.setDouble(_hostLatKey, lat);
    if (lng != null) await prefs.setDouble(_hostLngKey, lng);
  }

  static Future<Map<String, dynamic>> getHostAddress() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'address': prefs.getString(_hostAddressKey),
      'lat': prefs.getDouble(_hostLatKey),
      'lng': prefs.getDouble(_hostLngKey),
    };
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
