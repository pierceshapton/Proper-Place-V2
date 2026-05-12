import 'package:flutter/material.dart';
import 'package:proper_place/services/api_service.dart';
import 'package:url_launcher/url_launcher.dart';

class AdminUserManagementScreen extends StatefulWidget {
  const AdminUserManagementScreen({super.key});

  @override
  State<AdminUserManagementScreen> createState() => _AdminUserManagementScreenState();
}

class _AdminUserManagementScreenState extends State<AdminUserManagementScreen> {
  List<dynamic> _users = [];
  bool _loading = true;
  String _search = '';
  String _error = '';

  String _fmtDate(dynamic value) {
    final raw = value?.toString() ?? '';
    if (raw.length >= 10) return raw.substring(0, 10);
    return raw.isEmpty ? '—' : raw;
  }

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final users = await ApiService.getAdminUsers();
      if (!mounted) return;
      setState(() {
        _users = users;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load users: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _showUserDetails(Map<String, dynamic> user) async {
    final details = await ApiService.getAdminUserDetails(userId: user['id'] as int);
    if (!mounted) return;

    final Map<String, dynamic> detailUser = details['user'] as Map<String, dynamic>? ?? user;
    final List<dynamic> bookings = details['bookings'] as List<dynamic>? ?? [];

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(detailUser['name']?.toString() ?? 'User Details'),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Email: ${detailUser['email'] ?? '—'}'),
                const SizedBox(height: 4),
                Text('Phone: ${detailUser['phone'] ?? '—'}'),
                const SizedBox(height: 4),
                Text('Role: ${detailUser['role'] ?? '—'}'),
                const SizedBox(height: 4),
                Text('Joined: ${_fmtDate(detailUser['created_at'])}'),
                const SizedBox(height: 14),
                Text(
                  'Bookings and stays (${bookings.length})',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                if (bookings.isEmpty)
                  const Text('No bookings found.')
                else
                  ...bookings.map((b) {
                    final booking = b as Map<String, dynamic>;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${booking['place_name'] ?? 'Unknown place'}${booking['place_city'] != null ? ', ${booking['place_city']}' : ''}',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text('Check-in: ${_fmtDate(booking['check_in_date'])}'),
                          Text('Check-out: ${_fmtDate(booking['check_out_date'])}'),
                          Text('Status: ${booking['status'] ?? '—'}'),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete account?'),
        content: Text('Delete ${user['name'] ?? user['email']} permanently?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ApiService.deleteAdminUser(userId: user['id'] as int);
      await _loadUsers();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User deleted successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete user: $e')),
      );
    }
  }

  Future<void> _changeRole(Map<String, dynamic> user, String role) async {
    try {
      await ApiService.updateAdminUserRole(userId: user['id'] as int, role: role);
      await _loadUsers();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update role: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _users.where((u) {
      final name = (u['name'] ?? '').toString().toLowerCase();
      final email = (u['email'] ?? '').toString().toLowerCase();
      final q = _search.toLowerCase();
      return q.isEmpty || name.contains(q) || email.contains(q);
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search users by name or email',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          if (_error.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error, style: const TextStyle(color: Color(0xFFB91C1C))),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final u = filtered[index] as Map<String, dynamic>;
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                u['name']?.toString() ?? 'Unknown User',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(u['email']?.toString() ?? ''),
                              const SizedBox(height: 4),
                              Text('Joined: ${_fmtDate(u['created_at'])}'),
                              Text('Bookings: ${(u['bookings_count'] ?? 0).toString()}'),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  OutlinedButton(
                                    onPressed: () => _showUserDetails(u),
                                    child: const Text('Details'),
                                  ),
                                  OutlinedButton(
                                    onPressed: () async {
                                      final uri = Uri(scheme: 'mailto', path: u['email']?.toString() ?? '');
                                      if (await canLaunchUrl(uri)) {
                                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                                      }
                                    },
                                    child: const Text('Contact'),
                                  ),
                                  DropdownButton<String>(
                                    value: (u['role'] ?? 'user').toString(),
                                    items: const [
                                      DropdownMenuItem(value: 'user', child: Text('User')),
                                      DropdownMenuItem(value: 'host', child: Text('Host')),
                                      DropdownMenuItem(value: 'admin', child: Text('Admin')),
                                    ],
                                    onChanged: (value) {
                                      if (value != null) {
                                        _changeRole(u, value);
                                      }
                                    },
                                  ),
                                  ElevatedButton(
                                    onPressed: () => _deleteUser(u),
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                    child: const Text('Delete'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
