import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import PreTriageScreen from '../screens/PreTriageScreen';
import HomeScreen from '../screens/HomeScreen';

export type RootStackParamList = {
  PreTriage: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function PreTriageRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PreTriage'>) {
  return (
    <PreTriageScreen onStartSession={() => navigation.navigate('Home')} />
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

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PreTriage" component={PreTriageRoute} />
      <Stack.Screen name="Home" component={HomeRoute} />
    </Stack.Navigator>
  );
}
