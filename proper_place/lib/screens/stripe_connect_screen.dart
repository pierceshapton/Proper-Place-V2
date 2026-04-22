import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

/// Guides a host through Stripe Connect Express onboarding so they can receive
/// payouts directly.  Stripe handles all identity verification and bank details;
/// Proper Place never sees that information.
class StripeConnectScreen extends StatefulWidget {
  const StripeConnectScreen({super.key});

  @override
  State<StripeConnectScreen> createState() => _StripeConnectScreenState();
}

class _StripeConnectScreenState extends State<StripeConnectScreen> {
  bool _isLoading = false;
  bool _checkingStatus = false;
  String? _error;

  static const Color _stripePurple = Color(0xFF635BFF);
  static const Color _lightBlue = Color(0xFF5B8FC4);

  Future<void> _startOnboarding() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final userId = await StorageService.getUserId();
      if (userId == null) throw Exception('Not logged in');

      final result = await ApiService.getConnectOnboardingUrl(userId: userId);
      final url = result['url'] as String?;
      if (url == null) throw Exception('No onboarding URL returned');

      final uri = Uri.parse(url);
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception('Could not open Stripe onboarding page');
      }

      // After returning from the browser the user taps "I've completed setup"
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _checkStatus() async {
    setState(() {
      _checkingStatus = true;
      _error = null;
    });

    try {
      final userId = await StorageService.getUserId();
      if (userId == null) throw Exception('Not logged in');

      final result = await ApiService.getConnectStatus(userId: userId);
      final onboarded = result['onboarded'] == true;

      if (onboarded) {
        if (mounted) Navigator.pop(context, true); // signal success
      } else {
        setState(() => _error = 'Stripe setup is not complete yet. Please finish all steps on the Stripe page and try again.');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _checkingStatus = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F5F0),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1A1A2E)),
          onPressed: () => Navigator.pop(context, false),
        ),
        title: const Text(
          'Set Up Payouts',
          style: TextStyle(color: Color(0xFF1A1A2E), fontWeight: FontWeight.w700, fontSize: 18),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _lightBlue.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _stripePurple.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.account_balance, size: 40, color: _stripePurple),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Get Paid for Your Bookings',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF1A1A2E)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Connect your bank account through Stripe so earnings from guest bookings are paid directly to you. Proper Place takes a 15% platform fee — the remainder goes straight to your account.',
                    style: TextStyle(fontSize: 14, color: Color(0xFF6B7280), height: 1.5),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // How it works
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _lightBlue.withOpacity(0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'HOW IT WORKS',
                    style: TextStyle(
                      color: _lightBlue,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _infoRow(Icons.credit_card, 'Guest pays in full', "The guest's card is charged securely through Stripe."),
                  const SizedBox(height: 14),
                  _infoRow(Icons.percent, 'Proper Place fee', '15% platform fee is retained automatically — no extra Stripe charges on our cut.'),
                  const SizedBox(height: 14),
                  _infoRow(Icons.account_balance_wallet, 'You receive 85%', 'The remaining 85% (minus Stripe\'s standard processing fee) is paid to your bank account.'),
                  const SizedBox(height: 14),
                  _infoRow(Icons.security, 'Stripe handles everything', 'Your bank details and identity verification are handled entirely by Stripe — we never see them.'),
                ],
              ),
            ),
            const SizedBox(height: 24),

            if (_error != null)
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),

            // Primary CTA
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _startOnboarding,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _stripePurple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Open Stripe Setup', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 14),

            // After returning from browser
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _checkingStatus ? null : _checkStatus,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _lightBlue,
                  side: const BorderSide(color: _lightBlue),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _checkingStatus
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text("I've Completed Setup", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: _lightBlue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: _lightBlue),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1A1A2E))),
              const SizedBox(height: 2),
              Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }
}
