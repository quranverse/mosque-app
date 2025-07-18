// Islamic-themed design system and color palette

export const Colors = {
  // Primary Islamic Green Palette
  primary: {
    main: '#2E7D32',      // Deep Islamic Green
    light: '#4CAF50',     // Light Green
    dark: '#1B5E20',      // Dark Green
    surface: '#E8F5E8',   // Very Light Green
  },
  
  // Secondary Gold/Amber Palette (for accents)
  secondary: {
    main: '#FF8F00',      // Islamic Gold
    light: '#FFC107',     // Light Amber
    dark: '#E65100',      // Dark Orange
    surface: '#FFF8E1',   // Very Light Amber
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    divider: '#EEEEEE',
  },
  
  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    hint: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  
  // Status Colors
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  
  // Prayer Time Colors
  prayer: {
    current: '#2E7D32',
    next: '#4CAF50',
    passed: '#9E9E9E',
    background: '#E8F5E8',
  },
  
  // Qibla Colors
  qibla: {
    accurate: '#4CAF50',
    close: '#8BC34A',
    moderate: '#FF9800',
    far: '#F44336',
  },
  
  // Translation Colors
  translation: {
    live: '#4CAF50',
    offline: '#F44336',
    connecting: '#FF9800',
  },
};

export const Typography = {
  // Font Families
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    arabic: 'serif', // Better for Arabic text
  },

  // Font Sizes
  sizes: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 36,
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Font Weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Heading Styles
  heading: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 38,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 30,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 26,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
  },

  // Body Text Styles
  body: {
    large: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 26,
    },
    medium: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    small: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    tiny: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Layout = {
  // Screen padding
  screenPadding: Spacing.lg,
  
  // Card padding
  cardPadding: Spacing.lg,
  
  // Section spacing
  sectionSpacing: Spacing['2xl'],
  
  // Component spacing
  componentSpacing: Spacing.md,
  
  // Header height
  headerHeight: 56,
  
  // Tab bar height
  tabBarHeight: 60,
  
  // Button heights
  buttonHeight: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
  },
  
  // Input heights
  inputHeight: {
    sm: 32,
    md: 40,
    lg: 48,
  },
};

export const IslamicPatterns = {
  // Geometric patterns for backgrounds
  patterns: {
    geometric1: 'data:image/svg+xml;base64,...', // Would contain SVG pattern
    geometric2: 'data:image/svg+xml;base64,...',
    arabesque: 'data:image/svg+xml;base64,...',
  },
  
  // Islamic decorative elements
  decorations: {
    border: '🕌', // Mosque emoji as decoration
    separator: '۞', // Islamic ornament
    bullet: '◆', // Diamond bullet
  },
};

export const Animations = {
  // Timing
  timing: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  // Easing
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Component-specific themes
export const ComponentThemes = {
  card: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    padding: Layout.cardPadding,
    ...Shadows.md,
  },
  
  button: {
    primary: {
      backgroundColor: Colors.primary.main,
      color: Colors.text.inverse,
      borderRadius: BorderRadius.md,
      height: Layout.buttonHeight.md,
    },
    secondary: {
      backgroundColor: Colors.secondary.main,
      color: Colors.text.inverse,
      borderRadius: BorderRadius.md,
      height: Layout.buttonHeight.md,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: Colors.primary.main,
      borderWidth: 1,
      color: Colors.primary.main,
      borderRadius: BorderRadius.md,
      height: Layout.buttonHeight.md,
    },
  },
  
  input: {
    backgroundColor: Colors.neutral.surface,
    borderColor: Colors.neutral.border,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    height: Layout.inputHeight.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  
  header: {
    backgroundColor: Colors.primary.main,
    height: Layout.headerHeight,
    ...Shadows.sm,
  },
  
  tabBar: {
    backgroundColor: Colors.neutral.surface,
    height: Layout.tabBarHeight,
    borderTopColor: Colors.neutral.border,
    borderTopWidth: 1,
  },
};

// Prayer time specific styling
export const PrayerTimeTheme = {
  current: {
    backgroundColor: Colors.prayer.background,
    borderLeftColor: Colors.prayer.current,
    borderLeftWidth: 4,
  },
  next: {
    backgroundColor: Colors.prayer.background,
    borderLeftColor: Colors.prayer.next,
    borderLeftWidth: 4,
  },
  passed: {
    backgroundColor: Colors.neutral.background,
    opacity: 0.7,
  },
};

// Qibla compass styling
export const QiblaTheme = {
  compass: {
    backgroundColor: Colors.neutral.surface,
    borderColor: Colors.neutral.border,
    borderWidth: 2,
  },
  accurate: {
    color: Colors.qibla.accurate,
    backgroundColor: Colors.primary.surface,
  },
  close: {
    color: Colors.qibla.close,
    backgroundColor: Colors.secondary.surface,
  },
  moderate: {
    color: Colors.qibla.moderate,
    backgroundColor: Colors.status.warning + '20',
  },
  far: {
    color: Colors.qibla.far,
    backgroundColor: Colors.status.error + '20',
  },
};

// Translation interface styling
export const TranslationTheme = {
  live: {
    backgroundColor: Colors.translation.live,
    color: Colors.text.inverse,
  },
  offline: {
    backgroundColor: Colors.translation.offline,
    color: Colors.text.inverse,
  },
  connecting: {
    backgroundColor: Colors.translation.connecting,
    color: Colors.text.inverse,
  },
  arabicText: {
    fontFamily: Typography.fonts.arabic,
    textAlign: 'right',
    lineHeight: Typography.lineHeights.relaxed,
  },
  englishText: {
    fontFamily: Typography.fonts.regular,
    textAlign: 'left',
    lineHeight: Typography.lineHeights.normal,
  },
};

// Utility functions for theme usage
export const getTheme = () => ({
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  layout: Layout,
  animations: Animations,
  components: ComponentThemes,
  prayer: PrayerTimeTheme,
  qibla: QiblaTheme,
  translation: TranslationTheme,
});

export const createThemedStyles = (styleFunction) => {
  return styleFunction(getTheme());
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  IslamicPatterns,
  Animations,
  ComponentThemes,
  PrayerTimeTheme,
  QiblaTheme,
  TranslationTheme,
  getTheme,
  createThemedStyles,
};
