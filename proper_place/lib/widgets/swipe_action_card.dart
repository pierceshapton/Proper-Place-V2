import 'package:flutter/material.dart';

/// Callback for swipe actions
typedef OnSwipeAction = Future<void> Function();

/// A card widget with left-swipe actions (mark unread and delete)
class SwipeActionCard extends StatefulWidget {
  final Widget child;
  final String conversationId;
  final OnSwipeAction onMarkUnread;
  final OnSwipeAction onDelete;

  const SwipeActionCard({
    Key? key,
    required this.child,
    required this.conversationId,
    required this.onMarkUnread,
    required this.onDelete,
  }) : super(key: key);

  @override
  State<SwipeActionCard> createState() => _SwipeActionCardState();
}

class _SwipeActionCardState extends State<SwipeActionCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _slideController;
  Offset _dragOffset = Offset.zero;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset += Offset(details.delta.dx, 0);
      // Limit drag (don't let it go too far)
      if (_dragOffset.dx > 0) {
        _dragOffset = Offset.zero;
      }
      if (_dragOffset.dx < -160) {
        _dragOffset = const Offset(-160, 0);
      }
    });
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    final isLeft = details.velocity.pixelsPerSecond.dx < 0;
    final dragThreshold = -60.0;

    if (isLeft && _dragOffset.dx < dragThreshold) {
      // Snap to open
      _slideController.forward();
      setState(() => _dragOffset = const Offset(-160, 0));
    } else {
      // Snap to closed
      _slideController.reverse();
      setState(() => _dragOffset = Offset.zero);
    }
  }

  Future<void> _markAsUnread() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);
    try {
      await widget.onMarkUnread();
      _resetSwipe();
    } catch (e) {
      print('Error marking as unread: $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _delete() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);
    try {
      await widget.onDelete();
    } catch (e) {
      print('Error deleting: $e');
      setState(() => _isProcessing = false);
    }
  }

  void _resetSwipe() {
    _slideController.reverse();
    setState(() => _dragOffset = Offset.zero);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: _isProcessing ? null : _onHorizontalDragUpdate,
      onHorizontalDragEnd: _isProcessing ? null : _onHorizontalDragEnd,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              // Background with action buttons (hidden by default)
              Positioned(
                right: 0,
                top: 0,
                bottom: 12,
                width: 160,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Mark Unread Button
                    GestureDetector(
                      onTap: _isProcessing ? null : _markAsUnread,
                      child: Container(
                        width: 80,
                        height: 90,
                        decoration: BoxDecoration(
                          color: Colors.blue,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (_isProcessing)
                              const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor:
                                      AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            else
                              const Icon(Icons.mark_email_unread,
                                  color: Colors.white, size: 28),
                            const SizedBox(height: 6),
                            const Text(
                              'Unread',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Delete Button
                    GestureDetector(
                      onTap: _isProcessing ? null : _delete,
                      child: Container(
                        width: 80,
                        height: 90,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (_isProcessing)
                              const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor:
                                      AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            else
                              const Icon(Icons.delete,
                                  color: Colors.white, size: 28),
                            const SizedBox(height: 6),
                            const Text(
                              'Delete',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Foreground card - slides left to reveal buttons
              Transform.translate(
                offset: _dragOffset,
                child: Opacity(
                  opacity: _isProcessing ? 0.7 : 1.0,
                  child: widget.child,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

