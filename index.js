// import "./src/utils/wdyr";
import * as React from 'react';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import App from './src/App.jsx';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from "expo";

// Fixed YikYak-style theme (v1.2.0): the real YikYak app is dark-only -
// black background, near-black cards, white text, teal-green accent.
// This replaces the dynamic Material You theme, which followed the
// system light/dark setting and looked nothing like YikYak.
const yakTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00DDB4',
    onPrimary: '#000000',
    primaryContainer: '#06392D',
    onPrimaryContainer: '#00DDB4',
    secondary: '#00DDB4',
    onSecondary: '#000000',
    secondaryContainer: '#2C2C2E',
    onSecondaryContainer: '#FFFFFF',
    tertiary: '#2F80ED',
    background: '#000000',
    onBackground: '#FFFFFF',
    surface: '#1C1C1E',
    onSurface: '#FFFFFF',
    surfaceVariant: '#2C2C2E',
    onSurfaceVariant: '#A7A7AD',
    surfaceDisabled: 'rgba(255,255,255,0.12)',
    onSurfaceDisabled: '#8E8E93',
    outline: '#48484A',
    outlineVariant: '#2C2C2E',
    error: '#FF453A',
    onError: '#FFFFFF',
    errorContainer: '#2C0E0C',
    onErrorContainer: '#FF8A80',
    inverseSurface: '#FFFFFF',
    inverseOnSurface: '#000000',
    inversePrimary: '#00DDB4',
    backdrop: 'rgba(0,0,0,0.65)',
    surfaceContainer: '#1C1C1E',
    surfaceContainerLow: '#141416',
    surfaceContainerLowest: '#000000',
    surfaceContainerHigh: '#232326',
    surfaceContainerHighest: '#2C2C2E',
    surfaceBright: '#2C2C2E',
    surfaceDim: '#000000',
    elevation: {
      level0: 'transparent',
      level1: '#1C1C1E',
      level2: '#1E1E20',
      level3: '#232326',
      level4: '#26262A',
      level5: '#2C2C2E',
    },
  },
};

export default function Main() {
  return (
    <PaperProvider theme={yakTheme}>
      <GestureHandlerRootView>
        <App />
      </GestureHandlerRootView>
    </PaperProvider>
  );
}

registerRootComponent(Main);
