import 'package:flutter/material.dart';
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

  @override
  void initState() {
    super.initState();
    _chatService = ChatService();
    _initAndLoad();
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

      // Mark messages from host as read
      await _chatService.markConversationAsRead(widget.hostId);

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
            'status': 'read',
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
    super.dispose();
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
      await _chatService.sendMessage(
        receiverId: widget.hostId,
        content: message,
        bookingId: int.tryParse(widget.bookingId),
      );

      // Simulate message delivery after 500ms
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          setState(() {
            if (messages.isNotEmpty) {
              messages.last['status'] = 'delivered';
            }
          });
        }
      });

      // Simulate message read after 2 seconds
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            if (messages.isNotEmpty) {
              messages.last['status'] = 'read';
            }
          });
        }
      });
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

                    // Message input
                    Container(
                      color: Colors.white,
                      child: SafeArea(
                        top: false,
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border(
                              top: BorderSide(color: Colors.grey[200]!),
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
