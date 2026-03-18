import 'package:flutter/material.dart';
import 'dart:async';
import '../services/chat_service.dart';
import '../services/storage_service.dart';

class ChatScreen extends StatefulWidget {
  final String bookingId;
  final int placeId;
  final String hostName;
  final int hostId;

  const ChatScreen({
    Key? key,
    required this.bookingId,
    required this.placeId,
    required this.hostName,
    required this.hostId,
  }) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  late List<Map<String, dynamic>> messages = [];
  bool _isLoading = true;
  String? _error;
  late ChatService _chatService;
  int? _currentUserId;
  Timer? _pollingTimer;
  String? _responseTimeLabel;
  String? _chatStatus; // open, closing_soon, closed, reopened
  int? _hoursRemaining;
  int? _reopenRequestId;
  String? _reopenStatus; // pending, approved, declined
  int? _reopenRequesterId;
  bool _reopenRequesting = false;

  @override
  void initState() {
    super.initState();
    _chatService = ChatService();
    _initAndLoad();
    _loadResponseTime();
    _loadChatStatus();
    // Poll for status updates every 3 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _refreshStatuses();
      _loadChatStatus();
    });
  }

  Future<void> _loadResponseTime() async {
    final label = await _chatService.getResponseTimeLabel(widget.hostId);
    if (mounted && label != null) {
      setState(() => _responseTimeLabel = label);
    }
  }

  Future<void> _loadChatStatus() async {
    final bookingIdInt = int.tryParse(widget.bookingId);
    if (bookingIdInt == null) return;
    final status = await _chatService.getChatStatus(bookingIdInt);
    if (mounted && status != null) {
      setState(() {
        _chatStatus = status['chatStatus'] as String?;
        _hoursRemaining = status['hoursRemaining'] as int?;
        _reopenRequestId = status['reopenRequestId'] as int?;
        _reopenStatus = status['reopenStatus'] as String?;
        _reopenRequesterId = status['reopenRequesterId'] as int?;
      });
    }
  }

  Future<void> _requestReopen() async {
    final bookingIdInt = int.tryParse(widget.bookingId);
    if (bookingIdInt == null) return;
    setState(() => _reopenRequesting = true);
    final success = await _chatService.requestChatReopen(bookingIdInt);
    if (mounted) {
      setState(() => _reopenRequesting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reopen request sent to host')),
        );
        _loadChatStatus();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A reopen request is already pending'), backgroundColor: Colors.orange),
        );
      }
    }
  }

  Future<void> _respondToReopen(bool accept) async {
    if (_reopenRequestId == null) return;
    try {
      await _chatService.respondChatReopen(_reopenRequestId!, accept);
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

  Future<void> _initAndLoad() async {
    final userIdStr = await StorageService.getUserId();
    _currentUserId = int.tryParse(userIdStr ?? '');
    await _loadMessages();
  }

  Future<void> _loadMessages() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final bookingIdInt = int.tryParse(widget.bookingId);
      List<Map<String, dynamic>> conversationMessages;

      if (bookingIdInt != null) {
        conversationMessages = await _chatService.getMessagesByBooking(bookingIdInt);
      } else {
        conversationMessages = await _chatService.getMessagesWithUser(widget.hostId);
      }

      // Mark messages as read (by booking if available, otherwise by user)
      final bookingIdForRead = bookingIdInt;
      if (bookingIdForRead != null) {
        await _chatService.markBookingAsRead(bookingIdForRead);
      } else {
        await _chatService.markConversationAsRead(widget.hostId);
      }

      setState(() {
        messages = conversationMessages.map((msg) {
          final senderId = msg['sender_id'] is int
              ? msg['sender_id']
              : int.tryParse(msg['sender_id'].toString()) ?? -1;
          return {
            'sender': senderId == _currentUserId ? 'guest' : 'host',
            'message': msg['content'] ?? msg['message'] ?? '',
            'timestamp': msg['created_at'] != null
                ? DateTime.parse(msg['created_at'])
                : DateTime.now(),
            'status': _getMessageStatus(msg, senderId == _currentUserId),
          };
        }).toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load messages: $e';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _pollingTimer?.cancel();
    super.dispose();
  }

  String _getMessageStatus(Map<String, dynamic> msg, bool isMine) {
    if (!isMine) return ''; // No receipts for incoming messages
    final read = msg['read'] == true;
    final delivered = msg['delivered'] == true;
    if (read) return 'read';
    if (delivered) return 'delivered';
    return 'sent';
  }

  Future<void> _refreshStatuses() async {
    if (!mounted) return;
    try {
      // Use the same fetch method as _loadMessages to avoid index mismatch
      final bookingIdInt = int.tryParse(widget.bookingId);
      List<Map<String, dynamic>> conversationMessages;
      if (bookingIdInt != null) {
        conversationMessages = await _chatService.getMessagesByBooking(bookingIdInt);
      } else {
        conversationMessages = await _chatService.getMessagesWithUser(widget.hostId);
      }
      // Mark incoming messages as read (by booking if available, otherwise by user)
      if (bookingIdInt != null) {
        await _chatService.markBookingAsRead(bookingIdInt);
      } else {
        await _chatService.markConversationAsRead(widget.hostId);
      }
      if (!mounted) return;
      final newMessages = conversationMessages.map((msg) {
        final senderId = msg['sender_id'] is int
            ? msg['sender_id']
            : int.tryParse(msg['sender_id'].toString()) ?? -1;
        return {
          'sender': senderId == _currentUserId ? 'guest' : 'host',
          'message': msg['content'] ?? msg['message'] ?? '',
          'timestamp': msg['created_at'] != null
              ? DateTime.parse(msg['created_at'])
              : DateTime.now(),
          'status': _getMessageStatus(msg, senderId == _currentUserId),
        };
      }).toList();
      setState(() {
        messages = newMessages;
      });
    } catch (_) {}
  }

  void _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    setState(() {
      messages.add({
        'sender': 'guest',
        'message': message,
        'timestamp': DateTime.now(),
        'status': 'sent', // sent, delivered, or read
      });
    });

    _messageController.clear();

    // Send message via API
    try {
      final sentMsg = await _chatService.sendMessage(
        receiverId: widget.hostId,
        content: message,
        bookingId: int.tryParse(widget.bookingId),
      );

      // Update with real status from server
      if (mounted) {
        setState(() {
          final lastGuest = messages.lastWhere(
            (m) => m['sender'] == 'guest' && m['message'] == message,
            orElse: () => <String, dynamic>{},
          );
          if (lastGuest.isNotEmpty) {
            lastGuest['status'] = _getMessageStatus(sentMsg, true);
          }
        });
      }
    } catch (e) {
      print('Error sending message: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildReadReceipt(String status) {
    switch (status) {
      case 'sent':
        return Icon(Icons.done, size: 16, color: Colors.grey[500]);
      case 'delivered':
        return Icon(Icons.done_all, size: 16, color: Colors.grey[500]);
      case 'read':
        return Icon(Icons.done_all, size: 16, color: Colors.blue);
      default:
        return const SizedBox.shrink();
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else {
      return '${time.day}/${time.month}/${time.year}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Proper Place Booking Chat'),
        backgroundColor: const Color(0xFF7BA7D8),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadMessages,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Response time indicator
                    if (_responseTimeLabel != null && _chatStatus != 'closed')
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                        color: const Color(0xFFF0F4F8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.schedule, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 6),
                            Text(
                              'Typically responds $_responseTimeLabel',
                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                    // Chat window status banner
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
                                  'Chat closed (72 hours after checkout)',
                                  style: TextStyle(fontSize: 12, color: Colors.red[800]),
                                ),
                              ],
                            ),
                            // Host requested reopen — user can approve/decline
                            if (_reopenStatus == 'pending' && _reopenRequesterId != null && _reopenRequesterId != _currentUserId) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Host has requested to reopen this chat',
                                style: TextStyle(fontSize: 12, color: Colors.red[800], fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 4),
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
                                        textStyle: const TextStyle(fontSize: 12),
                                      ),
                                      child: const Text('Accept', style: TextStyle(color: Colors.white)),
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
                                        textStyle: const TextStyle(fontSize: 12),
                                      ),
                                      child: const Text('Decline', style: TextStyle(color: Colors.white)),
                                    ),
                                  ),
                                ],
                              ),
                            ]
                            // User requested reopen — pending
                            else if (_reopenStatus == 'pending' && _reopenRequesterId == _currentUserId)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Reopen request pending — waiting for host',
                                  style: TextStyle(fontSize: 11, color: Colors.orange[800], fontStyle: FontStyle.italic),
                                ),
                              )
                            // No request yet — show request button
                            else if (_reopenStatus == null || _reopenStatus == 'declined') ...[
                              const SizedBox(height: 6),
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
                    // Messages list
                    Expanded(
                      child: messages.isEmpty
                          ? const Center(
                              child: Text(
                                'No messages yet',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              reverse: true,
                              itemCount: messages.length,
                              itemBuilder: (context, index) {
                                final message = messages[messages.length - 1 - index];
                                final isHost = message['sender'] == 'host';

                                return Align(
                                  alignment: isHost ? Alignment.centerLeft : Alignment.centerRight,
                                  child: Column(
                                    crossAxisAlignment:
                                        isHost ? CrossAxisAlignment.start : CrossAxisAlignment.end,
                                    children: [
                      Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: isHost
                              ? Colors.grey[200]
                              : const Color(0xFF7BA7D8),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          message['message'],
                          style: TextStyle(
                            color: isHost ? Colors.black : Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Show read receipt for guest messages only
                            if (!isHost && message['status'] != null) ...[
                              _buildReadReceipt(message['status']),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              _formatTime(message['timestamp']),
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

                    // Message input (hidden when chat is closed without reopen)
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
                ),
    );
  }
}
