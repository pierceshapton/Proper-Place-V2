import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AdminContactMessagesScreen extends StatefulWidget {
  const AdminContactMessagesScreen({super.key});

  @override
  State<AdminContactMessagesScreen> createState() => _AdminContactMessagesScreenState();
}

class _AdminContactMessagesScreenState extends State<AdminContactMessagesScreen> {
  List<dynamic> contacts = [];
  bool isLoading = true;
  String selectedStatus = 'new';
  String selectedCategory = 'hosts'; // 'hosts' or 'users'
  final List<String> statuses = ['new', 'read', 'responded', 'closed'];
  Map<String, String> statusLabels = {
    'new': 'New Messages',
    'read': 'Read',
    'responded': 'Responded',
    'closed': 'Closed',
  };

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    try {
      setState(() => isLoading = true);
      final response = await ApiService.getContacts(
        status: selectedStatus,
        limit: 50,
      );
      
      List<dynamic> allContacts = response['contacts'] ?? [];
      
      // Filter by category (hosts vs users)
      if (selectedCategory == 'hosts') {
        allContacts = allContacts.where((c) => c['user_role'] == 'host').toList();
      } else if (selectedCategory == 'users') {
        allContacts = allContacts.where((c) => c['user_role'] == 'user').toList();
      }
      
      setState(() {
        contacts = allContacts;
        isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading messages: $e'), backgroundColor: Colors.red),
        );
      }
      setState(() => isLoading = false);
    }
  }

  // Get urgency color based on score
  Color _getUrgencyColor(int score) {
    if (score >= 80) return Colors.red;
    if (score >= 60) return Colors.orange;
    if (score >= 40) return Colors.amber;
    return Colors.green;
  }

  // Get urgency label
  String _getUrgencyLabel(int score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

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
      body: SafeArea(
        child: Column(
          children: [
            // Category tabs (Host Chats vs User Chats)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    _buildCategoryTab('hosts', 'Host Chats', Icons.business),
                    const SizedBox(width: 8),
                    _buildCategoryTab('users', 'User Chats', Icons.person),
                  ],
                ),
              ),
            ),
            // Status filter tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: statuses.map((status) {
                    final isSelected = selectedStatus == status;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(statusLabels[status]!),
                        selected: isSelected,
                        backgroundColor: isSelected ? const Color(0xFF3B82F6) : Colors.grey[100],
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black,
                          fontWeight: FontWeight.w600,
                        ),
                        side: BorderSide(
                          color: isSelected ? Colors.transparent : const Color(0xFFE2E8F0),
                        ),
                        onSelected: (selected) {
                          setState(() => selectedStatus = status);
                          _loadContacts();
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            // Messages list
            Expanded(
              child: isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : contacts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.mail_outline, size: 64, color: Colors.grey[300]),
                              const SizedBox(height: 16),
                              Text(
                                'No ${statusLabels[selectedStatus]?.toLowerCase()} messages',
                                style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          itemCount: contacts.length,
                          itemBuilder: (context, index) {
                            final contact = contacts[index];
                            return _buildContactCard(contact);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard(dynamic contact) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ListTile(
        onTap: () => _showContactDetails(contact),
        leading: CircleAvatar(
          backgroundImage: contact['avatar_url'] != null
              ? NetworkImage(contact['avatar_url'])
              : null,
          child: contact['avatar_url'] == null
              ? Text(contact['name']?[0].toUpperCase() ?? 'U')
              : null,
        ),
        title: Text(
          contact['subject'] ?? 'No subject',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              contact['name'] ?? 'Unknown User',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 4),
            Text(
              contact['message'] ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: Colors.grey[700]),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _getUrgencyColor(contact['urgency_score'] ?? 0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _getUrgencyLabel(contact['urgency_score'] ?? 0),
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatDate(contact['created_at']),
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else {
        return '${diff.inDays}d ago';
      }
    } catch (e) {
      return dateStr;
    }
  }

  void _showContactDetails(dynamic contact) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => ContactDetailsSheet(
        contact: contact,
        onStatusChanged: () {
          _loadContacts();
        },
      ),
    );
  }

  Widget _buildUserInfo(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryTab(String categoryValue, String label, IconData icon) {
    final isSelected = selectedCategory == categoryValue;
    return GestureDetector(
      onTap: () {
        setState(() => selectedCategory = categoryValue);
        _loadContacts();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF3B82F6) : Colors.grey[100],
          border: isSelected ? null : Border.all(color: const Color(0xFFE2E8F0), width: 1),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: isSelected ? Colors.white : Colors.black),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ContactDetailsSheet extends StatefulWidget {
  final dynamic contact;
  final VoidCallback onStatusChanged;

  const ContactDetailsSheet({
    required this.contact,
    required this.onStatusChanged,
    super.key,
  });

  @override
  State<ContactDetailsSheet> createState() => _ContactDetailsSheetState();
}

class _ContactDetailsSheetState extends State<ContactDetailsSheet> {
  late TextEditingController _notesController;
  bool isUpdating = false;

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.contact['admin_notes'] ?? '');
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(String newStatus) async {
    try {
      setState(() => isUpdating = true);
      await ApiService.updateContact(
        contactId: widget.contact['id'].toString(),
        status: newStatus,
        adminNotes: _notesController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Status updated'), backgroundColor: Colors.green),
        );
        widget.onStatusChanged();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.contact['subject'] ?? 'No subject',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.contact['category'] ?? 'General',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: widget.contact['urgency_score'] >= 60
                          ? Colors.red
                          : Colors.orange,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Urgency: ${widget.contact['urgency_score'] ?? 0}',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              // User details
              const Text('User Details', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              _buildUserInfo('Name', widget.contact['name'] ?? 'Unknown'),
              _buildUserInfo('Email', widget.contact['user_email'] ?? 'N/A'),
              _buildUserInfo('Phone', widget.contact['phone_number'] ?? 'Not provided'),
              if (widget.contact['vehicle_registration'] != null)
                _buildUserInfo('Vehicle', widget.contact['vehicle_registration']),
              const SizedBox(height: 16),
              const Divider(),
              // Message
              const Text('Message', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.contact['message'] ?? 'No message',
                  style: const TextStyle(fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
              const Divider(),
              // Admin notes
              const Text('Admin Notes', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Add notes about this message...',
                  hintStyle: TextStyle(color: Colors.grey[700]),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),
              // Status buttons
              const Text('Status', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['read', 'responded', 'closed']
                    .map((status) => ElevatedButton(
                          onPressed: isUpdating ? null : () => _updateStatus(status),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: widget.contact['status'] == status
                                ? const Color(0xFF7BA7D8)
                                : Colors.grey[300],
                          ),
                          child: Text(
                            status.toUpperCase(),
                            style: TextStyle(
                              color: widget.contact['status'] == status
                                  ? Colors.white
                                  : Colors.black,
                            ),
                          ),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserInfo(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
