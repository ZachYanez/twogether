import { Platform } from 'react-native';

const palette = {
  white: '#FFFFFF',
  silver: '#8E8E93',
  gray3: '#48484A',
  gray4: '#3A3A3C',
  gray5: '#2C2C2E',
  gray6: '#1C1C1E',
  black: '#000000',
  separator: 'rgba(84, 84, 88, 0.65)',
  separatorLight: 'rgba(84, 84, 88, 0.35)',
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF453A',
};

export const Colors = {
  light: {
    text: palette.white,
    textSecondary: palette.silver,
    textTertiary: palette.gray3,
    background: palette.black,
    surface: palette.gray6,
    surfaceElevated: palette.gray5,
    accent: palette.white,
    tint: palette.white,
    icon: palette.silver,
    tabIconDefault: palette.gray3,
    tabIconSelected: palette.white,
    card: palette.gray6,
    border: palette.separatorLight,
    separator: palette.separator,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
  dark: {
    text: palette.white,
    textSecondary: palette.silver,
    textTertiary: palette.gray3,
    background: palette.black,
    surface: palette.gray6,
    surfaceElevated: palette.gray5,
    accent: palette.white,
    tint: palette.white,
    icon: palette.silver,
    tabIconDefault: palette.gray3,
    tabIconSelected: palette.white,
    card: palette.gray6,
    border: palette.separatorLight,
    separator: palette.separator,
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
  },
};

export const Fonts = Platform.select({
  ios: {
    display: 'System',
    body: 'System',
    bodyMedium: 'System',
    serif: 'New York',
    sans: 'System',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    display: 'sans-serif',
    body: 'sans-serif',
    bodyMedium: 'sans-serif-medium',
    serif: 'serif',
    sans: 'sans-serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
});

export const Layout = {
  radiusLg: 16,
  radiusMd: 12,
  radiusSm: 8,
  gutter: 20,
};
