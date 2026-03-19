import 'package:flutter/material.dart';
import 'package:proper_place/services/notification_manager.dart';
import 'package:proper_place/services/chat_service.dart';
import 'package:proper_place/services/storage_service.dart';
import 'dart:async';

class ChatHostScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const ChatHostScreen({super.key, this.onRefresh});

  @override
  State<ChatHostScreen> createState() => _ChatHostScreenState();
}

class _ChatHostScreenState extends State<ChatHostScreen> {
  int? _selectedPartnerId;
  Map<String, dynamic>? _selectedConversation;
  bool _isOpenChatsExpanded = true;
  bool _isClosedChatsExpanded = false;
  late TextEditingController _messageController;

  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingConversations = true;
  bool _isLoadingMessages = false;
  String? _error;
  int? _currentUserId;
  Timer? _pollingTimer;
  Timer? _messagePollingTimer;

  // Chat status for reopen system
  String? _chatStatus;
  int? _hoursRemaining;
  int? _reopenRequestId;
  String? _reopenStatus;
  int? _reopenRequesterId;
  bool _reopenRequesting = false;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    _loadCurrentUser();
    _fetchConversations();
    // Poll every 30 seconds for new conversations
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _fetchConversations(showLoading: false);
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _pollingTimer?.cancel();
    _messagePollingTimer?.cancel();
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
      final conversations = await ChatService().getConversations();
      if (mounted) {
        setState(() {
          _conversations = conversations;
          _isLoadingConversations = false;
        });
      }
    } catch (error) {
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
      // Mark conversation as read when opening it
      await ChatService().markConversationAsRead(otherUserId);
      
      final messages = await ChatService().getMessagesWithUser(otherUserId);
      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoadingMessages = false;
          // Update unread count in conversations list
          for (var conv in _conversations) {
            if (conv['partnerId'] == otherUserId) {
              conv['unreadCount'] = 0;
            }
          }
        });
        // Refresh notification badges
        NotificationManager().refresh();
        widget.onRefresh?.call();
      }
      // Start polling for new messages in this conversation
      _startMessagePolling(otherUserId);
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

  void _startMessagePolling(int otherUserId) {
    _messagePollingTimer?.cancel();
    _messagePollingTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (!mounted || _selectedPartnerId != otherUserId) {
        _messagePollingTimer?.cancel();
        return;
      }
      try {
        await ChatService().markConversationAsRead(otherUserId);
        final messages = await ChatService().getMessagesWithUser(otherUserId);
        if (mounted && _selectedPartnerId == otherUserId) {
          setState(() {
            _messages = messages;
            for (var conv in _conversations) {
              if (conv['partnerId'] == otherUserId) {
                conv['unreadCount'] = 0;
              }
            }
          });
        }
        await _loadChatStatus();
      } catch (_) {}
    });
  }

  Future<void> _loadChatStatus() async {
    final bookingId = _selectedConversation?['bookingId'];
    if (bookingId == null) return;
    final bid = bookingId is int ? bookingId : int.tryParse(bookingId.toString());
    if (bid == null) return;
    try {
      final status = await ChatService().getChatStatus(bid);
      if (mounted && status != null) {
        setState(() {
          _chatStatus = status['chatStatus'] as String?;
          _hoursRemaining = status['hoursRemaining'] as int?;
          _reopenRequestId = status['reopenRequestId'] as int?;
          _reopenStatus = status['reopenStatus'] as String?;
          _reopenRequesterId = status['reopenRequesterId'] as int?;
        });
      }
    } catch (_) {}
  }

  Future<void> _requestReopen() async {
    final bookingId = _selectedConversation?['bookingId'];
    if (bookingId == null) return;
    final bid = bookingId is int ? bookingId : int.tryParse(bookingId.toString());
    if (bid == null) return;
    setState(() => _reopenRequesting = true);
    try {
      await ChatService().requestChatReopen(bid);
      await _loadChatStatus();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reopen request sent')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
    if (mounted) setState(() => _reopenRequesting = false);
  }

  Future<void> _respondToReopen(bool accept) async {
    if (_reopenRequestId == null) return;
    try {
      await ChatService().respondChatReopen(_reopenRequestId!, accept);
      await _loadChatStatus();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(accept ? 'Chat reopened' : 'Reopen request declined')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
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
          // Update last message in conversations list
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

  String _getMessageStatus(Map<String, dynamic> msg) {
    final read = msg['read'] == true;
    final delivered = msg['delivered'] == true;
    if (read) return 'read';
    if (delivered) return 'delivered';
    return 'sent';
  }

  Widget _buildReadReceipt(String status) {
    switch (status) {
      case 'sent':
        return Icon(Icons.done, size: 14, color: Colors.grey[500]);
      case 'delivered':
        return Icon(Icons.done_all, size: 14, color: Colors.grey[500]);
      case 'read':
        return const Icon(Icons.done_all, size: 14, color: Colors.blue);
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFECE8DB),
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
                text: 'Host',
                style: TextStyle(
                  color: Color(0xFF7BA7D8),
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
            ElevatedButton(
              onPressed: () => _fetchConversations(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    final activeConversations = _conversations.where((c) => (c['unreadCount'] ?? 0) > 0 || true).toList();
    int totalUnread = _conversations.fold(0, (sum, c) => sum + ((c['unreadCount'] ?? 0) as int));

    return RefreshIndicator(
      onRefresh: () => _fetchConversations(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          children: [
            // Active Conversations Section
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _isOpenChatsExpanded = !_isOpenChatsExpanded;
                      });
                    },
                    child: Row(
                      children: [
                        Icon(
                          _isOpenChatsExpanded
                              ? Icons.expand_more
                              : Icons.chevron_right,
                          size: 24,
                          color: const Color(0xFF7BA7D8),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.chat_bubble,
                          size: 20,
                          color: Color(0xFF7BA7D8),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Chats (${_conversations.length})',
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
                  ),
                  if (_isOpenChatsExpanded) ...[
                    const SizedBox(height: 16),
                    if (_conversations.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(40),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.chat_outlined,
                              size: 40,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No conversations yet',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Messages from guests will appear here',
                              style: TextStyle(
                                color: Colors.grey[400],
                                fontSize: 12,
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
          _chatStatus = null;
          _reopenRequestId = null;
          _reopenStatus = null;
          _reopenRequesterId = null;
        });
        _fetchMessages(partnerId);
        _loadChatStatus();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Center(
                child: Text(
                  _getInitials(partnerName),
                  style: const TextStyle(
                    color: Color(0xFF7BA7D8),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        partnerName,
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _formatTimestamp(lastMessageAt),
                        style: const TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  if (placeName.isNotEmpty) ...[
                    const SizedBox(height: 4),
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          lastMessage,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ),
                      if (unreadCount > 0)
                        Container(
                          margin: const EdgeInsets.only(left: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$unreadCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatDetail() {
    final partnerName = _selectedConversation?['partnerName'] ?? 'Unknown';
    final placeName = _selectedConversation?['placeName'] ?? '';

    return Column(
      children: [
        // Chat header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Colors.grey[200]!),
            ),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedPartnerId = null;
                    _selectedConversation = null;
                    _messages = [];
                    _chatStatus = null;
                    _reopenRequestId = null;
                    _reopenStatus = null;
                    _reopenRequesterId = null;
                  });
                  // Refresh conversations to get updated previews
                  _fetchConversations(showLoading: false);
                },
                child: const Icon(Icons.arrow_back, color: Color(0xFF7BA7D8)),
              ),
              const SizedBox(width: 12),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Center(
                  child: Text(
                    _getInitials(partnerName),
                    style: const TextStyle(
                      color: Color(0xFF7BA7D8),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      partnerName,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (placeName.isNotEmpty)
                      Text(
                        placeName,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // Chat status banners
        if (_chatStatus == 'closing_soon' && _hoursRemaining != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
            color: const Color(0xFFFFF3CD),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.timer_outlined, size: 14, color: Colors.orange[700]),
                const SizedBox(width: 6),
                Text(
                  'Chat closes in ${_hoursRemaining}h after checkout',
                  style: TextStyle(fontSize: 12, color: Colors.orange[800]),
                ),
              ],
            ),
          ),
        if (_chatStatus == 'closed')
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            color: const Color(0xFFF8D7DA),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock_outline, size: 14, color: Colors.red[700]),
                    const SizedBox(width: 6),
                    Text(
                      'Chat closed (72h after checkout)',
                      style: TextStyle(fontSize: 12, color: Colors.red[800]),
                    ),
                  ],
                ),
                if (_reopenStatus == 'pending' && _reopenRequesterId != null && _reopenRequesterId != _currentUserId) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Guest has requested to reopen this chat',
                    style: TextStyle(fontSize: 12, color: Colors.red[800], fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        height: 28,
                        child: ElevatedButton(
                          onPressed: () => _respondToReopen(true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: const Text('Accept', style: TextStyle(color: Colors.white, fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 28,
                        child: ElevatedButton(
                          onPressed: () => _respondToReopen(false),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red[400],
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: const Text('Decline', style: TextStyle(color: Colors.white, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),
                ] else if (_reopenStatus == 'pending' && _reopenRequesterId == _currentUserId)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Reopen request pending — waiting for guest',
                      style: TextStyle(fontSize: 11, color: Colors.orange[800], fontStyle: FontStyle.italic),
                    ),
                  )
                else if (_reopenStatus == null || _reopenStatus == 'declined') ...[
                  const SizedBox(height: 4),
                  SizedBox(
                    height: 28,
                    child: TextButton(
                      onPressed: _reopenRequesting ? null : _requestReopen,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                      ),
                      child: Text(
                        _reopenRequesting ? 'Sending...' : 'Request to reopen chat',
                        style: TextStyle(fontSize: 12, color: Colors.red[700], fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        if (_chatStatus == 'reopened')
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
            color: const Color(0xFFD4EDDA),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_open, size: 14, color: Colors.green[700]),
                const SizedBox(width: 6),
                Text(
                  'Chat reopened',
                  style: TextStyle(fontSize: 12, color: Colors.green[800]),
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
                          const SizedBox(height: 4),
                          Text(
                            'Send a message to start the conversation',
                            style: TextStyle(color: Colors.grey[400], fontSize: 12),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, i) {
                        final message = _messages[i];
                        final isMe = message['sender_id'] == _currentUserId;
                        final status = isMe ? _getMessageStatus(message) : '';
                        return Column(
                          crossAxisAlignment:
                              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.75,
                              ),
                              decoration: BoxDecoration(
                                color: isMe
                                    ? const Color(0xFF7BA7D8)
                                    : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                message['content'] ?? '',
                                style: TextStyle(
                                  color: isMe ? Colors.white : Colors.black,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                              children: [
                                if (isMe && status.isNotEmpty) ...[
                                  _buildReadReceipt(status),
                                  const SizedBox(width: 4),
                                ],
                                Text(
                                  _formatTimestamp(message['created_at']),
                                  style: const TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                          ],
                        );
                      },
                    ),
        ),
        // Message input (hidden when chat is closed)
        if (_chatStatus != 'closed')
          Container(
          color: Colors.white,
          child: SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
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
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: Colors.grey[300]!),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FloatingActionButton(
                    onPressed: _sendMessage,
                    mini: true,
                    backgroundColor: const Color(0xFF7BA7D8),
                    child: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
