import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
  type MD3Theme,
} from 'react-native-paper';
import { lightColors, darkColors } from './colors';

const fontConfig = {
  fontFamily: 'System',
};

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    onPrimary: lightColors.onPrimary,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceVariant,
    onSurface: lightColors.onSurface,
    onSurfaceVariant: lightColors.onSurfaceVariant,
    outline: lightColors.outline,
    error: lightColors.error,
  },
};

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    onPrimary: darkColors.onPrimary,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    onSurface: darkColors.onSurface,
    onSurfaceVariant: darkColors.onSurfaceVariant,
    outline: darkColors.outline,
    error: darkColors.error,
  },
};

export const swipeColors = {
  light: lightColors,
  dark: darkColors,
};

export { lightColors, darkColors };
