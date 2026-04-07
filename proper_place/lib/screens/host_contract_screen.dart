import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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
        // Show payout setup screen as the natural next step
        await _showPayoutSetup();
        if (mounted) Navigator.pop(context, true);
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

  /// Show full-screen payout setup after contract is signed
  Future<void> _showPayoutSetup() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const _PayoutSetupScreen(),
      ),
    );
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
                    'd) You will maintain appropriate public liability insurance for your site that covers the use of your land by visiting motorhome/campervan/caravan owners and their passengers. Proper Place does not provide insurance cover of any kind and strongly recommends a minimum of £1,000,000 public liability cover.\n\n'
                    'e) You accept a duty of care to all visitors to your site. You must take all reasonable steps to identify and mitigate hazards on or around your site, including but not limited to: uneven ground, open water, unfenced drops, unstable structures, low-hanging branches, poor lighting, slippery surfaces, and any other conditions that could cause injury. Where hazards cannot be eliminated, you must provide adequate warnings.\n\n'
                    'f) You will respond to booking requests and guest enquiries in a timely and professional manner.\n\n'
                    'g) You will treat all Guests fairly and will not discriminate on the grounds of race, gender, sexuality, disability, religion, or any other protected characteristic.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('3. Planning & Regulatory Compliance'),
                  _sectionText(
                    'You acknowledge and agree that:\n\n'
                    'a) It is your sole and absolute responsibility to ensure that offering your site for motorhome/campervan/caravan parking complies with all applicable local planning regulations, bylaws, land use restrictions, zoning requirements, change-of-use requirements, environmental designations, conservation area restrictions, listed building constraints, and any other relevant laws or regulations in your jurisdiction. This obligation applies whether your site is private land, a pub, a farm, a car park, a business premises, or any other type of property.\n\n'
                    'b) Proper Place does not provide planning advice, does not verify planning status, and makes no representation whatsoever that any listing on the platform has the benefit of planning permission or any other regulatory approval. Our review and approval of your listing is limited to the information you submit and does not constitute confirmation that your site has planning consent or is lawfully permitted for the use you propose.\n\n'
                    'c) If your land or premises is subject to any covenants, tenancy agreements, leasehold conditions, licensing conditions, premises licence restrictions, or other restrictions that may affect your ability to host Guests, it is your sole responsibility to obtain all necessary consents, permissions, and approvals before listing your site. This includes but is not limited to: brewery or pub company consent, freeholder consent, local authority licensing, and any conditions attached to existing planning permissions.\n\n'
                    'd) You are responsible for complying with all applicable health and safety legislation, fire safety regulations, environmental regulations, waste management regulations, noise regulations, and any licensing requirements that may apply to your site.\n\n'
                    'e) YOU ACCEPT THAT IF YOUR LOCAL PLANNING AUTHORITY, COUNCIL, OR ANY OTHER REGULATORY BODY TAKES ENFORCEMENT ACTION AGAINST YOUR SITE — INCLUDING BUT NOT LIMITED TO ISSUING ENFORCEMENT NOTICES, STOP NOTICES, BREACH OF CONDITION NOTICES, PLANNING CONTRAVENTION NOTICES, OR ANY ORDER REQUIRING YOU TO CEASE THE USE OF YOUR SITE FOR MOTORHOME/CAMPERVAN/CARAVAN HOSTING — YOU ACCEPT FULL AND SOLE RESPONSIBILITY FOR ALL CONSEQUENCES. Proper Place shall bear absolutely no liability for:\n\n'
                    '    • Any loss of income or revenue resulting from the closure, suspension, or restriction of your site due to planning enforcement or any other regulatory action.\n\n'
                    '    • Any fines, penalties, legal costs, or expenses imposed on you as a result of operating without the required planning permission or in breach of planning conditions.\n\n'
                    '    • Any costs incurred in applying for retrospective planning permission, appealing enforcement action, or making changes to your site to achieve compliance.\n\n'
                    '    • Any consequential, indirect, or special losses of any kind arising from planning enforcement, including but not limited to: loss of business, reputational damage, loss of opportunity, costs of alternative arrangements, or any other financial loss.\n\n'
                    '    • Any claims made against you by Guests who had bookings at your site that could not be honoured due to planning enforcement or site closure.\n\n'
                    'f) You agree to indemnify and hold Proper Place harmless from and against any and all claims, demands, actions, damages, losses, costs, and expenses (including reasonable legal fees) arising from or connected with any planning enforcement action, regulatory non-compliance, or any claim by a third party (including Guests) that arises from your failure to hold the required planning permissions or regulatory approvals.\n\n'
                    'g) You warrant and represent that, to the best of your knowledge, offering your site for motorhome/campervan/caravan parking does not breach any planning restriction, enforcement order, or regulatory requirement currently in force. If at any time you become aware that your use may be in breach of planning regulations, you must immediately notify Proper Place and suspend your listing.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('4. Payment Terms'),
                  _sectionText(
                    'a) All bookings made through the Proper Place platform are processed via Stripe, a PCI-DSS compliant third-party payment processor. Proper Place does not process, hold, or have custody of any Guest funds at any stage of the transaction.\n\n'
                    'b) A payment authorisation hold is placed on the Guest\'s card at the time of booking via Stripe. The charge is only captured by Stripe once you, the Host, approve the booking. If you reject a booking, the hold is released by Stripe and the Guest is not charged.\n\n'
                    'c) All funds from captured payments are held by Stripe — not by Proper Place — until the booking is completed. This holding period serves as protection for both Hosts and Guests. Proper Place never holds, controls, or has access to Guest funds.\n\n'
                    'd) Proper Place charges a platform commission of 15% on each completed booking. This commission is deducted by Stripe before your payout.\n\n'
                    'e) Payouts to Hosts are processed via Stripe Connect. You must set up a valid Stripe Connect account to receive payouts. Proper Place is not responsible for delays caused by incomplete or incorrect payment account details.\n\n'
                    'f) The maximum nightly rate permitted on the platform is £20 per night. Proper Place reserves the right to amend this cap with reasonable notice.\n\n'
                    'g) You are solely responsible for declaring all income received through the platform to the relevant tax authority (e.g., HMRC) and for paying any tax due. Proper Place does not provide tax advice.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('5. Limitation of Liability & Indemnity'),
                  _sectionText(
                    'a) Proper Place acts solely as a technology platform connecting Hosts and Guests. We are not a party to any arrangement between you and any Guest. We do not own, manage, inspect, or control any listed site. We have no oversight of site conditions and make no representations or warranties about the safety, suitability, or legality of any site.\n\n'
                    'b) TO THE FULLEST EXTENT PERMITTED BY LAW, PROPER PLACE, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES ACCEPT ABSOLUTELY NO RESPONSIBILITY OR LIABILITY FOR:\n\n'
                    '    • Any personal injury, bodily harm, death, or illness suffered by any person on or around your site, whether Guest, passenger, child, pet owner, visitor, trespasser, or any third party, howsoever and whensoever caused, including but not limited to injuries arising from slips, trips, falls, uneven terrain, open water, animal encounters, adverse weather, fire, structural collapse, vehicle movement, or any other cause.\n\n'
                    '    • Any damage to your property, land, site, or any structures, fixtures, or fittings, howsoever caused, including but not limited to damage caused by Guests, their vehicles, passengers, pets, or any third party.\n\n'
                    '    • Any allergic reaction, illness, food poisoning, infection, insect bite, or other health issue suffered by any person during or after a stay at your site.\n\n'
                    '    • Any accident, injury, or damage involving vehicles (including motorhomes, campervans, caravans, towing vehicles, bicycles, or any other vehicle) on, entering, or leaving your site.\n\n'
                    '    • Any loss of income, business interruption, or consequential loss arising from the use of the platform, technical failures, booking cancellations, or any other cause.\n\n'
                    '    • Any dispute between you and a Guest, including but not limited to disputes about site conditions, noise, behaviour, damage, refunds, or any other matter.\n\n'
                    '    • Any theft, loss, or damage to Guest property, vehicles, or possessions while on your site.\n\n'
                    '    • Any injury to or caused by animals (including pets, livestock, or wildlife) on or near your site.\n\n'
                    'c) You acknowledge that Proper Place does not inspect, visit, certify, or approve the physical condition of any site. Listing approval is a review of submitted information only and does not constitute an endorsement of safety or suitability.\n\n'
                    'd) You agree to indemnify, defend, and hold harmless Proper Place, its directors, officers, employees, and agents from and against any and all claims, demands, actions, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with:\n\n'
                    '    • Any personal injury, death, illness, or bodily harm suffered by any person on or in connection with your site.\n'
                    '    • Your listing or the use of your site by any Guest.\n'
                    '    • Your breach of this Agreement.\n'
                    '    • Your failure to comply with any applicable laws, regulations, or planning requirements.\n'
                    '    • Any claim by a Guest or third party related to conditions on your site.\n'
                    '    • Any claim arising from your failure to maintain adequate insurance.\n\n'
                    'e) This indemnity applies regardless of whether the claim arises from your negligence, the negligence of any Guest, or any other cause, except to the extent that liability cannot be excluded by law.',
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
                    'c) On termination, any pending bookings must be honoured or properly cancelled in accordance with the cancellation policy. Proper Place will process any outstanding payouts owed to you for completed bookings.\n\n'
                    'd) Proper Place reserves the right to suspend, wind down, or permanently cease operation of the platform at any time and for any reason, including but not limited to commercial, financial, regulatory, or strategic reasons, with or without prior notice. In the event that Proper Place ceases to operate:\n\n'
                    '    • Proper Place shall bear no liability whatsoever for any loss of income, revenue, bookings, business, profits, or anticipated savings suffered by you as a result of the platform ceasing to operate.\n\n'
                    '    • Proper Place shall bear no liability for any consequential, indirect, or special losses of any kind, including but not limited to: loss of opportunity, costs of finding alternative booking platforms, marketing costs, reputational impact, loss of Guest relationships, or any other financial or non-financial loss.\n\n'
                    '    • You acknowledge that your business and income are not dependent on the continued operation of the Proper Place platform and that Proper Place makes no guarantee, representation, or warranty that the platform will continue to operate for any period of time.\n\n'
                    '    • Proper Place will use reasonable efforts to provide notice of any planned cessation but is not obligated to do so in all circumstances.\n\n'
                    '    • Proper Place will process any outstanding payouts owed to you for bookings that were completed before the platform ceased to operate, subject to available funds and Stripe processing timelines.\n\n'
                    'e) You agree that you shall have no claim against Proper Place, its directors, officers, shareholders, employees, or agents for any losses arising from the closure, suspension, or discontinuation of the platform.\n\n'
                    'f) Clauses relating to limitation of liability, indemnity, regulatory compliance, and assumption of risk shall survive termination of this Agreement.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('11. Amendments'),
                  _sectionText(
                    'Proper Place reserves the right to update this Agreement from time to time. We will notify you of any material changes via email or in-app notification. Continued use of the platform after changes take effect constitutes acceptance of the revised Agreement.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('12. Assumption of Risk & Visitor Safety'),
                  _sectionText(
                    'a) You acknowledge that hosting Guests on your land inherently involves risks, including but not limited to: risk of personal injury, property damage, vehicle accidents, encounters with animals or wildlife, adverse weather events, and other hazards associated with rural, outdoor, or private land environments.\n\n'
                    'b) You accept full and sole responsibility for the safety of all persons who visit your site as a result of a booking made through the Proper Place platform. This responsibility extends to Guests, their passengers (including children), pets, and any other persons accompanying or visiting the Guest.\n\n'
                    'c) You are responsible for conducting your own risk assessment of your site and for taking all reasonable and proportionate measures to prevent foreseeable harm. This includes but is not limited to: maintaining paths and access ways, securing or fencing hazardous areas, providing adequate lighting, warning of known hazards, and ensuring compliance with the Occupiers\' Liability Acts 1957 and 1984 (or equivalent legislation in your jurisdiction).\n\n'
                    'd) You accept that Proper Place has no ability to assess, inspect, monitor, or verify the physical safety or condition of your site at any time. Our listing review process is limited to the information you submit and does not constitute a safety inspection, certification, or endorsement.\n\n'
                    'e) In the event that any Guest, visitor, or third party suffers personal injury, illness, death, or any other harm on or in connection with your site, you agree that:\n\n'
                    '    • You will not seek to hold Proper Place liable in any way.\n'
                    '    • You will indemnify Proper Place against any and all claims, costs, and expenses arising from such events.\n'
                    '    • You will cooperate fully with any investigation by relevant authorities.\n'
                    '    • You will notify Proper Place promptly of any serious incident occurring on your site.\n\n'
                    'f) Nothing in this Agreement creates any duty of care owed by Proper Place to any Guest, visitor, or third party using or visiting your site.',
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('13. Governing Law'),
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

/// Screen shown immediately after contract acceptance to set up Stripe payouts
class _PayoutSetupScreen extends StatefulWidget {
  const _PayoutSetupScreen();

  @override
  State<_PayoutSetupScreen> createState() => _PayoutSetupScreenState();
}

class _PayoutSetupScreenState extends State<_PayoutSetupScreen> {
  bool _loading = false;

  Future<void> _setupStripe() async {
    setState(() => _loading = true);
    try {
      final url = await ApiService.setupPayoutAccount();
      if (!mounted) return;
      setState(() => _loading = false);
      if (url.isNotEmpty) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error setting up payouts: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
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
                'Agreement Signed!',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black),
              ),
              const SizedBox(height: 12),
              Text(
                'Now let\u2019s set up your payouts',
                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
              ),
              const SizedBox(height: 32),

              // Info cards
              _infoCard(
                Icons.account_balance_outlined,
                'Automatic Payouts',
                'After each booking is completed, your payout will be sent to your bank account automatically via Stripe.',
              ),
              const SizedBox(height: 12),
              _infoCard(
                Icons.schedule_outlined,
                'When You Get Paid',
                'Funds are held securely by Stripe (not Proper Place) until the guest\u2019s stay is complete. Once the booking concludes, your payout (minus 15% platform fee) is transferred automatically via Stripe.',
              ),
              const SizedBox(height: 12),
              _infoCard(
                Icons.security_outlined,
                'Secure & Simple',
                'Stripe handles everything \u2014 your bank details are never shared with us or guests. Setup takes about 2 minutes.',
              ),

              const Spacer(flex: 3),

              // Primary CTA
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _setupStripe,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7BA7D8),
                    disabledBackgroundColor: Colors.grey[300],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.account_balance, color: Colors.white, size: 20),
                            SizedBox(width: 8),
                            Text('Set Up Payouts', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),

              // Skip option
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  'I\u2019ll do this later',
                  style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'You can always set up payouts from your host settings.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey[400]),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
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
          Icon(icon, color: const Color(0xFF7BA7D8), size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black87)),
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
