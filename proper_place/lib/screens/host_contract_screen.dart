import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../services/api_service.dart';
import 'contact_us_form_screen.dart';

class HostContractScreen extends StatefulWidget {
  final bool isPostLogin;
  const HostContractScreen({super.key, this.isPostLogin = false});

  @override
  State<HostContractScreen> createState() => _HostContractScreenState();
}

class _HostContractScreenState extends State<HostContractScreen> {
  bool _agreed = false;
  bool _submitting = false;
  bool _hasSigned = false;

  // Signature
  final List<List<Offset>> _strokes = [];
  List<Offset> _currentStroke = [];

  Future<String> _getSignatureBase64() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final stroke in _strokes) {
      if (stroke.length < 2) continue;
      final path = Path();
      path.moveTo(stroke.first.dx, stroke.first.dy);
      for (int i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }

    final picture = recorder.endRecording();
    final img = await picture.toImage(400, 150);
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    if (byteData == null) return '';
    return base64Encode(byteData.buffer.asUint8List());
  }

  void _clearSignature() {
    setState(() {
      _strokes.clear();
      _currentStroke = [];
      _hasSigned = false;
    });
  }

  Future<void> _acceptContract() async {
    if (!_hasSigned) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign the contract above')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final sigData = await _getSignatureBase64();
      await ApiService.acceptHostContract(
        version: '1.0',
        signatureData: sigData,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Contract signed successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _shareContract() async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/Proper_Place_Host_Agreement.txt');
      await file.writeAsString(_getContractPlainText());
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'Proper Place Host Agreement v1.0',
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error sharing: $e')),
        );
      }
    }
  }

  void _contactAdmin() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ContactUsFormScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Host Agreement'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 22),
            tooltip: 'Share / Download',
            onPressed: _shareContract,
          ),
          IconButton(
            icon: const Icon(Icons.support_agent, size: 22),
            tooltip: 'Contact Admin',
            onPressed: _contactAdmin,
          ),
        ],
      ),
      backgroundColor: Colors.white,
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Share/contact info banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F7FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFBBDEFB)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, color: Color(0xFF5B8FC4), size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Take your time reviewing this agreement. You can share it with a solicitor using the share button above.',
                            style: TextStyle(fontSize: 13, color: Colors.grey[700], height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Center(
                    child: Icon(Icons.handshake_outlined, size: 48, color: Color(0xFF5B8FC4)),
                  ),
                  const SizedBox(height: 12),
                  const Center(
                    child: Text(
                      'Proper Place Host Agreement',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Center(
                    child: Text(
                      'Version 1.0 — Effective from 30 March 2026',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _sectionText(
                    'This Host Agreement ("Agreement") is entered into between you ("Host", "you") and Proper Place Ltd ("Proper Place", "we", "us", "the Platform"). By listing a site on the Proper Place platform, you confirm that you have read, understood, and agree to be bound by the following terms.',
                  ),
                  const SizedBox(height: 20),
                  _sectionTitle('1. The Platform'),
                  _sectionText(
                    'Proper Place is an online marketplace that connects motorhome, campervan, and caravan owners ("Guests") with landowners, publicans, farmers, and other property holders ("Hosts") who wish to offer overnight parking or short-stay pitches on their land. Proper Place acts solely as an intermediary and is not a party to any agreement between Host and Guest.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('2. Host Responsibilities'),
                  _sectionText(
                    'As a Host on the Proper Place platform, you agree that:\n\n'
                    'a) You are the legal owner of, or have the legal right and all necessary permissions to offer, the listed site for motorhome/campervan/caravan parking.\n\n'
                    'b) All information provided in your listing is accurate, truthful, and not misleading. This includes but is not limited to: site description, photographs, available facilities, access routes, vehicle size restrictions, and pricing.\n\n'
                    'c) You are solely responsible for the condition, safety, and suitability of your site at all times. This includes ensuring safe access, adequate drainage, level ground where stated, and that all facilities described in your listing are operational and available.\n\n'
                    'd) You will maintain appropriate public liability insurance for your site that covers the use of your land by visiting motorhome/campervan/caravan owners and their passengers. Proper Place does not provide insurance cover of any kind and strongly recommends a minimum of £1,000,000 public liability cover.\n\n'
                    'e) You accept a duty of care to all visitors to your site. You must take all reasonable steps to identify and mitigate hazards on or around your site, including but not limited to: uneven ground, open water, unfenced drops, unstable structures, low-hanging branches, poor lighting, slippery surfaces, and any other conditions that could cause injury. Where hazards cannot be eliminated, you must provide adequate warnings.\n\n'
                    'f) You will respond to booking requests and guest enquiries in a timely and professional manner.\n\n'
                    'g) You will treat all Guests fairly and will not discriminate on the grounds of race, gender, sexuality, disability, religion, or any other protected characteristic.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('3. Planning & Regulatory Compliance'),
                  _sectionText(
                    'You acknowledge and agree that:\n\n'
                    'a) It is your sole and absolute responsibility to ensure that offering your site for motorhome/campervan/caravan parking complies with all applicable local planning regulations, bylaws, land use restrictions, zoning requirements, change-of-use requirements, environmental designations, conservation area restrictions, listed building constraints, and any other relevant laws or regulations in your jurisdiction.\n\n'
                    'b) Proper Place does not provide planning advice, does not verify planning status, and makes no representation whatsoever that any listing on the platform has the benefit of planning permission or any other regulatory approval.\n\n'
                    'c) If your land or premises is subject to any covenants, tenancy agreements, leasehold conditions, licensing conditions, premises licence restrictions, or other restrictions that may affect your ability to host Guests, it is your sole responsibility to obtain all necessary consents, permissions, and approvals before listing your site.\n\n'
                    'd) You are responsible for complying with all applicable health and safety legislation, fire safety regulations, environmental regulations, waste management regulations, noise regulations, and any licensing requirements that may apply to your site.\n\n'
                    'e) YOU ACCEPT THAT IF YOUR LOCAL PLANNING AUTHORITY, COUNCIL, OR ANY OTHER REGULATORY BODY TAKES ENFORCEMENT ACTION AGAINST YOUR SITE, YOU ACCEPT FULL AND SOLE RESPONSIBILITY FOR ALL CONSEQUENCES. Proper Place shall bear absolutely no liability for any loss of income, fines, legal costs, or consequential losses arising from planning enforcement.\n\n'
                    'f) You agree to indemnify and hold Proper Place harmless from and against any and all claims, demands, actions, damages, losses, costs, and expenses arising from or connected with any planning enforcement action or regulatory non-compliance.\n\n'
                    'g) You warrant that, to the best of your knowledge, offering your site does not breach any planning restriction or regulatory requirement currently in force.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('4. Payment Terms'),
                  _sectionText(
                    'a) All bookings are processed via Stripe, a PCI-DSS compliant third-party payment processor. Proper Place does not process, hold, or have custody of any Guest funds.\n\n'
                    'b) A payment authorisation hold is placed on the Guest\'s card at the time of booking via Stripe. The charge is only captured once you approve the booking.\n\n'
                    'c) All funds from captured payments are held by Stripe until the booking is completed.\n\n'
                    'd) Proper Place charges a platform commission of 15% on each completed booking, deducted by Stripe before your payout.\n\n'
                    'e) Payouts are processed via Stripe Connect. You must set up a valid Stripe Connect account to receive payouts.\n\n'
                    'f) The maximum nightly rate permitted on the platform is £20 per night.\n\n'
                    'g) You are solely responsible for declaring all income received through the platform to the relevant tax authority.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('5. Limitation of Liability & Indemnity'),
                  _sectionText(
                    'a) Proper Place acts solely as a technology platform connecting Hosts and Guests. We do not own, manage, inspect, or control any listed site.\n\n'
                    'b) TO THE FULLEST EXTENT PERMITTED BY LAW, PROPER PLACE ACCEPTS NO RESPONSIBILITY OR LIABILITY FOR: personal injury, property damage, illness, vehicle accidents, loss of income, business interruption, disputes between Host and Guest, theft, or damage to Guest property while on your site.\n\n'
                    'c) You acknowledge that Proper Place does not inspect, visit, certify, or approve the physical condition of any site.\n\n'
                    'd) You agree to indemnify, defend, and hold harmless Proper Place from and against any and all claims arising out of or in connection with your listing or the use of your site by any Guest.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('6. Cancellations & Refunds'),
                  _sectionText(
                    'a) If a Guest cancels a confirmed booking, refund terms are handled in accordance with the Proper Place cancellation policy.\n\n'
                    'b) If you cancel a confirmed booking, the Guest will receive a full refund. Repeated cancellations may result in your listing being suspended.\n\n'
                    'c) Proper Place reserves the right to issue refunds in exceptional circumstances at its sole discretion.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('7. Listing Standards & Removal'),
                  _sectionText(
                    'a) All new listings and significant edits are subject to review and approval by Proper Place.\n\n'
                    'b) Proper Place reserves the right to reject, suspend, or permanently remove any listing at its sole discretion.\n\n'
                    'c) Proper Place reserves the right to suspend or terminate your Host account if you breach any term of this Agreement.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('8. Reviews & Ratings'),
                  _sectionText(
                    'a) Guests may leave reviews and ratings for your site after their stay. These are published publicly and cannot be removed unless they violate our content policies.\n\n'
                    'b) You may report reviews that you believe are fraudulent or abusive.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('9. Data Protection'),
                  _sectionText(
                    'a) Both parties agree to comply with the UK GDPR and the Data Protection Act 2018.\n\n'
                    'b) Any personal data shared with you about Guests must be used solely for fulfilling the booking and must not be shared with third parties or retained longer than necessary.\n\n'
                    'c) Full details of how Proper Place handles personal data are set out in our Privacy Policy at proper-place.co.uk/privacy.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('10. Term & Termination'),
                  _sectionText(
                    'a) This Agreement takes effect when you accept it and remains in force for as long as you have an active listing.\n\n'
                    'b) Either party may terminate this Agreement at any time. You may do so by removing all listings and contacting us.\n\n'
                    'c) On termination, pending bookings must be honoured or properly cancelled. Outstanding payouts will be processed.\n\n'
                    'd) Proper Place reserves the right to suspend, wind down, or permanently cease operation of the platform at any time. Proper Place shall bear no liability for any loss arising from the platform ceasing to operate.\n\n'
                    'e) Clauses relating to limitation of liability, indemnity, regulatory compliance, and assumption of risk shall survive termination.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('11. Amendments'),
                  _sectionText(
                    'Proper Place reserves the right to update this Agreement from time to time. We will notify you of any material changes. Continued use of the platform after changes take effect constitutes acceptance.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('12. Assumption of Risk & Visitor Safety'),
                  _sectionText(
                    'a) You acknowledge that hosting Guests inherently involves risks, including personal injury, property damage, and other hazards associated with outdoor or private land environments.\n\n'
                    'b) You accept full and sole responsibility for the safety of all persons who visit your site as a result of a booking.\n\n'
                    'c) You are responsible for conducting your own risk assessment and for taking all reasonable measures to prevent foreseeable harm.\n\n'
                    'd) Proper Place has no ability to assess, inspect, monitor, or verify the physical safety of your site.\n\n'
                    'e) In the event of any injury, illness, death, or harm on or in connection with your site, you will not seek to hold Proper Place liable and will indemnify Proper Place against any and all claims.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('13. Governing Law'),
                  _sectionText(
                    'This Agreement is governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
                  ),
                  const SizedBox(height: 24),

                  // Signature section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: const Text(
                      'By signing below, you confirm that you have read and understood this Host Agreement in its entirety and agree to be bound by all its terms and conditions.',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Signature pad
                  const Text(
                    'Your Signature',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 150,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _hasSigned ? const Color(0xFF5B8FC4) : Colors.grey.shade300,
                        width: _hasSigned ? 2 : 1,
                      ),
                    ),
                    child: Stack(
                      children: [
                        GestureDetector(
                          onPanStart: (details) {
                            setState(() {
                              _currentStroke = [details.localPosition];
                              _strokes.add(_currentStroke);
                            });
                          },
                          onPanUpdate: (details) {
                            setState(() {
                              _currentStroke.add(details.localPosition);
                              _hasSigned = true;
                            });
                          },
                          onPanEnd: (details) {
                            _currentStroke = [];
                          },
                          child: CustomPaint(
                            painter: _SignaturePainter(strokes: _strokes),
                            size: Size.infinite,
                          ),
                        ),
                        if (!_hasSigned)
                          Center(
                            child: Text(
                              'Sign here with your finger',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 16,
                              ),
                            ),
                          ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: _clearSignature,
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.grey[100],
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.refresh, size: 18, color: Colors.grey[600]),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Need help banner
                  GestureDetector(
                    onTap: _contactAdmin,
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F5F0),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE0D5C5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.support_agent, color: Color(0xFF5B8FC4), size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Need help?',
                                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                ),
                                Text(
                                  'Contact us if you have questions about the agreement',
                                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right, color: Colors.grey[400]),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
          // Bottom bar
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: () => setState(() => _agreed = !_agreed),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _agreed,
                        onChanged: (v) => setState(() => _agreed = v ?? false),
                        activeColor: const Color(0xFF5B8FC4),
                      ),
                      const Expanded(
                        child: Text(
                          'I have read and agree to the Host Agreement',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _agreed && _hasSigned && !_submitting
                        ? _acceptContract
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5B8FC4),
                      disabledBackgroundColor: Colors.grey[300],
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2),
                          )
                        : const Text(
                            'Sign & Accept',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _sectionText(String text) {
    return Text(
      text,
      style: const TextStyle(fontSize: 14, height: 1.6, color: Colors.black87),
    );
  }

  String _getContractPlainText() {
    return '''PROPER PLACE HOST AGREEMENT
Version 1.0 — Effective from 30 March 2026

This Host Agreement ("Agreement") is entered into between you ("Host", "you") and Proper Place Ltd ("Proper Place", "we", "us", "the Platform"). By listing a site on the Proper Place platform, you confirm that you have read, understood, and agree to be bound by the following terms.

1. THE PLATFORM
Proper Place is an online marketplace that connects motorhome, campervan, and caravan owners ("Guests") with landowners, publicans, farmers, and other property holders ("Hosts") who wish to offer overnight parking or short-stay pitches on their land.

2. HOST RESPONSIBILITIES
As a Host, you agree that you are the legal owner of or have the right to offer the listed site, all information is accurate, you are responsible for site safety, you maintain public liability insurance, and you will respond to guests in a timely manner.

3. PLANNING & REGULATORY COMPLIANCE
It is your sole responsibility to ensure compliance with all applicable planning regulations, bylaws, and land use restrictions. Proper Place does not verify planning status.

4. PAYMENT TERMS
All payments are processed via Stripe. Proper Place charges 15% commission on completed bookings. Maximum nightly rate is £20.

5. LIMITATION OF LIABILITY & INDEMNITY
Proper Place acts solely as a technology platform. You agree to indemnify Proper Place from claims arising from your listing or site.

6. CANCELLATIONS & REFUNDS
Guest cancellations follow the platform cancellation policy. Host cancellations result in full guest refunds.

7. LISTING STANDARDS & REMOVAL
All listings are subject to review. Proper Place may remove listings at its discretion.

8. REVIEWS & RATINGS
Guests may leave reviews after their stay.

9. DATA PROTECTION
Both parties agree to comply with UK GDPR and the Data Protection Act 2018.

10. TERM & TERMINATION
This Agreement remains in force while you have an active listing. Either party may terminate at any time.

11. AMENDMENTS
Proper Place may update this Agreement with notice.

12. ASSUMPTION OF RISK & VISITOR SAFETY
You accept full responsibility for the safety of all visitors to your site.

13. GOVERNING LAW
This Agreement is governed by the laws of England and Wales.
''';
  }
}

/// Custom painter for rendering signature strokes
class _SignaturePainter extends CustomPainter {
  final List<List<Offset>> strokes;

  _SignaturePainter({required this.strokes});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path();
      path.moveTo(stroke.first.dx, stroke.first.dy);
      for (int i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}
