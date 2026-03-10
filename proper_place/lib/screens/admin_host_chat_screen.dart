import 'package:flutter/material.dart';
import 'package:proper_place/services/chat_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'dart:async';

class AdminHostChatScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const AdminHostChatScreen({super.key, this.onRefresh});

  @override
  State<AdminHostChatScreen> createState() => _AdminHostChatScreenState();
}

class _AdminHostChatScreenState extends State<AdminHostChatScreen> {
  int? _selectedPartnerId;
  Map<String, dynamic>? _selectedConversation;
  late TextEditingController _messageController;

  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingConversations = true;
  bool _isLoadingMessages = false;
  String? _error;
  int? _currentUserId;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    _loadCurrentUser();
    // Fetch conversations after a short delay to ensure token is loaded
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) _fetchConversations();
    });
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _fetchConversations(showLoading: false);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadCurrentUser() async {
    final userId = await StorageService.getUserId();
    if (userId != null) {
      setState(() {
        _currentUserId = int.tryParse(userId);
      });
    }
  }

  Future<void> _fetchConversations({bool showLoading = true}) async {
    if (showLoading) {
      setState(() {
        _isLoadingConversations = true;
        _error = null;
      });
    }

    try {
      print('[AdminChatScreen] Fetching conversations...');
      final conversations = await ChatService().getConversations();
      print('[AdminChatScreen] Successfully fetched ${conversations.length} conversations');
      if (mounted) {
        setState(() {
          _conversations = conversations;
          _isLoadingConversations = false;
        });
      }
    } catch (error) {
      print('[AdminChatScreen] Error fetching conversations: $error');
      if (mounted) {
        setState(() {
          _error = error.toString();
          _isLoadingConversations = false;
        });
      }
    }
  }

  Future<void> _fetchMessages(int otherUserId) async {
    setState(() {
      _isLoadingMessages = true;
    });

    try {
      await ChatService().markConversationAsRead(otherUserId);

      final messages = await ChatService().getMessagesWithUser(otherUserId);
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoadingMessages = false;
          for (var conv in _conversations) {
            if (conv['partnerId'] == otherUserId) {
              conv['unreadCount'] = 0;
            }
          }
        });
        widget.onRefresh?.call();
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _isLoadingMessages = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading messages: $error')),
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty || _selectedPartnerId == null) return;

    final content = _messageController.text.trim();
    _messageController.clear();

    try {
      final sentMessage = await ChatService().sendMessage(
        receiverId: _selectedPartnerId!,
        content: content,
        bookingId: _selectedConversation?['bookingId'] != null
            ? int.tryParse(_selectedConversation!['bookingId'].toString())
            : null,
      );

      if (mounted) {
        setState(() {
          _messages.add(sentMessage);
          for (var conv in _conversations) {
            if (conv['partnerId'] == _selectedPartnerId) {
              conv['lastMessage'] = content;
              conv['lastMessageAt'] = DateTime.now().toIso8601String();
              conv['lastMessageSenderId'] = _currentUserId;
            }
          }
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send message: $error')),
        );
      }
    }
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return '';
    try {
      final date = DateTime.parse(timestamp.toString()).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'now';
      if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
      if (diff.inHours < 24) return '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
      if (diff.inDays < 7) return '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
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
      body: _selectedPartnerId == null
          ? _buildChatList()
          : _buildChatDetail(),
    );
  }

  Widget _buildChatList() {
    if (_isLoadingConversations) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text('Failed to load conversations', style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => _fetchConversations(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    int totalUnread = _conversations.fold(0, (sum, c) => sum + ((c['unreadCount'] ?? 0) as int));

    return RefreshIndicator(
      onRefresh: () => _fetchConversations(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.chat_bubble,
                        size: 20,
                        color: Color(0xFF3B82F6),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'All Chats (${_conversations.length})',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (totalUnread > 0) ...[
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$totalUnread new',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_conversations.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.chat_bubble_outline,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No conversations yet',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._conversations.map((conversation) {
                      return _buildConversationCard(conversation);
                    }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConversationCard(Map<String, dynamic> conversation) {
    final partnerName = conversation['partnerName'] ?? 'Unknown';
    final lastMessage = conversation['lastMessage'] ?? '';
    final lastMessageAt = conversation['lastMessageAt'];
    final unreadCount = conversation['unreadCount'] ?? 0;
    final placeName = conversation['placeName'] ?? '';
    final partnerId = conversation['partnerId'];

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPartnerId = partnerId;
          _selectedConversation = conversation;
        });
        _fetchMessages(partnerId);
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Center(
                  child: Text(
                    _getInitials(partnerName),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            partnerName,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Colors.black,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatTimestamp(lastMessageAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    if (placeName.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        placeName,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            lastMessage,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[700],
                              fontWeight: unreadCount > 0
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (unreadCount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$unreadCount',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right,
                color: Colors.grey,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChatDetail() {
    final partnerName = _selectedConversation?['partnerName'] ?? 'Unknown';
    final placeName = _selectedConversation?['placeName'] ?? '';

    return Column(
      children: [
        // Header
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              IconButton(
                onPressed: () {
                  setState(() {
                    _selectedPartnerId = null;
                    _selectedConversation = null;
                    _messages = [];
                  });
                  _fetchConversations(showLoading: false);
                },
                icon: const Icon(Icons.arrow_back, color: Colors.white),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      partnerName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (placeName.isNotEmpty)
                      Text(
                        placeName,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // Messages
        Expanded(
          child: _isLoadingMessages
              ? const Center(child: CircularProgressIndicator())
              : _messages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey[300]),
                          const SizedBox(height: 12),
                          Text(
                            'No messages yet',
                            style: TextStyle(color: Colors.grey[500], fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, i) {
                        final msg = _messages[i];
                        final isMe = msg['sender_id'] == _currentUserId;

                        return Align(
                          alignment: isMe
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.of(context).size.width * 0.75,
                            ),
                            decoration: BoxDecoration(
                              color: isMe
                                  ? const Color(0xFF3B82F6)
                                  : Colors.grey[200],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  msg['content'] ?? '',
                                  style: TextStyle(
                                    color: isMe ? Colors.white : Colors.black,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _formatTimestamp(msg['created_at']),
                                  style: TextStyle(
                                    color: isMe
                                        ? Colors.white70
                                        : Colors.grey[600],
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
        // Input
        Container(
          padding: EdgeInsets.only(
            left: 12,
            right: 12,
            top: 12,
            bottom: 12 + MediaQuery.of(context).padding.bottom,
          ),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    hintStyle: TextStyle(color: Colors.grey[700]),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                  ),
                  maxLines: null,
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _sendMessage,
                icon: const Icon(Icons.send, color: Color(0xFF3B82F6)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
