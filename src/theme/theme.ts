import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const COLORS = {
  lightPurple: '#BAB9EB',
  pinkPurple: '#EAB9EB',
  lightBlue: '#B9C9EB',
  purple: '#AB89F0',
  white: '#FFFFFF',
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
  },
};

export default theme; 