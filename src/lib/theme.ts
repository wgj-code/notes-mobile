export type ThemeColors = typeof colors;

export const lightColors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#F0F0F0',
  inputBorder: '#DDDDDD',
  danger: '#FF3B30',
  warning: '#FF9500',
  errorBannerBg: '#FFF3F0',
  errorBannerBorder: '#FFDDD6',
  tagChipBg: '#F0F5FF',
  activeOptionBg: '#F0F5FF',
  statusBar: 'dark-content' as const,
};

export const darkColors: ThemeColors = {
  primary: '#0A84FF',
  background: '#1C1C1E',
  card: '#2C2C2E',
  text: '#E5E5E5',
  textSecondary: '#ABABAB',
  textMuted: '#6E6E6E',
  border: '#3A3A3C',
  inputBorder: '#48484A',
  danger: '#FF453A',
  errorBannerBg: '#3A2020',
  errorBannerBorder: '#5C3030',
  tagChipBg: '#1A2A3A',
  activeOptionBg: '#1A2A3A',
  statusBar: 'light-content' as const,
};

/** Legacy export — prefer useThemeColors() hook for dark mode support. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const fontSize = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 32,
  title: 28,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 28,
  full: 9999,
};
