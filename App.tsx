import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from './src/stores/authStore';
import { ThemeProvider } from './src/contexts/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotesScreen from './src/screens/NotesScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import RecycleBinScreen from './src/screens/RecycleBinScreen';
import GraphScreen from './src/screens/GraphScreen';
import VoiceNoteScreen from './src/screens/VoiceNoteScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import FeedbackButton from './src/components/FeedbackButton';
import { t } from './src/i18n';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Feedback: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  NotesTab: undefined;
  SettingsTab: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="NotesTab"
          component={NotesNavigator}
          options={() => ({ title: t('notes.notes') })}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={() => ({ title: t('settings.settings') })}
        />
      </Tab.Navigator>
      <FeedbackButtonOverlay />
    </View>
  );
}

function FeedbackButtonOverlay() {
  const navigation = useNavigation<any>();
  return (
    <FeedbackButton onPress={() => navigation.navigate('Feedback')} />
  );
}

const NotesStack = createNativeStackNavigator();

function NotesNavigator() {
  return (
    <NotesStack.Navigator>
      <NotesStack.Screen
        name="NotesList"
        component={NotesScreen}
        options={() => ({ title: t('notes.notes') })}
      />
      <NotesStack.Screen
        name="NoteDetail"
        component={NoteDetailScreen}
        options={() => ({ title: t('notes.note') })}
      />
      <NotesStack.Screen
        name="RecycleBin"
        component={RecycleBinScreen}
        options={() => ({ title: t('notes.recycleBin') })}
      />
      <NotesStack.Screen
        name="Graph"
        component={GraphScreen}
        options={() => ({ title: t('notes.graph') })}
      />
      <NotesStack.Screen
        name="VoiceNote"
        component={VoiceNoteScreen}
        options={() => ({ title: '语音笔记' })}
      />
    </NotesStack.Navigator>
  );
}

export default function App() {
  const { session, loading, authChecked, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {authChecked && !session ? (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              <RootStack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{
                  headerShown: true,
                  title: t('feedback.title'),
                  presentation: 'modal',
                }}
              />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
