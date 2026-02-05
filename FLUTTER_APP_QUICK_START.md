# Flutter App - Quick Start Guide

**Status:** ✅ Ready to run  
**Backend:** ✅ Running on port 3001  
**Last Updated:** January 22, 2026

---

## What's Been Done

Your Flutter app now has **4 fully redesigned screens** matching your web app:

✅ **Welcome Screen** - Logo, background, login/signup buttons  
✅ **Login Screen** - Beautiful gradient background with form  
✅ **Signup Screen** - Full registration with validation  
✅ **Home Screen** - Place listings with search and filters  

All screens connect directly to your backend API at `http://localhost:3001`

---

## How to Run

### Step 1: Make sure backend is running
```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/backend
node src/server.js
```

**Expected output:**
```
Server running on port 3001
Database connected
```

### Step 2: Run Flutter app
```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/proper_place
flutter run -d chrome
```

**Or if you have Android emulator:**
```bash
flutter run -d android
```

**Or on iPhone simulator (macOS only):**
```bash
flutter run -d ios
```

---

## Test the App Flow

### 1. Welcome Screen (starts here)
- See your app logo and background image
- Tap "Sign Up" button

### 2. Signup Page
- Enter: Name, Email, Password (8+ chars), Confirm Password
- Click "Sign Up"
- Should navigate to Home screen

### 3. Home Screen
- See a list of places (empty at first, add seed data to see places)
- Search box works
- Filter chips are clickable
- Each place card shows image, price, rating, location

### 4. Try Login
- Back to Welcome, tap "Log In"
- Enter email and password from signup
- Should navigate to Home screen

---

## API Endpoints Tested

✅ Health Check: `http://localhost:3001/health`  
✅ Login: `POST /auth/login`  
✅ Signup: `POST /auth/signup`  
✅ Places List: `GET /places`  

---

## What to Do Next

### Short Term (Today)
1. **Add seed data** to see places in the app:
   ```bash
   curl -X POST http://localhost:3001/places \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Mountain Cabin",
       "address": "123 Main St, Scotland",
       "description": "Beautiful mountain cabin",
       "price_per_night": 150,
       "rating": 4.5,
       "image_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600"
     }'
   ```

2. **Test user flows:**
   - Create account via signup
   - Login with that account
   - Search for places
   - See place cards with proper formatting

### Medium Term (This Week)
- [ ] Store JWT token securely (SharedPreferences)
- [ ] Add token to API requests
- [ ] Create PlaceDetailScreen
- [ ] Add booking creation flow
- [ ] Create MyBookingsScreen
- [ ] Add review functionality

### Long Term (Next Week)
- [ ] Add maps integration
- [ ] Implement offline caching
- [ ] Add push notifications
- [ ] Create host dashboard
- [ ] Payment processing

---

## Files Changed

**Main files updated:**
- `lib/main.dart` - Fixed routing and theme
- `lib/screens/welcome_screen.dart` - Complete redesign
- `lib/screens/login_screen.dart` - API integration
- `lib/screens/signup_screen.dart` - API integration  
- `lib/screens/home_screen.dart` - Places list UI

**New documentation files:**
- `FLUTTER_SCREENS_GUIDE.md` - Detailed screen documentation
- `FLUTTER_APP_QUICK_START.md` - This file

---

## Troubleshooting

### App doesn't connect to backend
**Error:** "Connection error: Failed host lookup"  
**Solution:** 
1. Check backend is running: `curl http://localhost:3001/health`
2. On physical device, use machine IP instead of localhost
3. Check firewall settings

### App crashes when running
**Solution:**
```bash
flutter clean
flutter pub get
flutter run -v
```

### Signup fails with "email already exists"
**Solution:**
1. That email was already registered
2. Use a different email
3. Or delete user from database:
   ```bash
   psql -U postgres -d proper_place -c "DELETE FROM users WHERE email='test@example.com';"
   ```

### Can't see any places in home screen
**Solution:**
1. Add seed data (see curl command above)
2. Check backend places endpoint: `curl http://localhost:3001/places`
3. Make sure places have `image_url` field

### Input fields not working
**Solution:**
- On Chrome: Use keyboard, not onscreen keyboard
- On mobile: Tap field, then tap outside to focus
- On iOS: May need to dismiss keyboard with button

---

## Colors & Design

Your app uses these colors (matching web app):

| Element | Color | Code |
|---------|-------|------|
| Buttons & AppBar | Light Blue | `#7BA7D8` |
| Gradient | Dark Blue | `#6B96C8` |
| Stars/Accent | Gold | `#FFB800` |
| Text | Dark Gray | `#333333` |
| Borders | Light Gray | `#E0E0E0` |

---

## Backend Configuration

Your backend is configured at:

**Base URL:** `http://localhost:3001`  
**API Documentation:** See `API_DOCUMENTATION.md`  
**Database:** PostgreSQL on localhost:5432  
**Database Name:** `proper_place`  

---

## Authentication

### How it works:
1. User enters email/password on Login/Signup
2. App sends request to backend
3. Backend returns JWT token + user info
4. **TODO:** App saves token (needs SharedPreferences)
5. **TODO:** Token added to future requests
6. **TODO:** Token refreshed before expiry

### Current Status:
- ✅ Login/Signup endpoints working
- ✅ Backend returns tokens
- ❌ Token storage not yet implemented
- ❌ Token refresh not yet implemented

**Next:** Implement token storage + refresh logic

---

## Performance Tips

### Reduce app startup time:
```bash
flutter run --release -d chrome
```

### View debug output:
```bash
flutter run -v  # Verbose logging
```

### Profile app performance:
```bash
flutter run --profile
```

---

## Device Testing

### Chrome Web (Easiest)
```bash
flutter run -d chrome
# Press 'R' to hot reload
# Press 'Q' to quit
```

### Android Emulator
```bash
# Start emulator first (from Android Studio)
flutter devices  # List available devices
flutter run -d emulator-5554
```

### iOS Simulator (macOS only)
```bash
open -a Simulator
flutter run -d ios
```

### Physical Device
```bash
flutter run  # Connects to first available device
```

---

## Next: Add More Screens

Ready to add more screens? Here's the template:

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NewScreen extends StatefulWidget {
  const NewScreen({Key? key}) : super(key: key);

  @override
  State<NewScreen> createState() => _NewScreenState();
}

class _NewScreenState extends State<NewScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Screen Title'),
        backgroundColor: const Color(0xFF7BA7D8),
      ),
      body: Center(
        child: const Text('Your content here'),
      ),
    );
  }
}
```

Then add to `main.dart` routes:
```dart
'/new-screen': (context) => const NewScreen(),
```

---

## Resources

📄 **Full Screen Documentation:** `FLUTTER_SCREENS_GUIDE.md`  
📄 **API Documentation:** `API_DOCUMENTATION.md`  
📄 **Backend Status:** `BACKEND_STATUS.md`  
📄 **Development Summary:** `DEVELOPMENT_SUMMARY.md`  

---

## Need Help?

1. **Check the documentation files** - They have detailed info
2. **Check backend logs** - Run backend with verbose output
3. **Check frontend logs** - Run app with `flutter run -v`
4. **Test API directly** - Use curl commands (see API_DOCUMENTATION.md)

---

**Backend Status:** ✅ Running  
**Flutter App:** ✅ Ready  
**Ready to build:** ✅ Yes!

Start with: `flutter run -d chrome` 🚀
