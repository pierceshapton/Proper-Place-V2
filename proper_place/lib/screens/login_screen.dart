import 'package:flutter/material.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/push_notification_service.dart';
import 'package:proper_place/screens/signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  bool _rememberMe = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _loadRememberedCredentials();
  }

  Future<void> _loadRememberedCredentials() async {
    final rememberMe = await StorageService.getRememberMe();
    if (rememberMe) {
      final email = await StorageService.getRememberedEmail();
      if (mounted) {
        setState(() {
          _rememberMe = true;
          if (email != null) {
            _emailController.text = email;
          }
        });
      }
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Precache the background image to ensure it loads
    precacheImage(
      const AssetImage('assets/images/login_background.png'),
      context,
    ).then((_) {
      print('[LoginScreen] Background image precached successfully');
    }).catchError((e) {
      print('[LoginScreen] Error precaching image: $e');
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter email and password';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiService.login(
        email: _emailController.text,
        password: _passwordController.text,
      );

      if (!mounted) return;

      final token = response['access_token'];
      final refreshToken = response['refresh_token'];
      print('[Login] Response data: $response');
      
      // Save tokens
      await StorageService.saveToken(token);
      if (refreshToken != null) {
        await StorageService.saveRefreshToken(refreshToken);
      }
      
      // Save remember me preference
      await StorageService.setRememberMe(_rememberMe, email: _emailController.text);
      
      // Extract user data from nested 'user' object
      final user = response['user'];
      if (user != null) {
        print('[Login] User object: $user');
        if (user['id'] != null) {
          await StorageService.saveUserId(user['id'].toString());
        }
        if (user['email'] != null) {
          await StorageService.saveUserEmail(user['email']);
        }
        if (user['name'] != null) {
          await StorageService.saveUserName(user['name']);
        }
        if (user['role'] != null) {
          await StorageService.saveUserRole(user['role']);
          print('[Login] Saved role: ${user['role']}');
        }
      }
      
      // Register device token for push notifications
      try {
        await PushNotificationService.registerToken();
      } catch (_) {}

      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Connection error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF4A6891),
      resizeToAvoidBottomInset: false,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background image - positioned to fill entire screen
          Positioned.fill(
            child: Image.asset(
              'assets/images/login_background.png',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                debugPrint('Image load error: $error');
                return Container(color: const Color(0xFF4A6891));
              },
            ),
          ),
          // Dark overlay for better text readability
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.3),
            ),
          ),
          // Content - wrapped in SafeArea and fills screen
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(context).viewInsets.bottom,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: IntrinsicHeight(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12.0,
                          vertical: 20.0,
                        ),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(
                              minWidth: 340,
                              maxWidth: 340,
                            ),
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 16,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Log In',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey[800],
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                      Text(
                        'Welcome back',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Email Field
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Email',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(height: 4),
                          TextField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              hintText: 'Email',
                              hintStyle: TextStyle(color: Colors.grey[600]),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: BorderSide(
                                  color: Colors.grey[300]!,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: BorderSide(
                                  color: Colors.grey[300]!,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: const BorderSide(
                                  color: Color(0xFF7BA7D8),
                                  width: 2,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                            ),
                            keyboardType: TextInputType.emailAddress,
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Password Field
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Password',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(height: 4),
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              hintText: 'Password',
                              hintStyle: TextStyle(color: Colors.grey[600]),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: BorderSide(
                                  color: Colors.grey[300]!,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: BorderSide(
                                  color: Colors.grey[300]!,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(6),
                                borderSide: const BorderSide(
                                  color: Color(0xFF7BA7D8),
                                  width: 2,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                  color: Colors.grey[600],
                                  size: 20,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Remember Me Checkbox
                      Row(
                        children: [
                          SizedBox(
                            height: 20,
                            width: 20,
                            child: Checkbox(
                              value: _rememberMe,
                              onChanged: (value) {
                                setState(() {
                                  _rememberMe = value ?? false;
                                });
                              },
                              activeColor: const Color(0xFF7BA7D8),
                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _rememberMe = !_rememberMe;
                              });
                            },
                            child: Text(
                              'Remember me',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[700],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Error Message
                      if (_errorMessage != null)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red[100],
                            border: Border.all(color: Colors.red[400]!),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(
                              color: Colors.red[700],
                              fontSize: 11,
                            ),
                          ),
                        ),
                      if (_errorMessage != null) const SizedBox(height: 10),

                      // Login Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7BA7D8),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 16,
                                width: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : const Text(
                                'Log In',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                      const SizedBox(height: 10),

                      // Sign Up Link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Need an account? ',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(
                                  builder: (context) => const SignupScreen(),
                                ),
                              );
                            },
                            child: const Text(
                              'Sign Up',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF7BA7D8),
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  },
),
          ),
            // Back Button
            Positioned(
              top: 16,
              left: 16,
              child: SafeArea(
                child: CircleAvatar(
                  backgroundColor: Colors.white.withOpacity(0.9),
                  radius: 24,
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Color(0xFF7BA7D8)),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ),
            ),
          ],
        ),
    );
  }
}
