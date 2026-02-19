/// App configuration
/// Loads from environment variables or defaults
library;

class AppConfig {
  static const String properPlaceAppId = String.fromEnvironment(
    'PROPER_PLACE_APP_ID',
    defaultValue: 'com.properplace.ios',
  );

  // Use localhost for iOS simulator testing, DigitalOcean for production
  // Note: iOS simulator uses localhost, not 10.0.2.2 (which is for Android emulator)
  static const String properPlaceBackendUrl = String.fromEnvironment(
    'PROPER_PLACE_BACKEND_URL',
    defaultValue: 'https://octopus-app-lxh2t.ondigitalocean.app',  // Changed for local testing
  );
  
  // Production URL for reference:
  // defaultValue: 'https://octopus-app-lxh2t.ondigitalocean.app',

  // For debugging
  static void printConfig() {
    print('=== App Config ===');
    print('App ID: $properPlaceAppId');
    print('Backend URL: $properPlaceBackendUrl');
  }
}
