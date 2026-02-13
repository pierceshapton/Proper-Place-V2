import 'package:flutter/material.dart';

class AdminDashboardScreen extends StatefulWidget {
  final Function(int)? onTabChanged;
  final Map<int, int>? badgeCounts;
  
  const AdminDashboardScreen({super.key, this.onTabChanged, this.badgeCounts});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        toolbarHeight: 48,
        leading: const SizedBox.shrink(),
        title: RichText(
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'Proper Place ',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
              TextSpan(
                text: 'Admin',
                style: TextStyle(
                  color: Color(0xFF3B82F6),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Simple header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dashboard',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Platform overview and quick actions',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Content cards
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                // Host Requests card
                _buildActionCard(
                  title: 'Host Requests',
                  description: 'Review and approve host applications',
                  image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
                  buttonLabel: 'Review Requests',
                  buttonColor: const Color(0xFFA855F7),
                  badgeCount: widget.badgeCounts?[1] ?? 0,
                  onTap: () {
                    // Switch to Requests tab (index 1)
                    widget.onTabChanged?.call(1);
                  },
                  textColor: Colors.black,
                ),
                const SizedBox(height: 16),

                // Approvals card
                _buildActionCard(
                  title: 'Approvals',
                  description: 'Review and approve new place submissions from hosts',
                  image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=200&fit=crop',
                  buttonLabel: 'Manage Approvals',
                  buttonColor: const Color(0xFF3B82F6),
                  badgeCount: widget.badgeCounts?[2] ?? 0,
                  onTap: () {
                    // Switch to Approvals tab (index 2)
                    widget.onTabChanged?.call(2);
                  },
                ),
                const SizedBox(height: 16),

                // Host Chat card
                _buildActionCard(
                  title: 'Host Chat',
                  description: 'Communicate with hosts via email',
                  image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
                  buttonLabel: 'Contact Hosts',
                  buttonColor: const Color(0xFF3B82F6),
                  badgeCount: widget.badgeCounts?[3] ?? 0,
                  onTap: () {
                    // Switch to Chat tab (index 3)
                    widget.onTabChanged?.call(3);
                  },
                ),
                const SizedBox(height: 16),

                // Host Invites card
                _buildActionCard(
                  title: 'Host Invites',
                  description: 'Send invitations to new hosts to join the platform',
                  image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=200&fit=crop',
                  buttonLabel: 'Manage Invites',
                  buttonColor: const Color(0xFFA855F7),
                  badgeCount: widget.badgeCounts?[4] ?? 0,
                  onTap: () {
                    // Switch to More tab (index 4)
                    widget.onTabChanged?.call(4);
                  },
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String description,
    required String image,
    required String buttonLabel,
    required Color buttonColor,
    required VoidCallback onTap,
    Color? textColor,
    int badgeCount = 0,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: textColor ?? Colors.black,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (badgeCount > 0)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      badgeCount > 99 ? '99+' : badgeCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
                fontWeight: FontWeight.w500,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onTap,
                icon: const Icon(Icons.shield_outlined),
                label: Text(buttonLabel),
                style: ElevatedButton.styleFrom(
                  backgroundColor: buttonColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
