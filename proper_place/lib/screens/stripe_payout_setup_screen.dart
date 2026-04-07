import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:proper_place/services/storage_service.dart';

class StripePayoutSetupScreen extends StatefulWidget {
  const StripePayoutSetupScreen({super.key});

  @override
  State<StripePayoutSetupScreen> createState() => _StripePayoutSetupScreenState();
}

class _StripePayoutSetupScreenState extends State<StripePayoutSetupScreen> with WidgetsBindingObserver {
  bool _loading = true;
  bool _actionLoading = false;
  bool _connected = false;
  bool _payoutsEnabled = false;
  bool _waitingForStripe = false; // True after we've opened the browser
  bool _incomplete = false; // True when host returned without finishing

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // When user returns from browser, automatically verify
    if (state == AppLifecycleState.resumed && _waitingForStripe) {
      _verifyCompletion();
    }
  }

  Future<void> _checkStatus() async {
    setState(() => _loading = true);
    try {
      final status = await ApiService.getPayoutStatus();
      _connected = status['connected'] == true;
      _payoutsEnabled = status['payouts_enabled'] == true && status['details_submitted'] == true;
      await StorageService.setStripePayoutsEnabled(_payoutsEnabled);
      // If already complete, go straight back to dashboard
      if (_payoutsEnabled && mounted) {
        _showSuccessAndPop();
        return;
      }
      // If connected but not complete, show incomplete screen
      if (_connected && mounted) {
        setState(() {
          _incomplete = true;
          _loading = false;
        });
        return;
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _setupStripe() async {
    setState(() => _actionLoading = true);
    try {
      final url = await ApiService.setupPayoutAccount();
      if (!mounted) return;
      if (url.isNotEmpty) {
        setState(() {
          _actionLoading = false;
          _waitingForStripe = true;
        });
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
        // didChangeAppLifecycleState will handle the return
      } else {
        setState(() => _actionLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _actionLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error setting up payouts: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _verifyCompletion() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _waitingForStripe = false;
    });

    // Poll up to 6 times (12 seconds) for Stripe to propagate
    for (int i = 0; i < 6; i++) {
      await Future.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      try {
        final status = await ApiService.getPayoutStatus();
        _connected = status['connected'] == true;
        final enabled = status['payouts_enabled'] == true && status['details_submitted'] == true;
        if (enabled) {
          await StorageService.setStripePayoutsEnabled(true);
          _showSuccessAndPop();
          return;
        }
      } catch (_) {}
    }

    // Not complete yet — show incomplete screen
    if (mounted) {
      setState(() {
        _loading = false;
        _incomplete = true;
      });
    }
  }

  void _showSuccessAndPop() {
    if (!mounted) return;
    setState(() {
      _payoutsEnabled = true;
      _loading = false;
    });
    // Show the success screen briefly, then auto-pop to dashboard
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) Navigator.pop(context, true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _payoutsEnabled, // Only allow back if setup is complete
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && !_payoutsEnabled) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please complete payout setup before continuing.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 3),
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text(
            'Payout Setup',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: const IconThemeData(color: Colors.black),
          automaticallyImplyLeading: _payoutsEnabled, // Hide back arrow until complete
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF5B8FC4)))
            : _payoutsEnabled
                ? _buildComplete()
                : _incomplete
                    ? _buildIncomplete()
                    : _buildSetup(),
      ),
    );
  }

  Widget _buildComplete() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          const Spacer(flex: 2),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 44),
          ),
          const SizedBox(height: 24),
          const Text(
            'Payouts Active',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
          ),
          const SizedBox(height: 12),
          Text(
            'Your Stripe account is connected and ready to receive payouts. Returning to dashboard\u2026',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: Colors.grey[600], height: 1.5),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 2),
          const Spacer(flex: 3),
        ],
      ),
    );
  }

  Widget _buildIncomplete() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          const SizedBox(height: 40),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 44),
          ),
          const SizedBox(height: 24),
          const Text(
            'Setup Incomplete',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
          ),
          const SizedBox(height: 12),
          Text(
            'It looks like you left the Stripe form before finishing. Your payout account isn\u2019t ready yet \u2014 guests won\u2019t be able to book your site until this is complete.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: Colors.grey[600], height: 1.5),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.red.shade700, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Your bank details and identity verification are still needed.',
                    style: TextStyle(fontSize: 13, color: Colors.red.shade900, fontWeight: FontWeight.w500, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _actionLoading ? null : () {
                setState(() => _incomplete = false);
                _setupStripe();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5B8FC4),
                disabledBackgroundColor: Colors.grey[300],
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _actionLoading
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.refresh, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Resume Setup',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSetup() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: [
          const SizedBox(height: 16),
          Text(
            _connected ? 'Complete Your Setup' : 'Set Up Payouts',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
          ),
          const SizedBox(height: 8),
          Text(
            _connected
                ? 'Your Stripe account is linked but needs a few more details before payouts can be sent.'
                : 'Connect your bank account via Stripe so you can receive payouts when guests book your site.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, color: Colors.grey[600], height: 1.5),
          ),
          const SizedBox(height: 20),

          _infoCard(
            Icons.account_balance_outlined,
            'Automatic Payouts',
            'After each completed booking, your payout is sent to your bank account automatically via Stripe.',
          ),
          const SizedBox(height: 10),
          _infoCard(
            Icons.schedule_outlined,
            'When You Get Paid',
            'Funds are held securely by Stripe until the guest\u2019s stay is complete. Your payout (minus 15% platform fee and Stripe processing fees) is then transferred.',
          ),
          const SizedBox(height: 10),
          _infoCard(
            Icons.security_outlined,
            'Secure & Simple',
            'Stripe handles everything \u2014 your bank details are never shared with us or guests. Setup takes about 2 minutes.',
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Guests cannot book your site until payout setup is complete.',
                    style: TextStyle(fontSize: 13, color: Colors.red.shade900, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _actionLoading ? null : _setupStripe,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5B8FC4),
                disabledBackgroundColor: Colors.grey[300],
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _actionLoading
                  ? const SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.account_balance, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          _connected ? 'Complete Setup' : 'Connect Bank Account',
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _infoCard(IconData icon, String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF5B8FC4), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 4),
                Text(desc, style: TextStyle(fontSize: 13, color: Colors.grey[600], height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
