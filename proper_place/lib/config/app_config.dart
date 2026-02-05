/// App configuration matching React's app-params.js pattern
/// Loads from environment variables (via flutter_app_secrets) or defaults
library;

class AppConfig {
  static const String base44AppId = String.fromEnvironment(
    'BASE44_APP_ID',
    defaultValue: 'your-base44-app-id',
  );

  static const String base44BackendUrl = String.fromEnvironment(
    'BASE44_BACKEND_URL',
    defaultValue: 'http://localhost:3001',
  );

  // For debugging
  static void printConfig() {
    print('=== App Config ===');
    print('App ID: $base44AppId');
    print('Backend URL: $base44BackendUrl');
  }
}
