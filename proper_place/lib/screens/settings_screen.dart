import 'package:flutter/material.dart';
import 'package:proper_place/services/storage_service.dart';

class SettingsScreen extends StatefulWidget {
  final String? userRole;
  final VoidCallback? onModeChanged;

  const SettingsScreen({
    super.key,
    this.userRole,
    this.onModeChanged,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool isHostMode = false;
  bool notificationsEnabled = true;
  bool darkMode = false;

  @override
  void initState() {
    super.initState();
    _loadHostMode();
  }

  Future<void> _loadHostMode() async {
    try {
      final hostMode = await StorageService.getHostMode();
      setState(() {
        isHostMode = hostMode;
      });
    } catch (e) {
    debugPrint('Error loading host mode: $e');
    }
  }

  Future<void> _toggleHostMode(bool value) async {
    try {
      await StorageService.setHostMode(value);
      setState(() {
        isHostMode = value;
      });
      // Notify parent to refresh navigation
      widget.onModeChanged?.call();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error changing mode: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Account Settings Section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Section header with gradient
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.person, color: Colors.white),
                      SizedBox(width: 12),
                      Text(
                        'Account Settings',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Email
                ListTile(
                  leading: const Icon(Icons.email_outlined),
                  title: const Text('Email'),
                  subtitle: const Text('your.email@example.com'),
                  trailing: const Icon(Icons.chevron_right),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 8),
                // Password
                ListTile(
                  leading: const Icon(Icons.lock_outlined),
                  title: const Text('Change Password'),
                  trailing: const Icon(Icons.chevron_right),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  onTap: () {},
                ),
                const SizedBox(height: 8),
                // Phone
                ListTile(
                  leading: const Icon(Icons.phone_outlined),
                  title: const Text('Phone Number'),
                  subtitle: const Text('+44 7000 000000'),
                  trailing: const Icon(Icons.chevron_right),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  onTap: () {},
                ),
              ],
            ),
          ),
          // Host Mode Section (only for hosts)
          if (widget.userRole == 'host')
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.store, color: Colors.white),
                        SizedBox(width: 12),
                        Text(
                          'Host Mode',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ListTile(
                      leading: const Icon(
                        Icons.toggle_off,
                        color: Color(0xFF7BA7D8),
                      ),
                      title: const Text(
                        'Switch to Host Mode',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        isHostMode
                            ? 'Currently viewing as host'
                            : 'Switch to manage your places and bookings',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Switch(
                        value: isHostMode,
                        onChanged: _toggleHostMode,
                        activeThumbColor: const Color(0xFF7BA7D8),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          // Preferences Section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.tune, color: Colors.white),
                      SizedBox(width: 12),
                      Text(
                        'Preferences',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.notifications_outlined),
                    title: const Text('Notifications'),
                    trailing: Switch(
                      value: notificationsEnabled,
                      onChanged: (value) {
                        setState(() => notificationsEnabled = value);
                      },
                      activeThumbColor: const Color(0xFF7BA7D8),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.dark_mode_outlined),
                    title: const Text('Dark Mode'),
                    trailing: Switch(
                      value: darkMode,
                      onChanged: (value) {
                        setState(() => darkMode = value);
                      },
                      activeThumbColor: const Color(0xFF7BA7D8),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.language),
                    title: const Text('Language'),
                    subtitle: const Text('English'),
                    trailing: const Icon(Icons.chevron_right),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    onTap: () {},
                  ),
                ),
              ],
            ),
          ),
          // Support Section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF7BA7D8), Color(0xFF6B96C8)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.help_outline, color: Colors.white),
                      SizedBox(width: 12),
                      Text(
                        'Support',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.help_center_outlined),
                    title: const Text('FAQ'),
                    trailing: const Icon(Icons.chevron_right),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    onTap: () {},
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.mail_outline),
                    title: const Text('Contact Support'),
                    trailing: const Icon(Icons.chevron_right),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    onTap: () {},
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: const Icon(Icons.info_outline),
                    title: const Text('About'),
                    subtitle: const Text('Version 1.0.0'),
                    trailing: const Icon(Icons.chevron_right),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    onTap: () {},
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
