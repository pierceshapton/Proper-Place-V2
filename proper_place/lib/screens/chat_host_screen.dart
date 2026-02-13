import 'package:flutter/material.dart';
import 'package:proper_place/services/notification_manager.dart';
import 'package:proper_place/services/chat_service.dart';
import 'package:proper_place/widgets/swipe_action_card.dart';

class ChatHostScreen extends StatefulWidget {
  final VoidCallback? onRefresh;
  
  const ChatHostScreen({super.key, this.onRefresh});

  @override
  State<ChatHostScreen> createState() => _ChatHostScreenState();
}

class _ChatHostScreenState extends State<ChatHostScreen> {
  int _selectedChatIndex = -1;
  bool _isOpenChatsExpanded = true;
  bool _isClosedChatsExpanded = false;
  late TextEditingController _messageController;

  // Sample conversations data - host conversations with guests
  final List<Map<String, dynamic>> _conversations = [
    {
      'id': '1',
      'closed': false,
      'guestName': 'Alice Johnson',
      'guestAvatar': 'AJ',
      'placeName': 'Cozy Studio Apartment',
      'lastMessage': 'Thank you! We had an amazing stay!',
      'timestamp': '2 min ago',
      'unread': 0,
      'messages': [
        {
          'sender': 'guest',
          'text': 'Hi, is the place available for next weekend?',
          'time': '15 min ago'
        },
        {
          'sender': 'host',
          'text': 'Yes it is! Would you like to book?',
          'time': '14 min ago'
        },
        {
          'sender': 'guest',
          'text': 'Perfect! Booking confirmed',
          'time': '3 min ago'
        },
        {
          'sender': 'host',
          'text': 'Great! Looking forward to having you',
          'time': '2 min ago'
        },
        {
          'sender': 'guest',
          'text': 'Thank you! We had an amazing stay!',
          'time': '1 min ago'
        },
      ],
    },
    {
      'id': '2',
      'closed': true,
      'guestName': 'Bob Wilson',
      'guestAvatar': 'BW',
      'placeName': 'Beachfront Villa',
      'lastMessage': 'Check-in was smooth, thanks!',
      'timestamp': '1 day ago',
      'unread': 0,
      'messages': [
        {
          'sender': 'guest',
          'text': 'Hi, will we have beach access?',
          'time': '3 days ago'
        },
        {
          'sender': 'host',
          'text': 'Yes, direct private beach access! Keys are in the box',
          'time': '2 days ago'
        },
        {
          'sender': 'guest',
          'text': 'Check-in was smooth, thanks!',
          'time': '1 day ago'
        },
      ],
    },
    {
      'id': '3',
      'closed': false,
      'guestName': 'Carol Davis',
      'guestAvatar': 'CD',
      'placeName': 'Mountain Cabin',
      'lastMessage': 'Do you have heating for winter?',
      'timestamp': '1 hour ago',
      'unread': 1,
      'messages': [
        {
          'sender': 'guest',
          'text': 'Hi, do you have heating for winter?',
          'time': '1 hour ago'
        },
      ],
    },
    {
      'id': '4',
      'closed': true,
      'guestName': 'David Martinez',
      'guestAvatar': 'DM',
      'placeName': 'City Loft',
      'lastMessage': 'Great place, will definitely recommend',
      'timestamp': '5 days ago',
      'unread': 0,
      'messages': [
        {
          'sender': 'guest',
          'text': 'Is parking included?',
          'time': '5 days ago'
        },
        {
          'sender': 'host',
          'text': 'Yes, free parking in the garage',
          'time': '4 days ago'
        },
        {
          'sender': 'guest',
          'text': 'Great place, will definitely recommend',
          'time': '3 days ago'
        },
      ],
    },
  ];

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  void _closeChat(int index) {
    setState(() {
      _conversations[index]['closed'] = true;
    });
  }

  void _reopenChat(int index) {
    setState(() {
      _conversations[index]['closed'] = false;
    });
  }

  void _sendMessage(int index) {
    if (_messageController.text.trim().isEmpty) return;

    setState(() {
      _conversations[index]['messages'].add({
        'sender': 'host',
        'text': _messageController.text,
        'time': 'now',
      });
      _conversations[index]['lastMessage'] = _messageController.text;
      _conversations[index]['timestamp'] = 'now';
    });
    _messageController.clear();
  }

  Widget _buildCategoryTab(String value, String label, IconData icon) {
    final isActive = (value == 'open' && _selectedChatIndex != -1 && !_conversations[_selectedChatIndex]['closed']) ||
        (value == 'closed' && _selectedChatIndex != -1 && _conversations[_selectedChatIndex]['closed']);

    return GestureDetector(
      onTap: () {
        // Category switching logic if needed
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFF3F4F6) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive
                ? const Color(0xFF7BA7D8)
                : const Color(0xFFE5E7EB),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF7BA7D8)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? const Color(0xFF7BA7D8) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
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
      body: _selectedChatIndex == -1
          ? _buildChatList()
          : _buildChatDetail(
              _conversations[_selectedChatIndex], _selectedChatIndex),
    );
  }

  Widget _buildChatList() {
    final activeConversations =
        _conversations.where((c) => c['closed'] == false).toList();
    final closedConversations =
        _conversations.where((c) => c['closed'] == true).toList();
    int totalUnread =
        activeConversations.fold(0, (sum, c) => sum + (c['unread'] as int));

    return SingleChildScrollView(
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
                        'Open Chats (${activeConversations.length})',
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
                  // Active Conversation List
                  if (activeConversations.isEmpty)
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
                            'No active conversations',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    ...activeConversations.map((conversation) {
                      final index = _conversations.indexOf(conversation);
                      return _buildConversationCard(conversation, index);
                    }).toList(),
                ],
              ],
            ),
          ),
          // Closed Conversations Section
          if (closedConversations.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _isClosedChatsExpanded = !_isClosedChatsExpanded;
                      });
                    },
                    child: Row(
                      children: [
                        Icon(
                          _isClosedChatsExpanded
                              ? Icons.expand_more
                              : Icons.chevron_right,
                          size: 24,
                          color: const Color(0xFF9CA3AF),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.lock_outline,
                          size: 20,
                          color: Color(0xFF9CA3AF),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Closed Chats (${closedConversations.length})',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_isClosedChatsExpanded) ...[
                    const SizedBox(height: 16),
                    ...closedConversations.map((conversation) {
                      final index = _conversations.indexOf(conversation);
                      return _buildClosedConversationCard(conversation, index);
                    }).toList(),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildConversationCard(
      Map<String, dynamic> conversation, int index) {
    final conversationId = conversation['id'].toString();

    return SwipeActionCard(
      conversationId: conversationId,
      onMarkUnread: () async {
        try {
          await ChatService().markContactAsUnread(conversationId);
          setState(() {
            conversation['unread'] = 1;
          });
          NotificationManager().refresh();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Marked as unread')),
            );
          }
        } catch (error) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $error')),
            );
          }
        }
      },
      onDelete: () async {
        try {
          await ChatService().deleteContact(conversationId);
          setState(() {
            _conversations.removeAt(index);
          });
          NotificationManager().refresh();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Conversation deleted')),
            );
          }
        } catch (error) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $error')),
            );
          }
        }
      },
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedChatIndex = index;
          });
          NotificationManager().refresh();
          widget.onRefresh?.call();
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
                    conversation['guestAvatar'],
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
                          conversation['guestName'],
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          conversation['timestamp'],
                          style: const TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      conversation['placeName'],
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            conversation['lastMessage'],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 12,
                            ),
                          ),
                        ),
                        if (conversation['unread'] > 0)
                          Container(
                            margin: const EdgeInsets.only(left: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.red,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${conversation['unread']}',
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
      ),
    );
  }

  Widget _buildClosedConversationCard(
      Map<String, dynamic> conversation, int index) {
    final conversationId = conversation['id'].toString();

    return SwipeActionCard(
      conversationId: conversationId,
      onMarkUnread: () async {
        try {
          await ChatService().markContactAsUnread(conversationId);
          setState(() {
            conversation['unread'] = 1;
          });
          NotificationManager().refresh();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Marked as unread')),
            );
          }
        } catch (error) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $error')),
            );
          }
        }
      },
      onDelete: () async {
        try {
          await ChatService().deleteContact(conversationId);
          setState(() {
            _conversations.removeAt(index);
          });
          NotificationManager().refresh();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Conversation deleted')),
            );
          }
        } catch (error) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $error')),
            );
          }
        }
      },
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedChatIndex = index;
          });
          NotificationManager().refresh();
          widget.onRefresh?.call();
        },
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFD1D5DB)),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Center(
                  child: Text(
                    conversation['guestAvatar'],
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF),
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
                    Text(
                      conversation['guestName'],
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        decoration: TextDecoration.lineThrough,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      conversation['placeName'],
                      style: const TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      conversation['lastMessage'],
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Reopen button
              GestureDetector(
                onTap: () {
                  _reopenChat(index);
                },
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(
                    Icons.refresh,
                    size: 16,
                    color: Color(0xFF7BA7D8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChatDetail(Map<String, dynamic> conversation, int index) {
    return Column(
      children: [
        // Chat header with close option
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
                    _selectedChatIndex = -1;
                  });
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
                    conversation['guestAvatar'],
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
                      conversation['guestName'],
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      conversation['placeName'],
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              // Close/Reopen button
              if (!conversation['closed'])
                GestureDetector(
                  onTap: () {
                    _closeChat(index);
                    setState(() {
                      _selectedChatIndex = -1;
                    });
                  },
                  child: Row(
                    children: [
                      Icon(
                        Icons.close,
                        size: 20,
                        color: Color(0xFFEF4444),
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Close chat',
                        style: TextStyle(
                          color: Color(0xFFEF4444),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              else
                GestureDetector(
                  onTap: () {
                    _reopenChat(index);
                  },
                  child: Row(
                    children: [
                      Icon(
                        Icons.refresh,
                        size: 20,
                        color: Color(0xFF7BA7D8),
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Reopen',
                        style: TextStyle(
                          color: Color(0xFF7BA7D8),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
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
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: conversation['messages'].length,
            itemBuilder: (context, i) {
              final message = conversation['messages'][i];
              final isHost = message['sender'] == 'host';
              return Column(
                crossAxisAlignment:
                    isHost ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isHost
                          ? const Color(0xFF7BA7D8)
                          : const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      message['text'],
                      style: TextStyle(
                        color: isHost ? Colors.white : Colors.black,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    message['time'],
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF),
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              );
            },
          ),
        ),
        // Reply/Close message for closed chats
        if (conversation['closed'])
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              border: Border(
                top: BorderSide(color: Colors.grey[300]!),
              ),
            ),
            child: Center(
              child: Column(
                children: [
                  const Icon(
                    Icons.lock_outline,
                    size: 24,
                    color: Color(0xFF9CA3AF),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'This chat is closed',
                    style: TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () {
                      _reopenChat(index);
                      setState(() {
                        _selectedChatIndex = -1;
                      });
                    },
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Reopen Chat'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF7BA7D8),
                      side: const BorderSide(color: Color(0xFF7BA7D8)),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          // Message input
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                        borderRadius: BorderRadius.circular(8),
                        borderSide:
                            const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _sendMessage(index),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7BA7D8),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.send,
                      size: 18,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
