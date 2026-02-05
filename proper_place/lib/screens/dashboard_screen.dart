import 'package:flutter/material.dart';

class DashboardScreen extends StatefulWidget {
  final Function(int) onTabChanged;

  const DashboardScreen({
    super.key,
    required this.onTabChanged,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const SizedBox.shrink(),
        title: const Text(
          'Dashboard',
          style: TextStyle(
            color: Colors.black,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Unread Messages Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(3); // Reviews tab
            },
            child: _buildMetricCard(
              title: 'Unread Messages',
              value: '0',
              icon: Icons.chat_bubble_outline,
              backgroundColor: const Color(0xFFD4E4F7),
              iconColor: const Color(0xFF3B82F6),
            ),
          ),
          const SizedBox(height: 12),

          // Manage Bookings Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(2); // Bookings tab
            },
            child: _buildMetricCard(
              title: 'Manage Bookings',
              value: '0',
              icon: Icons.calendar_today_outlined,
              backgroundColor: const Color(0xFFD1FAE5),
              iconColor: const Color(0xFF10B981),
            ),
          ),
          const SizedBox(height: 12),

          // Pending Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(1); // My Places tab
            },
            child: _buildMetricCard(
              title: 'Pending',
              value: '0',
              icon: Icons.trending_up_outlined,
              backgroundColor: const Color(0xFFFEF08A),
              iconColor: const Color(0xFFEAB308),
            ),
          ),
          const SizedBox(height: 12),

          // Pending Payments Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(2); // Bookings tab
            },
            child: _buildMetricCard(
              title: 'Pending Payments',
              value: '£0.00',
              icon: Icons.schedule_outlined,
              backgroundColor: const Color(0xFFFFEDD5),
              iconColor: const Color(0xFFF97316),
            ),
          ),
          const SizedBox(height: 12),

          // Sales Summary Card
          GestureDetector(
            onTap: () {
              widget.onTabChanged(1); // My Places tab
            },
            child: _buildMetricCard(
              title: 'Sales Summary',
              value: '',
              icon: Icons.visibility_outlined,
              backgroundColor: const Color(0xFFE9D5FF),
              iconColor: const Color(0xFFA855F7),
              showValue: false,
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required IconData icon,
    required Color backgroundColor,
    required Color iconColor,
    bool showValue = true,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              if (showValue)
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
          Container(
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(16),
            child: Icon(
              icon,
              color: iconColor,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }
}
