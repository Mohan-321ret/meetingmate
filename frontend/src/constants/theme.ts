import { Platform } from 'react-native';

export const Palette = {
  // Brand colors
  primary: '#1E3A8A', // Deep Navy
  primaryDark: '#172554',
  primaryLight: '#3B82F6',
  primarySurface: '#EFF6FF',

  // Accent & Functional
  accent: '#0284C7',
  success: '#15803D',
  successSurface: '#DCFCE7',
  warning: '#D97706',
  warningSurface: '#FEF3C7',
  danger: '#DC2626',
  dangerSurface: '#FEE2E2',

  // Meeting Section Semantic Colors (Official & Dignified)
  treasures: '#475569', // Slate / Grey
  treasuresLight: '#F1F5F9',
  treasuresDark: '#CBD5E1',

  ministry: '#D97706', // Warm Amber / Ochre
  ministryLight: '#FEF3C7',
  ministryDark: '#FDE68A',

  living: '#B91C1C', // Crimson / Burgundy
  livingLight: '#FEE2E2',
  livingDark: '#FCA5A5',

  watchtower: '#1D4ED8', // Royal Blue
  watchtowerLight: '#DBEAFE',
  watchtowerDark: '#93C5FD',

  publicTalk: '#0F766E', // Teal
  publicTalkLight: '#CCFBF1',
  publicTalkDark: '#99F6E4',
};

export const Colors = {
  light: {
    primary: Palette.primary,
    primaryLight: Palette.primaryLight,
    primarySurface: Palette.primarySurface,
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfacePressed: '#E2E8F0',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    card: '#FFFFFF',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: Palette.primary,
    tabBarInactive: '#64748B',
    badgeText: '#1E3A8A',
    badgeBackground: '#EFF6FF',
    divider: '#F1F5F9',
  },
  dark: {
    primary: '#60A5FA',
    primaryLight: '#93C5FD',
    primarySurface: '#1E293B',
    background: '#0B0F19',
    surface: '#161F30',
    surfaceElevated: '#1E293B',
    surfaceSubtle: '#1E293B',
    surfacePressed: '#334155',
    border: '#243247',
    borderStrong: '#334155',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    card: '#161F30',
    tabBarBackground: '#111726',
    tabBarBorder: '#1E293B',
    tabBarActive: '#60A5FA',
    tabBarInactive: '#94A3B8',
    badgeText: '#93C5FD',
    badgeBackground: '#1E293B',
    divider: '#1E293B',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const Shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  md: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  lg: {
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
};

export const Typography = {
  fontFamily: Platform.select({
    android: 'sans-serif',
    ios: 'system-ui',
    default: 'system-ui',
  }),
  // Base scale values
  h1: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  small: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400' as const,
  },
  micro: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600' as const,
  },
};
