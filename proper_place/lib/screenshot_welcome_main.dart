import 'package:flutter/material.dart';
import 'package:proper_place/screens/home_screen.dart';
import 'package:proper_place/screens/login_screen.dart';
import 'package:proper_place/screens/signup_screen.dart';
import 'package:proper_place/screens/welcome_screen.dart';

void main() {
  runApp(const WelcomeScreenshotApp());
}

class WelcomeScreenshotApp extends StatelessWidget {
  const WelcomeScreenshotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: const WelcomeScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/home': (context) => const HomeScreen(),
      },
    );
  }
}
