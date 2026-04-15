/// App configuration
/// Loads from environment variables or defaults
library;

import 'package:flutter/foundation.dart';

class AppConfig {
  static const String properPlaceAppId = String.fromEnvironment(
    'PROPER_PLACE_APP_ID',
    defaultValue: 'com.properplace.ios',
  );

  // Use production DigitalOcean backend
  static const String properPlaceBackendUrl = String.fromEnvironment(
    'PROPER_PLACE_BACKEND_URL',
    defaultValue: 'https://octopus-app-lxh2t.ondigitalocean.app',
  );

  // Aliases for backward compatibility with base44_client.dart
  static String get base44AppId => properPlaceAppId;
  static String get base44BackendUrl => properPlaceBackendUrl;
}
