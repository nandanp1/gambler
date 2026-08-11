import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  canvas: '#F7F5FF',
  board: '#E9E4F8',
  surface: '#FFFFFF',
  surfaceLavender: '#F4F1FF',
  inset: '#EFEBFC',
  insetDeep: '#E7E1F8',
  text: '#171727',
  textSoft: '#77758A',
  textMuted: '#68647F',
  textFaint: '#746F91',
  primary: '#8F7CF7',
  primaryTop: '#927DF3',
  primaryDark: '#8264F2',
  primaryEdge: '#6A4CD8',
  blue: '#65B9FF',
  blueDark: '#4EA3F5',
  pink: '#FF91BD',
  pinkDark: '#FF7FB0',
  mint: '#71DFC0',
  mintDark: '#3FC7A2',
  mintEdge: '#2CAF8B',
  yellow: '#FFD966',
  yellowDark: '#FFC53D',
  coral: '#FF867A',
  coralDark: '#F4695A',
  coralEdge: '#DB5344',
  red: '#F0556B',
  inkPurple: '#4A4470',
  rouletteBlack: '#2E2A55',
  success: '#22A67F',
  danger: '#E8485F',
  disabled: '#C0BBD4',
  transparent: 'transparent',
} as const;

export const gradients = {
  primary: [colors.primaryTop, colors.primaryDark] as const,
  mint: ['#7FE3C6', colors.mintDark] as const,
  coral: ['#FF9E8E', colors.coralDark] as const,
  blue: ['#8FCEFF', colors.blueDark] as const,
  pink: ['#FFC5DC', colors.pinkDark] as const,
  yellow: ['#FFE08F', '#FFB13D'] as const,
  lavender: ['#C4B4FF', '#8E74F5'] as const,
  surface: [colors.surface, colors.surfaceLavender] as const,
  gold: ['#FFE9AE', colors.yellowDark] as const,
  paleMint: ['#DFFAF0', '#C1EDDC'] as const,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
  huge: 36,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  control: 20,
  button: 24,
  card: 28,
  panel: 32,
  hero: 36,
  pill: 999,
} as const;

export const typography = {
  display: 'Baloo2_800ExtraBold',
  displaySemi: 'Baloo2_600SemiBold',
  ui: 'Nunito_600SemiBold',
  uiRegular: 'Nunito_400Regular',
  uiBold: 'Nunito_700Bold',
  uiExtra: 'Nunito_800ExtraBold',
  uiBlack: 'Nunito_900Black',
} as const;

export const clayShadow = (color = 'rgba(84,64,170,0.28)', elevation = 7): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: Math.max(4, elevation) },
  shadowOpacity: 1,
  shadowRadius: elevation + 4,
  elevation,
});

export const typeStyles = {
  display: {
    fontFamily: typography.display,
    color: colors.text,
    letterSpacing: -0.4,
  } satisfies TextStyle,
  label: {
    fontFamily: typography.uiExtra,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  } satisfies TextStyle,
};
