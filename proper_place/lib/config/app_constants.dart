import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Color palette for Proper Place
class AppColors {
  // Primary colors - User's palette
  static const Color darkBackground = Color(0xFFAEBCC4); // Dark banner/nav - slate blue
  static const Color lightBlue = Color(0xFFAEBCC4); // Primary accent - slate blue

  // Neutral colors - from user's palette
  static const Color white = Color(0xFFECE8DB); // Cream/off-white for main background
  static const Color lightGray = Color(0xFFE1DACC); // Light cream for subtle areas
  static const Color mediumGray = Color(0xFFC1CCCA); // Sage/muted teal
  static const Color darkGray = Color(0xFFCFCBC9); // Light gray
  static const Color charcoal = Color(0xFFD3CBC7); // Mauve/rose

  // Role-based colors (variations of the palette)
  static const Color userColor = Color(0xFFAEBCC4); // Slate blue
  static const Color hostColor = Color(0xFF9EADB5); // Darker slate blue
  static const Color adminColor = Color(0xFF8E9DA6); // Even darker slate blue

  // Semantic colors
  static const Color success = Color(0xFF66BB6A);
  static const Color warning = Color(0xFFFFB74D);
  static const Color error = Color(0xFFEF5350);
  static const Color info = Color(0xFFAEBCC4);

  // Text colors
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textOnDark = Color(0xFFFFFFFF);

  // Border and divider
  static const Color borderColor = Color(0xFFE1DACC);
  static const Color dividerColor = Color(0xFFD3CBC7);
  
  // Card background - slightly darker to stand out
  static const Color cardBackground = Color(0xFFDCD5C8);
}

/// Spacing and sizing constants
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;

  // Border radius
  static const double radiusSm = 4.0;
  static const double radiusMd = 8.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 24.0;

  // Icon sizes
  static const double iconSm = 16.0;
  static const double iconMd = 24.0;
  static const double iconLg = 32.0;
  static const double iconXl = 48.0;
}

/// Typography styles
class AppTypography {
  static TextStyle get displayLarge {
    return GoogleFonts.poppins(
      fontSize: 32,
      fontWeight: FontWeight.bold,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get displayMedium {
    return GoogleFonts.poppins(
      fontSize: 28,
      fontWeight: FontWeight.bold,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get headlineLarge {
    return GoogleFonts.poppins(
      fontSize: 24,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get headlineMedium {
    return GoogleFonts.poppins(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get headlineSmall {
    return GoogleFonts.poppins(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get bodyLarge {
    return GoogleFonts.inter(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get bodyMedium {
    return GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get bodySmall {
    return GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: AppColors.textSecondary,
    );
  }

  static TextStyle get labelLarge {
    return GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: AppColors.textPrimary,
    );
  }

  static TextStyle get labelMedium {
    return GoogleFonts.inter(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      color: AppColors.textSecondary,
    );
  }

  static TextStyle get labelSmall {
    return GoogleFonts.inter(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: AppColors.textSecondary,
    );
  }
}

/// Role-based utilities
class AppRoles {
  static Color getColorForRole(String role) {
    switch (role.toLowerCase()) {
      case 'host':
        return AppColors.hostColor;
      case 'admin':
        return AppColors.adminColor;
      case 'user':
      default:
        return AppColors.userColor;
    }
  }

  static String getRoleLabel(String role) {
    switch (role.toLowerCase()) {
      case 'host':
        return 'Host';
      case 'admin':
        return 'Administrator';
      case 'user':
      default:
        return 'Guest';
    }
  }
}
