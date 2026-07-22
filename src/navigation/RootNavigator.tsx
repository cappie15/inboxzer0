import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import PreTriageScreen from '../screens/PreTriageScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  PreTriage: undefined;
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function PreTriageRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PreTriage'>) {
  return (
    <PreTriageScreen
      onStartSession={() => navigation.navigate('Home')}
      onOpenSettings={() => navigation.navigate('Settings')}
    />
  );
}

function HomeRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <HomeScreen
      onSessionComplete={() =>
        navigation.reset({ index: 0, routes: [{ name: 'PreTriage' }] })
      }
    />
  );
}

function SettingsRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  return <SettingsScreen onClose={() => navigation.goBack()} />;
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PreTriage" component={PreTriageRoute} />
      <Stack.Screen name="Home" component={HomeRoute} />
      <Stack.Screen
        name="Settings"
        component={SettingsRoute}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
