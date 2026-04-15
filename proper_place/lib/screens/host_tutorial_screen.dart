import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

class HostTutorialScreen extends StatefulWidget {
  const HostTutorialScreen({super.key});

  @override
  State<HostTutorialScreen> createState() => _HostTutorialScreenState();
}

class _HostTutorialScreenState extends State<HostTutorialScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  late AnimationController _pulseController;
  late AnimationController _slideController;
  late AnimationController _floatController;
  late Animation<double> _pulseAnim;
  late Animation<Offset> _slideAnim;
  late Animation<double> _floatAnim;

  static const _pages = [
    _TutorialPageData(
      icon: CupertinoIcons.map_pin_ellipse,
      title: 'List Your Site',
      description:
          'Add your motorhome stopover with photos, pricing and facilities.\nGuests will discover you on the map.',
      color: Color(0xFF3D8B6E),
      hint: 'Tap "Sites" in the bottom bar',
      hintIcon: Icons.directions_bus,
    ),
    _TutorialPageData(
      icon: CupertinoIcons.calendar_badge_plus,
      title: 'Manage Bookings',
      description:
          'Accept or decline requests, chat with guests and track arrivals — all from your dashboard.',
      color: Color(0xFF4A7EB3),
      hint: 'Tap "Bookings" to view requests',
      hintIcon: CupertinoIcons.calendar,
    ),
    _TutorialPageData(
      icon: CupertinoIcons.chat_bubble_2,
      title: 'Chat with Guests',
      description:
          'Message guests directly about their stay. Coordinate arrivals, answer questions and share tips.',
      color: Color(0xFFD97706),
      hint: 'Tap "Chat" to start a conversation',
      hintIcon: CupertinoIcons.chat_bubble,
    ),
    _TutorialPageData(
      icon: CupertinoIcons.money_pound_circle,
      title: 'Get Paid',
      description:
          'Payments are processed securely through Stripe. After each completed stay, earnings go straight to your bank.',
      color: Color(0xFF7B61C4),
      hint: 'Earnings appear on your Dashboard',
      hintIcon: CupertinoIcons.house,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.15),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic),
    );
    _slideController.forward();

    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);
    _floatAnim = Tween<double>(begin: -6, end: 6).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _slideController.dispose();
    _floatController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  void _getStarted() {
    // Pop with result=true to signal "open site form"
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentPage == _pages.length - 1;
    final page = _pages[_currentPage];

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F6),
      body: Stack(
        children: [
          // Animated background blobs
          AnimatedBuilder(
            animation: _floatAnim,
            builder: (_, __) => Stack(
              children: [
                Positioned(
                  top: -80,
                  right: -60,
                  child: Transform.translate(
                    offset: Offset(0, _floatAnim.value),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 500),
                      width: 260,
                      height: 260,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            page.color.withOpacity(0.12),
                            page.color.withOpacity(0.0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -40,
                  left: -40,
                  child: Transform.translate(
                    offset: Offset(0, -_floatAnim.value),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 500),
                      width: 180,
                      height: 180,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            page.color.withOpacity(0.08),
                            page.color.withOpacity(0.0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Main content
          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                  child: Row(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: page.color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.landscape_outlined,
                            size: 24, color: page.color),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Welcome, Host!',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A2E),
                        ),
                      ),
                      const Spacer(),
                      if (!isLast)
                        GestureDetector(
                          onTap: _getStarted,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'Skip',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Step counter
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                  child: Row(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: page.color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Step ${_currentPage + 1} of ${_pages.length}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: page.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Pages
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: _pages.length,
                    onPageChanged: (i) {
                      setState(() => _currentPage = i);
                      _slideController.reset();
                      _slideController.forward();
                    },
                    itemBuilder: (_, i) {
                      final p = _pages[i];
                      return SlideTransition(
                        position: _slideAnim,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Animated icon with pulse ring
                              ScaleTransition(
                                scale: _pulseAnim,
                                child: Container(
                                  width: 120,
                                  height: 120,
                                  decoration: BoxDecoration(
                                    color: p.color.withOpacity(0.06),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: p.color.withOpacity(0.15),
                                      width: 2,
                                    ),
                                  ),
                                  child: Center(
                                    child: Container(
                                      width: 80,
                                      height: 80,
                                      decoration: BoxDecoration(
                                        color: p.color.withOpacity(0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(p.icon,
                                          size: 40, color: p.color),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 36),
                              Text(
                                p.title,
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1A1A2E),
                                  letterSpacing: -0.5,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 14),
                              Text(
                                p.description,
                                style: const TextStyle(
                                  fontSize: 15,
                                  color: Color(0xFF64748B),
                                  height: 1.6,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 28),
                              // "Where to find it" hint card
                              _buildHintCard(p),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // Bottom area: progress bar + buttons
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                  child: Column(
                    children: [
                      // Progress bar
                      _buildProgressBar(),
                      const SizedBox(height: 24),
                      // Buttons
                      if (isLast)
                        _buildGetStartedButton()
                      else
                        _buildNextButton(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHintCard(_TutorialPageData p) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: p.color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: p.color.withOpacity(0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: p.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(p.hintIcon, size: 20, color: p.color),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Where to find it',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: p.color.withOpacity(0.7),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  p.hint,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: p.color,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          AnimatedBuilder(
            animation: _pulseAnim,
            builder: (_, __) => Transform.translate(
              offset: Offset((_pulseAnim.value - 1.0) * 30, 0),
              child: Icon(
                CupertinoIcons.hand_point_left_fill,
                size: 18,
                color: p.color.withOpacity(0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    return Row(
      children: List.generate(
        _pages.length,
        (i) => Expanded(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 350),
            margin: EdgeInsets.only(right: i < _pages.length - 1 ? 6 : 0),
            height: 4,
            decoration: BoxDecoration(
              color: i <= _currentPage
                  ? _pages[_currentPage].color
                  : const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNextButton() {
    final page = _pages[_currentPage];
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _next,
        style: ElevatedButton.styleFrom(
          backgroundColor: page.color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Next',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            SizedBox(width: 8),
            Icon(CupertinoIcons.arrow_right, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildGetStartedButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _getStarted,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF3D8B6E),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 0,
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(CupertinoIcons.add_circled, size: 20),
            SizedBox(width: 10),
            Text(
              'Create Your First Site',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lightweight animated builder to avoid deprecated API
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext, Widget?) builder;
  final Widget? child;

  const AnimatedBuilder({
    super.key,
    required Animation<double> animation,
    required this.builder,
    this.child,
  }) : super(listenable: animation);

  @override
  Widget build(BuildContext context) => builder(context, child);
}

class _TutorialPageData {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final String hint;
  final IconData hintIcon;

  const _TutorialPageData({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.hint,
    required this.hintIcon,
  });
}
