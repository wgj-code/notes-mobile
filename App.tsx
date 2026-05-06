import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from './src/stores/authStore';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NotesScreen from './src/screens/NotesScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { t } from './src/i18n';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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
    </NotesStack.Navigator>
  );
}

export default function App() {
  const { session, loading, init } = useAuthStore();

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
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
