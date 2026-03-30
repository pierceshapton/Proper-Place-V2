import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HostContractScreen extends StatefulWidget {
  const HostContractScreen({super.key});

  @override
  State<HostContractScreen> createState() => _HostContractScreenState();
}

class _HostContractScreenState extends State<HostContractScreen> {
  bool _agreed = false;
  bool _submitting = false;
  final ScrollController _scrollController = ScrollController();
  bool _hasScrolledToBottom = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 50) {
      if (!_hasScrolledToBottom) {
        setState(() => _hasScrolledToBottom = true);
      }
    }
  }

  Future<void> _acceptContract() async {
    setState(() => _submitting = true);
    try {
      await ApiService.acceptHostContract(version: '1.0');
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Host Agreement'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0.5,
      ),
      backgroundColor: Colors.white,
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              controller: _scrollController,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Center(
                    child: Icon(Icons.handshake_outlined,
                        size: 48, color: Colors.blue),
                  ),
                  const SizedBox(height: 12),
                  const Center(
                    child: Text(
                      'Proper Place Host Agreement',
                      style:
                          TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
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
                    'd) You will maintain appropriate public liability insurance for your site that covers the use of your land by visiting motorhome/campervan/caravan owners. Proper Place does not provide insurance cover of any kind.\n\n'
                    'e) You will respond to booking requests and guest enquiries in a timely and professional manner.\n\n'
                    'f) You will treat all Guests fairly and will not discriminate on the grounds of race, gender, sexuality, disability, religion, or any other protected characteristic.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('3. Planning & Regulatory Compliance'),
                  _sectionText(
                    'You acknowledge and agree that:\n\n'
                    'a) It is your sole responsibility to ensure that offering your site for motorhome/campervan/caravan parking complies with all applicable local planning regulations, bylaws, land use restrictions, zoning requirements, and any other relevant laws or regulations in your jurisdiction.\n\n'
                    'b) If your land is subject to any covenants, tenancy agreements, leasehold conditions, or other restrictions that may affect your ability to host Guests, it is your responsibility to obtain any necessary consents before listing your site.\n\n'
                    'c) You are responsible for complying with all applicable health and safety legislation, fire safety regulations, environmental regulations, and any licensing requirements that may apply to your site.\n\n'
                    'd) Proper Place accepts no responsibility whatsoever for any fines, penalties, enforcement action, or legal proceedings that may arise from your failure to comply with planning regulations or any other laws. You agree to indemnify and hold Proper Place harmless from any claims arising from regulatory non-compliance.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('4. Payment Terms'),
                  _sectionText(
                    'a) All bookings made through the Proper Place platform are processed via our secure payment system (Stripe). Guests pay at the time of booking.\n\n'
                    'b) A payment hold is placed on the Guest\'s card at the time of booking. The charge is only captured once you, the Host, approve the booking. If you reject a booking, the hold is released and the Guest is not charged.\n\n'
                    'c) Proper Place charges a platform commission of 15% on each completed booking. This commission is deducted before your payout.\n\n'
                    'd) Payouts to Hosts are processed via Stripe Connect. You must set up a valid Stripe Connect account to receive payouts. Proper Place is not responsible for delays caused by incomplete or incorrect payment account details.\n\n'
                    'e) The maximum nightly rate permitted on the platform is £20 per night. Proper Place reserves the right to amend this cap with reasonable notice.\n\n'
                    'f) You are solely responsible for declaring all income received through the platform to the relevant tax authority (e.g., HMRC) and for paying any tax due. Proper Place does not provide tax advice.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('5. Limitation of Liability & Indemnity'),
                  _sectionText(
                    'a) Proper Place acts solely as a technology platform connecting Hosts and Guests. We are not a party to any arrangement between you and any Guest. We do not own, manage, or control any listed site.\n\n'
                    'b) PROPER PLACE ACCEPTS ABSOLUTELY NO RESPONSIBILITY OR LIABILITY FOR:\n\n'
                    '    • Any damage to your property, land, site, or any structures, fixtures, or fittings, howsoever caused, including but not limited to damage caused by Guests, their vehicles, passengers, pets, or any third party.\n\n'
                    '    • Any personal injury, death, or illness suffered by any person on or around your site, including Guests, their passengers, or any third party.\n\n'
                    '    • Any loss of income, business interruption, or consequential loss arising from the use of the platform, technical failures, booking cancellations, or any other cause.\n\n'
                    '    • Any dispute between you and a Guest, including but not limited to disputes about site conditions, noise, behaviour, damage, refunds, or any other matter.\n\n'
                    '    • Any theft, loss, or damage to Guest property, vehicles, or possessions while on your site.\n\n'
                    'c) You agree to indemnify, defend, and hold harmless Proper Place, its directors, officers, employees, and agents from and against any and all claims, demands, actions, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with:\n\n'
                    '    • Your listing or the use of your site by any Guest.\n'
                    '    • Your breach of this Agreement.\n'
                    '    • Your failure to comply with any applicable laws, regulations, or planning requirements.\n'
                    '    • Any claim by a Guest or third party related to conditions on your site.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('6. Cancellations & Refunds'),
                  _sectionText(
                    'a) If a Guest cancels a confirmed booking, refund terms are handled in accordance with the Proper Place cancellation policy as published on the platform.\n\n'
                    'b) If you, the Host, cancel a confirmed booking, the Guest will receive a full refund. Repeated cancellations by a Host may result in your listing being suspended or removed.\n\n'
                    'c) Proper Place reserves the right to issue refunds to Guests in exceptional circumstances at its sole discretion, including where a site is materially different from its listing description.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('7. Listing Standards & Removal'),
                  _sectionText(
                    'a) All new listings and significant edits to existing listings are subject to review and approval by Proper Place before they become visible to Guests.\n\n'
                    'b) Proper Place reserves the right to reject, suspend, or permanently remove any listing at its sole discretion, including but not limited to listings that are inaccurate, misleading, unsafe, in violation of planning regulations, or that receive persistent negative reviews.\n\n'
                    'c) Proper Place reserves the right to suspend or terminate your Host account if you breach any term of this Agreement, engage in fraudulent or dishonest activity, or behave in a manner that brings the platform into disrepute.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('8. Reviews & Ratings'),
                  _sectionText(
                    'a) Guests may leave reviews and ratings for your site after their stay. These reviews are published publicly and cannot be removed by Hosts unless they violate Proper Place\'s content policies.\n\n'
                    'b) You may report reviews that you believe are fraudulent, abusive, or in breach of our policies. Proper Place will review such reports at its discretion.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('9. Data Protection'),
                  _sectionText(
                    'a) Both parties agree to comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.\n\n'
                    'b) Any personal data shared with you about Guests (names, vehicle details, contact information) must be used solely for the purpose of fulfilling the booking and must not be shared with third parties, used for marketing, or retained longer than reasonably necessary.\n\n'
                    'c) Full details of how Proper Place handles personal data are set out in our Privacy Policy at proper-place.co.uk/privacy.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('10. Term & Termination'),
                  _sectionText(
                    'a) This Agreement takes effect when you accept it and remains in force for as long as you have an active listing on the Proper Place platform.\n\n'
                    'b) Either party may terminate this Agreement at any time. You may do so by removing all your listings and contacting us to close your Host account.\n\n'
                    'c) On termination, any pending bookings must be honoured or properly cancelled in accordance with the cancellation policy. Proper Place will process any outstanding payouts owed to you.\n\n'
                    'd) Clauses relating to limitation of liability, indemnity, and regulatory compliance shall survive termination of this Agreement.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('11. Amendments'),
                  _sectionText(
                    'Proper Place reserves the right to update this Agreement from time to time. We will notify you of any material changes via email or in-app notification. Continued use of the platform after changes take effect constitutes acceptance of the revised Agreement.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('12. Governing Law'),
                  _sectionText(
                    'This Agreement is governed by and construed in accordance with the laws of England and Wales. Any disputes arising from this Agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: const Text(
                      'By accepting below, you confirm that you have read and understood this Host Agreement in its entirety and agree to be bound by all its terms and conditions.',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          height: 1.5),
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
                  onTap: _hasScrolledToBottom
                      ? () => setState(() => _agreed = !_agreed)
                      : null,
                  child: Row(
                    children: [
                      Checkbox(
                        value: _agreed,
                        onChanged: _hasScrolledToBottom
                            ? (v) => setState(() => _agreed = v ?? false)
                            : null,
                        activeColor: Colors.blue,
                      ),
                      Expanded(
                        child: Text(
                          _hasScrolledToBottom
                              ? 'I have read and agree to the Host Agreement'
                              : 'Please scroll to the bottom to continue',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _hasScrolledToBottom
                                ? Colors.black87
                                : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed:
                        _agreed && !_submitting ? _acceptContract : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
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
                            'Accept & Continue',
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
}
