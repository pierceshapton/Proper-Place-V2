import 'package:flutter/material.dart';

/// Reusable notification badge widget
class NotificationBadge extends StatelessWidget {
  final int count;
  final double size;
  final TextStyle? textStyle;
  final Color backgroundColor;

  const NotificationBadge({
    Key? key,
    required this.count,
    this.size = 20,
    this.textStyle,
    this.backgroundColor = Colors.red,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (count == 0) {
      return const SizedBox.shrink();
    }

    String displayCount = count > 99 ? '99+' : count.toString();

    return Positioned(
      right: -8,
      top: -8,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: backgroundColor,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Center(
          child: Text(
            displayCount,
            style: textStyle ??
                const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

/// Wrapper widget to add badge to icons
class BadgedIcon extends StatelessWidget {
  final IconData icon;
  final int badgeCount;
  final double iconSize;
  final Color iconColor;
  final Color badgeBackgroundColor;
  final VoidCallback? onTap;

  const BadgedIcon({
    Key? key,
    required this.icon,
    required this.badgeCount,
    this.iconSize = 24,
    this.iconColor = Colors.black,
    this.badgeBackgroundColor = Colors.red,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            icon,
            size: iconSize,
            color: iconColor,
          ),
          if (badgeCount > 0)
            NotificationBadge(
              count: badgeCount,
              backgroundColor: badgeBackgroundColor,
            ),
        ],
      ),
    );
  }
}
