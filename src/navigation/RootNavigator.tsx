import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import PreTriageScreen from '../screens/PreTriageScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ForwardProcessingScreen from '../screens/ForwardProcessingScreen';
import ReplyReviewScreen from '../screens/ReplyReviewScreen';
import PostponedPromptScreen from '../screens/PostponedPromptScreen';
import SmartRulesScreen from '../screens/SmartRulesScreen';
import { useTriageStore } from '../store/triageStore';

export type RootStackParamList = {
  PreTriage: undefined;
  Home: undefined;
  Settings: undefined;
  ForwardProcessing: undefined;
  ReplyReview: undefined;
  PostponedPrompt: undefined;
  SmartRules: undefined;
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
    <HomeScreen onSessionComplete={() => navigation.replace('ForwardProcessing')} />
  );
}

function SettingsRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  return <SettingsScreen onClose={() => navigation.goBack()} />;
}

function ForwardProcessingRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ForwardProcessing'>) {
  return (
    <ForwardProcessingScreen onComplete={() => navigation.replace('ReplyReview')} />
  );
}

function ReplyReviewRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ReplyReview'>) {
  return (
    <ReplyReviewScreen
      onComplete={() => {
        const hasPostponed = useTriageStore.getState().queues.queue_postponed.length > 0;
        navigation.replace(hasPostponed ? 'PostponedPrompt' : 'SmartRules');
      }}
    />
  );
}

function PostponedPromptRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PostponedPrompt'>) {
  return (
    <PostponedPromptScreen
      onHandleNow={() => navigation.replace('Home')}
      onSkip={() => navigation.replace('SmartRules')}
    />
  );
}

function SmartRulesRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'SmartRules'>) {
  return (
    <SmartRulesScreen
      onDone={() => navigation.reset({ index: 0, routes: [{ name: 'PreTriage' }] })}
    />
  );
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
      <Stack.Screen name="ForwardProcessing" component={ForwardProcessingRoute} />
      <Stack.Screen name="ReplyReview" component={ReplyReviewRoute} />
      <Stack.Screen name="PostponedPrompt" component={PostponedPromptRoute} />
      <Stack.Screen name="SmartRules" component={SmartRulesRoute} />
    </Stack.Navigator>
  );
}
