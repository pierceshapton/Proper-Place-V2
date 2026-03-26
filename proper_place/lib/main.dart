import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:proper_place/screens/welcome_screen.dart';
import 'package:proper_place/screens/login_screen.dart';
import 'package:proper_place/screens/signup_screen.dart';
import 'package:proper_place/screens/home_screen.dart';
import 'package:proper_place/screens/host_submit_place_screen.dart';
import 'package:proper_place/screens/admin_place_approval_screen.dart';
import 'package:proper_place/screens/my_bookings_screen.dart';
import 'package:proper_place/screens/booking_detail_screen.dart';
import 'package:proper_place/config/app_config.dart';
import 'package:proper_place/config/app_constants.dart';
import 'package:proper_place/services/storage_service.dart';
import 'package:proper_place/services/payment_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables from .env file
  try {
    await dotenv.load(fileName: ".env");
    debugPrint('✅ Environment variables loaded successfully');
  } catch (e) {
    debugPrint('⚠️ Warning: Could not load .env file: $e');
  }

  // Initialize Stripe payment service
  try {
    await PaymentService.initialize();
    debugPrint('✅ Payment service initialized');
  } catch (e) {
    debugPrint('⚠️ Warning: Stripe initialization failed: $e');
  }

  // Print config on startup (for debugging)
  AppConfig.printConfig();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Proper Place',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.lightBlue,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: AppColors.white,
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.darkBackground,
          foregroundColor: AppColors.textOnDark,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: AppTypography.headlineMedium.copyWith(
            color: AppColors.textOnDark,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.lightBlue,
            foregroundColor: AppColors.white,
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.md,
              horizontal: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            textStyle: AppTypography.labelLarge,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.lightBlue,
            side: const BorderSide(color: AppColors.lightBlue, width: 1.5),
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.md,
              horizontal: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            textStyle: AppTypography.labelLarge,
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.lightBlue,
            textStyle: AppTypography.labelLarge,
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.sm,
              horizontal: AppSpacing.md,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.lightGray,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            borderSide: const BorderSide(color: AppColors.borderColor),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            borderSide: const BorderSide(color: AppColors.borderColor),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            borderSide: const BorderSide(color: AppColors.lightBlue, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          labelStyle: AppTypography.bodyMedium,
          hintStyle: AppTypography.bodyMedium.copyWith(
            color: Colors.black54,
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.cardBackground,
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.dividerColor,
          thickness: 1,
        ),
      ),
      home: const AuthCheckWrapper(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/home': (context) => const HomeScreen(),
        '/map': (context) => const HomeScreen(),
        '/host_submit_place': (context) {
          final args = ModalRoute.of(context)?.settings.arguments
              as Map<String, dynamic>?;
          return HostSubmitPlaceScreen(placeToEdit: args);
        },
        '/admin_place_approval': (context) => const AdminPlaceApprovalScreen(),
        '/my_bookings': (context) => const MyBookingsScreen(),
        '/booking-detail': (context) {
          final args = ModalRoute.of(context)?.settings.arguments
              as Map<String, dynamic>?;
          if (args == null) {
            return const Scaffold(
              body: Center(
                child: Text('Booking details not available'),
              ),
            );
          }
          return BookingDetailScreen(
            booking: args['booking'] as Map<String, dynamic>,
            place: args['place'],
          );
        },
      },
    );
  }
}

/// AuthCheckWrapper - Shows welcome screen immediately, checks auth in background
class AuthCheckWrapper extends StatefulWidget {
  const AuthCheckWrapper({super.key});

  @override
  State<AuthCheckWrapper> createState() => _AuthCheckWrapperState();
}

class _AuthCheckWrapperState extends State<AuthCheckWrapper> {
  @override
  void initState() {
    super.initState();
    // Check auth status in background after UI renders
    Future.delayed(const Duration(milliseconds: 500), _checkAuthStatus);
  }

  Future<void> _checkAuthStatus() async {
    try {
      final isAuthenticated = await StorageService.isAuthenticated()
          .timeout(const Duration(seconds: 3), onTimeout: () => false);
      
      if (isAuthenticated && mounted) {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } catch (e) {
      debugPrint('Auth check failed: $e');
      // Stay on welcome screen if auth fails
    }
  }

  @override
  Widget build(BuildContext context) {
    return const WelcomeScreen();
  }
}
