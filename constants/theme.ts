import { Platform } from 'react-native';

const palette = {
  primary: '#5D1A1A',
  secondary: '#343A30',
  tertiary: '#D9C5B2',
  neutral: '#1C1C1C',
  white: '#FFFFFF',
  cream1: '#F2EFEB',
  cream2: '#E9E5E0',
  cream3: '#F7F4F0',
  warmGray1: '#6B6560',
  warmGray2: '#9B9490',
  warmGray3: '#B8B2AC',
  separator: 'rgba(28, 28, 28, 0.10)',
  separatorDark: 'rgba(28, 28, 28, 0.16)',
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#C0392B',
};

export const Colors = {
  light: {
    text: palette.neutral,
    textSecondary: palette.warmGray1,
    textTertiary: palette.warmGray2,
    background: palette.cream1,
    surface: palette.cream2,
    surfaceElevated: palette.cream3,
    accent: palette.primary,
    tint: palette.primary,
    icon: palette.warmGray2,
    tabIconDefault: palette.warmGray2,
    tabIconSelected: palette.primary,
    card: palette.cream2,
    border: palette.separator,
    separator: palette.separatorDark,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
  dark: {
    text: palette.neutral,
    textSecondary: palette.warmGray1,
    textTertiary: palette.warmGray2,
    background: palette.cream1,
    surface: palette.cream2,
    surfaceElevated: palette.cream3,
    accent: palette.primary,
    tint: palette.primary,
    icon: palette.warmGray2,
    tabIconDefault: palette.warmGray2,
    tabIconSelected: palette.primary,
    card: palette.cream2,
    border: palette.separator,
    separator: palette.separatorDark,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
};

export const Fonts = Platform.select({
  ios: {
    display: 'Manrope_700Bold',
    body: 'Manrope_400Regular',
    bodyMedium: 'Inter_500Medium',
    serif: 'New York',
    sans: 'Manrope_400Regular',
    rounded: 'Manrope_600SemiBold',
    mono: 'Menlo',
  },
  default: {
    display: 'Manrope_700Bold',
    body: 'Manrope_400Regular',
    bodyMedium: 'Inter_500Medium',
    serif: 'serif',
    sans: 'Manrope_400Regular',
    rounded: 'Manrope_600SemiBold',
    mono: 'monospace',
  },
});

export const Layout = {
  radiusLg: 16,
  radiusMd: 12,
  radiusSm: 8,
  gutter: 20,
};
