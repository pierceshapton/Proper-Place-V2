import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:proper_place/services/api_service.dart';

class PaymentService {
  static String? _stripePublishableKey;

  static Future<void> initialize() async {
    try {
      // Load Stripe publishable key from .env file
      _stripePublishableKey = dotenv.env['STRIPE_PUBLISHABLE_KEY'];
      
      if (_stripePublishableKey == null || _stripePublishableKey!.isEmpty) {
        throw Exception('STRIPE_PUBLISHABLE_KEY not found in environment variables');
      }
      
      Stripe.publishableKey = _stripePublishableKey!;
      await Stripe.instance.applySettings();
      debugPrint('✅ Stripe initialized successfully with key: ${_stripePublishableKey!.substring(0, 10)}...');
    } catch (e) {
      debugPrint('❌ Error initializing Stripe: $e');
      rethrow;
    }
  }

  /// Process payment for a booking
  /// Returns the paymentIntentId if payment authorised, null otherwise
  static Future<({String paymentIntentId, String? connectedAccountId})?> processPayment({
    required double amount,
    required String currency,
    required String bookingId,
    required BuildContext context,
    String? placeId,
    DateTime? checkOutDate,
  }) async {
    try {
      debugPrint('🟦 PAYMENT: Starting payment process for £${amount.toStringAsFixed(2)}');
      debugPrint('🟦 PAYMENT: Stripe publishable key loaded: ${_stripePublishableKey != null}');

      // Create payment intent on backend
      debugPrint('🟦 PAYMENT: Creating payment intent...');
      final paymentIntentData = await _createPaymentIntent(
        amount: (amount * 100).toInt(), // Convert to cents
        currency: currency,
        placeId: placeId,
        checkOutDate: checkOutDate,
      );
      debugPrint('🟦 PAYMENT: Payment intent created: ${paymentIntentData['clientSecret'] != null}');

      final paymentIntentId = paymentIntentData['paymentIntentId'] as String?;
      final connectedAccountId = paymentIntentData['connectedAccountId'] as String?;

      // Destination charges: PI is on the platform account, so stripeAccountId
      // must NOT be set on the client (that is only for direct charges).

      // Initialize payment sheet
      debugPrint('🟦 PAYMENT: Initializing payment sheet...');
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentIntentData['clientSecret'],
          merchantDisplayName: 'Proper Place',
          style: ThemeMode.light,
          appearance: PaymentSheetAppearance(
            colors: PaymentSheetAppearanceColors(
              primary: const Color(0xFF7BA7D8),
            ),
          ),
        ),
      );
      debugPrint('🟦 PAYMENT: Payment sheet initialized successfully');

      // Display payment sheet
      debugPrint('🟦 PAYMENT: Presenting payment sheet...');
      await Stripe.instance.presentPaymentSheet();
      debugPrint('🟦 PAYMENT: ✅ Payment sheet presented and payment authorised');

      if (paymentIntentId == null) return null;
      return (paymentIntentId: paymentIntentId, connectedAccountId: connectedAccountId);
    } on StripeException catch (e) {
      debugPrint('🔴 PAYMENT STRIPE ERROR: ${e.error.localizedMessage}');
      debugPrint('🔴 PAYMENT STRIPE ERROR Details: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment failed: ${e.error.localizedMessage}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return null;
    } catch (e) {
      debugPrint('🔴 PAYMENT ERROR: $e');
      debugPrint('🔴 PAYMENT ERROR Type: ${e.runtimeType}');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return null;
    }
  }

  /// Create payment intent on backend
  static Future<Map<String, dynamic>> _createPaymentIntent({
    required int amount,
    required String currency,
    String? placeId,
    DateTime? checkOutDate,
  }) async {
    try {
      final response = await ApiService.createPaymentIntent(
        amount: amount,
        currency: currency,
        placeId: placeId,
        checkOutDate: checkOutDate,
      );
      return response;
    } catch (e) {
      debugPrint('Error creating payment intent: $e');
      rethrow;
    }
  }

  /// Cancel a payment (refund)
  static Future<bool> refundPayment({
    required String paymentIntentId,
  }) async {
    try {
      await ApiService.refundPayment(paymentIntentId: paymentIntentId);
      debugPrint('✅ Refund processed successfully');
      return true;
    } catch (e) {
      debugPrint('❌ Refund error: $e');
      return false;
    }
  }
}
