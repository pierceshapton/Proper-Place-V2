# Flutter App Screens - Updated with Web Design

**Date:** January 22, 2026  
**Status:** ✅ All screens updated to match web app design

---

## Overview

Your Flutter app now has all screens redesigned to match your web app (Proper_Place_Base44_Version_1) aesthetic and functionality. All screens connect directly to your backend at `http://localhost:3001`.

---

## Screens Updated

### 1. **Welcome Screen** (`welcome_screen.dart`)
**Design:** Gradient background with overlay, centered logo, tagline, and action buttons

**Features:**
- Background image overlay with semi-transparent black
- Centered "Proper Place" branding with RV icon
- White "Log In" button (full width)
- Bordered "Sign Up" button (full width)
- Matches web app's Welcome.jsx design exactly

**Colors:**
- Primary gradient: `#7BA7D8` → `#6B96C8`
- Background: Full-screen image with black overlay
- Text: White with drop shadow

**Navigation:**
- "Log In" → LoginScreen
- "Sign Up" → SignupScreen

---

### 2. **Login Screen** (`login_screen.dart`)
**Design:** Centered white card with gradient background, matching web app Login.jsx

**Features:**
- Gradient background (matching welcome screen)
- White card container with shadow
- Email input field with validation
- Password input field (obscured)
- Error message display (red background)
- Loading state with spinner
- Direct API call to `http://localhost:3001/auth/login`

**Form Fields:**
- Email (required)
- Password (required)

**Error Handling:**
- Connection errors displayed in red banner
- Invalid credentials show backend error message
- Loading indicator while submitting

**Navigation:**
- Success → HomeScreen (push replacement)

---

### 3. **Signup Screen** (`signup_screen.dart`)
**Design:** Similar to Login screen, with additional fields for registration

**Features:**
- Gradient background matching design system
- White card container
- Full Name input field
- Email input field
- Password input field (8+ characters required)
- Confirm Password field (must match)
- Validation logic:
  - All fields required
  - Passwords must match
  - Minimum 8 characters
- Direct API call to `http://localhost:3001/auth/signup`

**Form Fields:**
- Full Name (required)
- Email (required)
- Password (8+ characters, required)
- Confirm Password (must match)

**Error Handling:**
- Field validation with helpful messages
- Backend error messages displayed
- Connection errors with retry information

**Navigation:**
- Success → HomeScreen (push replacement)

---

### 4. **Home Screen** (`home_screen.dart`)
**Design:** Modern card-based place listing with search and filters, matching PlaceListings.jsx

**Features:**
- AppBar with "Proper Place" title
- Search bar with clear button
- Filter chips for categories:
  - All Places
  - Popular
- Place cards with:
  - Full image (200px height)
  - Favorite heart button (top right)
  - Place name
  - Star rating
  - Location with icon
  - Price per night (displayed prominently)
  - "View" button
- Empty state with icon and message
- Loading spinner while fetching
- Direct API call to `http://localhost:3001/places`

**Place Card Layout:**
```
┌─────────────────────────────────┐
│ [Image (200px)]  [❤ Button]    │
├─────────────────────────────────┤
│ Place Name    ★ 4.5            │
│ 📍 Location Details             │
│                                 │
│ £50/night     [View Button]    │
└─────────────────────────────────┘
```

**Colors:**
- Primary: `#7BA7D8`
- Rating stars: `#FFB800` (gold)
- Text: Dark gray for titles, light gray for details

**Search & Filter:**
- Real-time search across name and address
- Filter chips for quick navigation
- Clear search button when text is present

---

## API Integration

All screens now use direct HTTP calls to your backend:

### Login Endpoint
```
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "JWT_TOKEN_HERE",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

### Signup Endpoint
```
POST http://localhost:3001/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: (201 Created)
{
  "access_token": "JWT_TOKEN_HERE",
  "user": { ... }
}
```

### Places Endpoint
```
GET http://localhost:3001/places

Response:
{
  "places": [
    {
      "id": "place-1",
      "name": "Mountain Cabin",
      "address": "123 Main St",
      "price_per_night": 150,
      "rating": 4.5,
      "image_url": "https://..."
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

## Design System

### Color Palette
- **Primary Blue:** `#7BA7D8`
- **Dark Blue (Gradient):** `#6B96C8`
- **White:** `#FFFFFF`
- **Light Gray:** `#F5F5F5`
- **Dark Gray:** `#333333`
- **Star Gold:** `#FFB800`

### Typography
- **Headers:** Font size 28-36, bold, dark gray
- **Subheaders:** Font size 16-18, bold
- **Body:** Font size 14-16, regular
- **Labels:** Font size 12-14, medium weight
- **Small text:** Font size 12, light gray

### Spacing
- Card padding: 16px
- Section padding: 16-24px
- Vertical spacing: 8-16px between elements
- Button padding: 12-16px

### Rounded corners
- Cards: 12px
- Buttons: 8-12px
- Input fields: 8px
- Badges/Chips: 24px

---

## Dependencies Used

Add to `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  # For production use
  # shared_preferences: ^2.0.0
  # intl: ^0.18.0
```

---

## Next Steps

### Immediate (To Run the App)
1. Ensure backend is running: `node src/server.js` on port 3001
2. Install dependencies: `flutter pub get`
3. Run the app:
   ```bash
   flutter run -d chrome  # Web
   # or
   flutter run -d android  # Android emulator
   # or
   flutter run -d ios  # iOS simulator (macOS only)
   ```

### Features Still Needed
- [ ] Token storage (SharedPreferences)
- [ ] Token refresh mechanism
- [ ] Place detail screen
- [ ] Booking creation flow
- [ ] My bookings screen
- [ ] Review submission
- [ ] User profile screen
- [ ] Maps integration
- [ ] Offline caching
- [ ] Push notifications

### Authentication Flow to Add
```dart
// TODO: Store token on login/signup
localStorage.setItem('access_token', data.access_token);

// TODO: Read token on app startup
// TODO: Refresh token before expiry (7 days)
// TODO: Add token to all subsequent requests
// TODO: Handle token expiration gracefully
```

---

## Testing Instructions

### 1. Test Welcome Screen
```bash
flutter run -d chrome
# Should see:
# - Proper Place logo with RV icon
# - Background image with overlay
# - "Log In" and "Sign Up" buttons
# - Buttons are tappable
```

### 2. Test Signup Flow
```bash
# Click "Sign Up"
# Fill in: name, email, password (8+ chars), confirm password
# Click "Sign Up"
# Should navigate to Home screen
# Check backend logs for new user
```

### 3. Test Login Flow
```bash
# Click "Log In"
# Enter registered email and password
# Click "Log In"
# Should navigate to Home screen
# Check backend logs for successful auth
```

### 4. Test Home Screen
```bash
# Should see list of places from backend
# Search works by name/address
# Filter chips are clickable
# Cards display all info (image, rating, price, location)
# "View" buttons are styled
```

### 5. Test Error Handling
```bash
# Try login with wrong password
# Should show error message
# Try login with non-existent email
# Should show "User not found" or similar
# Unplug network and try login
# Should show "Connection error"
```

---

## File Structure

```
lib/
├── main.dart (updated - theme, routes)
├── screens/
│   ├── welcome_screen.dart (✅ UPDATED)
│   ├── login_screen.dart (✅ UPDATED)
│   ├── signup_screen.dart (✅ UPDATED)
│   ├── home_screen.dart (✅ UPDATED)
│   └── map_screen.dart (existing - not modified)
├── auth/
│   └── auth_provider.dart (existing - still there)
├── api/
│   └── base44_client.dart (existing - no longer used)
└── config/
    └── app_config.dart (existing - config values)
```

---

## Known Limitations

- **No persistent authentication:** Tokens not stored yet (TODO)
- **No token refresh:** Tokens expire after 7 days (TODO)
- **No place detail screen:** View button doesn't navigate (TODO)
- **No offline support:** Requires internet connection
- **No maps:** Place locations not displayed on map
- **No image caching:** Images reloaded each time

---

## Debugging

### If app crashes on startup:
```bash
flutter clean
flutter pub get
flutter run -v
```

### If you get connection errors:
```bash
# Check backend is running
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}

# Check your machine IP (if testing on device)
# Update localhost:3001 to your machine IP:3001
```

### If login doesn't work:
```bash
# Check if user exists
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Try creating new account via Signup
```

---

## Color Usage Reference

| Component | Color | Use |
|-----------|-------|-----|
| AppBar | `#7BA7D8` | Header background |
| Buttons | `#7BA7D8` | Primary action |
| Text Focus | `#7BA7D8` | Input focus border |
| Icons (location, etc) | `#7BA7D8` | UI accents |
| Stars | `#FFB800` | Ratings |
| Backgrounds | Gradient | Welcome/Login/Signup |
| Cards | `#FFFFFF` | Content containers |
| Text Primary | `#333333` | Headings |
| Text Secondary | Gray shades | Supporting text |
| Errors | `#FF0000` | Error messages |

---

**Last Updated:** January 22, 2026  
**Backend Version:** 1.0  
**Flutter Version:** 3.x+  
**Status:** Ready for development
