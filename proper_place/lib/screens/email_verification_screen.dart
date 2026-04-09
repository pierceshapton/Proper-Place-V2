import 'dart:async';
import 'package:flutter/material.dart';
import 'package:proper_place/services/api_service.dart';

class EmailVerificationScreen extends StatefulWidget {
  final String email;

  const EmailVerificationScreen({super.key, required this.email});

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _isResending = false;
  bool _isChecking = false;
  String? _message;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    // Poll every 5 seconds to check if the user has verified their email
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _checkVerified());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkVerified() async {
    if (_isChecking) return;
    _isChecking = true;
    try {
      final response = await ApiService.getCurrentUser();
      final user = response['user'];
      if (user != null && user['verified'] == true) {
        _pollTimer?.cancel();
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/home');
        }
      }
    } catch (_) {
      // Silently ignore polling errors
    } finally {
      _isChecking = false;
    }
  }

  Future<void> _resendEmail() async {
    setState(() {
      _isResending = true;
      _message = null;
    });
    try {
      await ApiService.resendVerification();
      if (mounted) {
        setState(() => _message = 'Verification email sent!');
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _message = e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _message = 'Failed to resend. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.mark_email_unread_outlined,
                  size: 80, color: Color(0xFF2E7D32)),
              const SizedBox(height: 24),
              const Text(
                'Check your email',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                'We\'ve sent a verification link to',
                style: TextStyle(fontSize: 15, color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                widget.email,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Tap the link in the email to verify your account. This page will update automatically.',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: _isResending ? null : _resendEmail,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF2E7D32)),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isResending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Resend verification email',
                          style: TextStyle(color: Color(0xFF2E7D32))),
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: 12),
                Text(_message!,
                    style: TextStyle(
                        color: _message!.contains('sent')
                            ? const Color(0xFF2E7D32)
                            : Colors.red,
                        fontSize: 13)),
              ],
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  _pollTimer?.cancel();
                  Navigator.of(context).pushReplacementNamed('/home');
                },
                child: Text('Skip for now',
                    style: TextStyle(color: Colors.grey[500], fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
