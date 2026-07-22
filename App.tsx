import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import {
  NavigationContainer,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
} from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { paperLightTheme, paperDarkTheme } from './src/theme';
import { useContactsStore } from './src/store/contactsStore';

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const paperTheme = isDark ? paperDarkTheme : paperLightTheme;
  const loadContacts = useContactsStore((state) => state.loadContacts);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const navigationTheme = {
    ...(isDark ? NavDarkTheme : NavLightTheme),
    colors: {
      ...(isDark ? NavDarkTheme.colors : NavLightTheme.colors),
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      primary: paperTheme.colors.primary,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
