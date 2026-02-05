# Flutter App Integration Guide

## Overview
The Flutter app will connect to the Proper Place backend API running on `http://localhost:3001`.

## Setup Steps

### 1. Update API Configuration in Flutter

Update `lib/main.dart` or create an API service file:

```dart
class ApiService {
  static const String BASE_URL = 'http://localhost:3001';
  
  static Future<Map<String, dynamic>> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Signup failed: ${response.body}');
    }
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Login failed');
    }
  }

  static Future<List<dynamic>> getPlaces({String? token}) async {
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    
    final response = await http.get(
      Uri.parse('$BASE_URL/places'),
      headers: headers,
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['places'] ?? [];
    } else {
      throw Exception('Failed to load places');
    }
  }

  static Future<Map<String, dynamic>> getPlaceDetail(String placeId, {String? token}) async {
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    
    final response = await http.get(
      Uri.parse('$BASE_URL/places/$placeId'),
      headers: headers,
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Place not found');
    }
  }

  static Future<Map<String, dynamic>> createBooking({
    required String token,
    required String placeId,
    required String checkIn,
    required String checkOut,
    required int guests,
  }) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/bookings'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'place_id': placeId,
        'check_in': checkIn,
        'check_out': checkOut,
        'guests': guests,
      }),
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Booking failed: ${response.body}');
    }
  }

  static Future<List<dynamic>> getUserBookings(String token) async {
    final response = await http.get(
      Uri.parse('$BASE_URL/bookings'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['bookings'] ?? [];
    } else {
      throw Exception('Failed to load bookings');
    }
  }

  static Future<List<dynamic>> getPlaceReviews(String placeId) async {
    final response = await http.get(
      Uri.parse('$BASE_URL/reviews?place_id=$placeId'),
      headers: {'Content-Type': 'application/json'},
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['reviews'] ?? [];
    } else {
      throw Exception('Failed to load reviews');
    }
  }

  static Future<Map<String, dynamic>> createReview({
    required String token,
    required String placeId,
    required int rating,
    required String comment,
  }) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/reviews'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'place_id': placeId,
        'rating': rating,
        'comment': comment,
      }),
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Review creation failed');
    }
  }
}
```

### 2. Storage Setup

Store the token securely:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _storage = FlutterSecureStorage();
  
  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }
  
  static Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }
  
  static Future<void> clearToken() async {
    await _storage.delete(key: 'access_token');
  }
}
```

### 3. Update pubspec.yaml

Add required dependencies:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
```

Then run:
```bash
flutter pub get
```

### 4. Build Authentication Flow

```dart
class AuthScreen extends StatefulWidget {
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLogin = true;
  bool _isLoading = false;

  Future<void> _authenticate() async {
    setState(() => _isLoading = true);
    
    try {
      dynamic result;
      if (_isLogin) {
        result = await ApiService.login(
          email: _emailController.text,
          password: _passwordController.text,
        );
      } else {
        result = await ApiService.signup(
          name: _emailController.text.split('@')[0],
          email: _emailController.text,
          password: _passwordController.text,
        );
      }
      
      // Save token
      await StorageService.saveToken(result['access_token']);
      
      // Navigate to home
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextField(
                controller: _emailController,
                decoration: InputDecoration(labelText: 'Email'),
              ),
              SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                decoration: InputDecoration(labelText: 'Password'),
                obscureText: true,
              ),
              SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _authenticate,
                child: Text(_isLogin ? 'Login' : 'Sign Up'),
              ),
              SizedBox(height: 16),
              TextButton(
                onPressed: () => setState(() => _isLogin = !_isLogin),
                child: Text(_isLogin ? 'Create Account' : 'Already have account?'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### 5. Build Places List Screen

```dart
class PlacesScreen extends StatefulWidget {
  @override
  State<PlacesScreen> createState() => _PlacesScreenState();
}

class _PlacesScreenState extends State<PlacesScreen> {
  late Future<List<dynamic>> _places;
  String? _token;

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  Future<void> _loadPlaces() async {
    _token = await StorageService.getToken();
    setState(() {
      _places = ApiService.getPlaces(token: _token);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Places')),
      body: FutureBuilder<List<dynamic>>(
        future: _places,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (snapshot.hasData && snapshot.data!.isNotEmpty) {
            return ListView.builder(
              itemCount: snapshot.data!.length,
              itemBuilder: (context, index) {
                final place = snapshot.data![index];
                return Card(
                  margin: EdgeInsets.all(8),
                  child: ListTile(
                    title: Text(place['name']),
                    subtitle: Text(place['description']),
                    trailing: Text('\$${place['price_per_night']}/night'),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => PlaceDetailScreen(placeId: place['id']),
                        ),
                      );
                    },
                  ),
                );
              },
            );
          } else {
            return Center(child: Text('No places available'));
          }
        },
      ),
    );
  }
}
```

## API Base URL Configuration

For different environments:

```dart
class ApiService {
  static const String BASE_URL = 
    String.fromEnvironment('API_URL') ?? 'http://localhost:3001';
}
```

Run with:
```bash
flutter run --dart-define=API_URL=http://your-server.com
```

## Testing the Integration

1. Start the backend:
```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/backend
node src/server.js
```

2. Run Flutter app:
```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/proper_place
flutter run
```

3. Test signup/login
4. Verify places load
5. Create test booking

## Common Issues

### CORS Errors
- The backend is configured to accept localhost origins
- For production, update CORS settings in backend

### Connection Timeout
- Ensure backend is running on port 3001
- Check `http://localhost:3001/health`

### Token Issues
- Tokens are valid for 7 days
- Refresh tokens for longer sessions
- Store token securely using `flutter_secure_storage`

## Production Considerations

- Use HTTPS instead of HTTP
- Update API_URL to production server
- Implement token refresh mechanism
- Add request timeout handling
- Add offline mode with local caching
- Implement error recovery
