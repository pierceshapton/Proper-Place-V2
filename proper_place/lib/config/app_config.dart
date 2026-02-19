/// App configuration
/// Loads from environment variables or defaults
library;

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

  // For debugging
  static void printConfig() {
    print('=== App Config ===');
    print('App ID: $properPlaceAppId');
    print('Backend URL: $properPlaceBackendUrl');
  }
}
