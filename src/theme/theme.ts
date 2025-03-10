import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const COLORS = {
  lightPurple: '#BAB9EB',
  pinkPurple: '#EAB9EB',
  lightBlue: '#B9C9EB',
  purple: '#AB89F0',
  white: '#FFFFFF',
  
  textBlack: '#212121',
  textGrey: '#757575',
  textRed: '#E53935',
  
  iconPrimary: '#AB89F0',
  iconSecondary: '#BAB9EB',
  iconAccent: '#EAB9EB',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.purple,
    primaryContainer: COLORS.lightPurple,
    secondary: COLORS.pinkPurple,
    secondaryContainer: COLORS.lightBlue,
    background: COLORS.white,
    surface: COLORS.white,
    surfaceVariant: COLORS.lightBlue,
    
    moneyPositive: COLORS.textBlack,
    moneyNegative: COLORS.textRed,
    moneyNeutral: COLORS.textGrey,
    
    iconPrimary: COLORS.iconPrimary,
    iconSecondary: COLORS.iconSecondary,
    iconAccent: COLORS.iconAccent,
  },
};

export default theme; 