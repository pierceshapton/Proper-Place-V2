## Setup Guide: Proper Place Flutter App with Base44 Integration

### Project Structure Rebuilt ✅
The Flutter app has been completely rebuilt from your React Base44 app pattern:

- **`lib/config/app_config.dart`** — Environment configuration (mirrors React's `app-params.js`)
- **`lib/api/base44_client.dart`** — Base44 HTTP client with auth (mirrors React's `base44Client.js`)
- **`lib/auth/auth_provider.dart`** — Abstract auth provider with Base44 implementation
- **`lib/screens/`** — Screens: Welcome (login/signup buttons) → Login → Map (home)

### Configuration Required

You need to set Base44 environment variables before running the app:

#### Option 1: Using `.env` file (Recommended for Development)
1. Create `.env` file in project root:
   ```
   BASE44_APP_ID=your-base44-app-id
   BASE44_BACKEND_URL=https://your-base44-backend-url.com
   ```

2. Install `flutter_dotenv` package:
   ```bash
   cd /Users/PierceShaton/Desktop/Proper_Place_app/proper_place
   flutter pub add flutter_dotenv
   ```

3. Update `lib/config/app_config.dart` to load from `.env`:
   ```dart
   import 'package:flutter_dotenv/flutter_dotenv.dart';
   
   class AppConfig {
     static String get base44AppId => dotenv.env['BASE44_APP_ID'] ?? 'your-base44-app-id';
     static String get base44BackendUrl => dotenv.env['BASE44_BACKEND_URL'] ?? 'https://api.base44.com';
     // ... rest of class
   }
   ```

4. Update `lib/main.dart` to load `.env`:
   ```dart
   Future<void> main() async {
     await dotenv.load(fileName: '.env');
     AppConfig.printConfig();
     runApp(const MyApp());
   }
   ```

#### Option 2: Using Build Flags (For Production)
```bash
flutter run \
  --dart-define=BASE44_APP_ID=your-app-id \
  --dart-define=BASE44_BACKEND_URL=https://your-backend.com
```

### Authentication Flow

The app follows your React pattern:

1. **Welcome Screen** → Shows logo, slogan, "Log In" & "Sign Up" buttons
2. **Login Screen** → Email & password form, calls `base44.login()`
3. **Signup Screen** → Name, email, password form, calls `base44.signup()`
4. **Map Screen** → Home view after auth, shows current user, logout button

### Testing the Auth Flow

```bash
# Build and run on iOS simulator
cd /Users/PierceShaton/Desktop/Proper_Place_app/proper_place
flutter run -d iPhone

# Or run on connected Android device
flutter run -d emulator-5554
```

### API Endpoints Expected from Backend

The client expects these Base44 endpoints:

- `POST /auth/login` → `{ email, password }` → `{ access_token, ... }`
- `POST /auth/signup` → `{ email, password, name }` → `{ access_token, ... }`
- `GET /auth/me` → Returns current user
- `POST /auth/logout` → Clears session
- `POST /auth/refresh` → `{ refresh_token }` → `{ access_token }`

### Next Steps

1. **Get Base44 Credentials** — Contact your Base44 admin for:
   - App ID
   - Backend URL
   - Test user credentials

2. **Add Secure Token Storage** (Optional but Recommended):
   ```bash
   flutter pub add flutter_secure_storage
   ```
   Then update `lib/api/base44_client.dart` to persist token in secure storage instead of memory.

3. **Add Map Implementation** — Replace placeholder in `lib/screens/map_screen.dart` with:
   - `google_maps_flutter` or `flutter_map` (Leaflet)
   - Load places from Base44 API
   - Show user location and nearby properties

4. **Error Handling** — Current errors show in red boxes; consider:
   - Toast notifications (add `fluttertoast` package)
   - Better UX for common errors (network timeout, invalid credentials, etc.)

### Debugging

Print config on startup:
```bash
# Check app-params output in console
flutter run -v 2>&1 | grep "App Config"
```

### Folder Structure

```
lib/
├── api/
│   └── base44_client.dart      # HTTP client & auth
├── config/
│   └── app_config.dart         # Environment vars
├── auth/
│   └── auth_provider.dart      # Auth interface & Base44 impl
├── screens/
│   ├── welcome_screen.dart     # Entry point
│   ├── login_screen.dart       # Email/password login
│   ├── signup_screen.dart      # Registration
│   └── map_screen.dart         # Home (authenticated)
└── main.dart                   # App entry & routing
```

### Important Notes

- **Token Storage**: Currently stored in memory. Add `flutter_secure_storage` for persistence across app restarts.
- **Environment Variables**: Copy your Base44 credentials from `Proper_Place_Base44_Version_1` (React app environment setup).
- **Backend URL**: Should match your React app's `VITE_BASE44_BACKEND_URL`.
- **iOS Simulator**: May have RTIInputSystemClient warnings (harmless, iOS text input system issue).

---

**Once configured**, the Flutter app will:
1. ✅ Display welcome screen with background image
2. ✅ Allow login/signup with Base44 credentials
3. ✅ Store access token after auth
4. ✅ Show authenticated user on map screen
5. ✅ Allow logout and return to welcome
