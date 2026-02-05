import 'package:flutter/material.dart';

class AdminHostChatScreen extends StatefulWidget {
  const AdminHostChatScreen({super.key});

  @override
  State<AdminHostChatScreen> createState() => _AdminHostChatScreenState();
}

class _AdminHostChatScreenState extends State<AdminHostChatScreen> {
  int _selectedChatIndex = -1;
  late TextEditingController _messageController;

  // Sample conversations data
  final List<Map<String, dynamic>> _conversations = [
    {
      'id': '1',
      'hostName': 'John Smith',
      'guestName': 'Alice Johnson',
      'hostAvatar': 'JS',
      'guestAvatar': 'AJ',
      'lastMessage': 'Great! I confirmed the booking for next weekend',
      'timestamp': '2 min ago',
      'unread': 2,
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
          'text': 'Perfect! Can you confirm?',
          'time': '3 min ago'
        },
        {
          'sender': 'host',
          'text': 'Great! I confirmed the booking for next weekend',
          'time': '2 min ago'
        },
      ],
      'isOpen': false,
    },
    {
      'id': '2',
      'hostName': 'Sarah Johnson',
      'guestName': 'Bob Wilson',
      'hostAvatar': 'SJ',
      'guestAvatar': 'BW',
      'lastMessage': 'Check-in is at 3 PM',
      'timestamp': '5 min ago',
      'unread': 0,
      'messages': [
        {
          'sender': 'host',
          'text': 'Welcome! Check-in is at 3 PM',
          'time': '5 min ago'
        },
        {
          'sender': 'guest',
          'text': 'Thanks! See you then',
          'time': '4 min ago'
        },
      ],
      'isOpen': false,
    },
    {
      'id': '3',
      'hostName': 'Michael Chen',
      'guestName': 'Carol Davis',
      'hostAvatar': 'MC',
      'guestAvatar': 'CD',
      'lastMessage': 'Looking forward to your stay!',
      'timestamp': '1 hour ago',
      'unread': 0,
      'messages': [
        {
          'sender': 'guest',
          'text': 'Hi, do you have parking available?',
          'time': '1 hour ago'
        },
        {
          'sender': 'host',
          'text': 'Yes, free parking in the garage!',
          'time': '58 min ago'
        },
        {'sender': 'guest', 'text': 'Awesome, thanks!', 'time': '55 min ago'},
        {
          'sender': 'host',
          'text': 'Looking forward to your stay!',
          'time': '1 hour ago'
        },
      ],
      'isOpen': false,
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

  void _openChat(int index) {
    setState(() {
      if (_selectedChatIndex == index) {
        _selectedChatIndex = -1;
      } else {
        _selectedChatIndex = index;
        _conversations[index]['unread'] = 0;
      }
    });
  }

  void _sendMessage(int chatIndex, String message) {
    if (message.trim().isEmpty) return;

    setState(() {
      _conversations[chatIndex]['messages'].add({
        'sender': 'admin',
        'text': message,
        'time': 'now',
      });
      _conversations[chatIndex]['lastMessage'] = message;
      _conversations[chatIndex]['timestamp'] = 'now';
    });
    _messageController.clear();

    // Simulate instant reply
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          final replies = [
            'Thanks for the message!',
            'Will do!',
            'Sounds good!',
            'Got it, thanks!',
            'Appreciate your help!',
          ];
          final randomReply =
              replies[DateTime.now().millisecond % replies.length];
          _conversations[chatIndex]['messages'].add({
            'sender': 'host',
            'text': randomReply,
            'time': 'now',
          });
          _conversations[chatIndex]['lastMessage'] = randomReply;
          _conversations[chatIndex]['timestamp'] = 'now';
        });
      }
    });
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
      body: _selectedChatIndex == -1
          ? _buildChatList()
          : _buildChatDetail(
              _conversations[_selectedChatIndex], _selectedChatIndex),
    );
  }

  Widget _buildChatList() {
    int totalUnread =
        _conversations.fold(0, (sum, c) => sum + (c['unread'] as int));

    return SingleChildScrollView(
      child: Column(
        children: [
          // Simple header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Message Center',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Monitor all conversations between hosts and guests',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Active Chats Section
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
                      'Active Chats (${_conversations.length})',
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
                // Conversation List
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
                          'No active conversations',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _conversations.length,
                    itemBuilder: (context, index) {
                      final conv = _conversations[index];
                      return _buildConversationCard(conv, index);
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationCard(Map<String, dynamic> conversation, int index) {
    final unread = conversation['unread'] as int;
    return GestureDetector(
      onTap: () => _openChat(index),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatars
              Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3B82F6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      conversation['hostAvatar'],
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.green,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              // Chat Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${conversation['hostName']} & ${conversation['guestName']}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          conversation['timestamp'],
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            conversation['lastMessage'],
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[700],
                              fontWeight: unread > 0
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (unread > 0)
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
                              '$unread',
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

  Widget _buildChatDetail(Map<String, dynamic> conversation, int index) {
    final messages = conversation['messages'] as List;

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
                onPressed: () => _openChat(index),
                icon: const Icon(Icons.arrow_back, color: Colors.white),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${conversation['hostName']} & ${conversation['guestName']}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Active now',
                      style: TextStyle(
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
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: messages.length,
            itemBuilder: (context, msgIndex) {
              final msg = messages[msgIndex];
              final isAdmin = msg['sender'] == 'admin';
              final isHost = msg['sender'] == 'host';

              return Align(
                alignment: isAdmin || isHost
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isAdmin || isHost
                        ? const Color(0xFF3B82F6)
                        : Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        msg['text'],
                        style: TextStyle(
                          color:
                              isAdmin || isHost ? Colors.white : Colors.black,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        msg['time'],
                        style: TextStyle(
                          color: isAdmin || isHost
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
          padding: const EdgeInsets.all(12),
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
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _sendMessage(index, _messageController.text),
                icon: const Icon(Icons.send, color: Color(0xFF3B82F6)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
