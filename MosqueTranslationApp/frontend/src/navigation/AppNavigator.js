import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, ActivityIndicator, Text } from 'react-native';

// Import screens
import PrayerTimesScreen from '../screens/PrayerTimesScreen/PrayerTimesScreen';
import QiblaScreen from '../screens/QiblaScreen/QiblaScreen';
import TranslationScreen from '../screens/TranslationScreen/TranslationScreen';

// Import new authentication screens
import WelcomeScreen from '../screens/WelcomeScreen/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen/LoginScreen';
import MosqueRegistrationScreen from '../screens/MosqueRegistrationScreen/MosqueRegistrationScreen';
import IndividualOnboardingScreen from '../screens/IndividualOnboardingScreen/IndividualOnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';
import HorizontalTranslationScreen from '../screens/HorizontalTranslationScreen/HorizontalTranslationScreen';
import MosqueManagementScreen from '../screens/MosqueManagementScreen';
import BroadcastingScreen from '../screens/BroadcastingScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import MosqueProfileScreen from '../screens/MosqueProfileScreen/MosqueProfileScreen';
import PasswordChangeScreen from '../screens/PasswordChangeScreen';
import ConnectionTestScreen from '../screens/ConnectionTestScreen';
import ArchiveScreen from '../screens/ArchiveScreen';

// Import services
import AuthService from '../services/AuthService/AuthService';
import { Colors } from '../utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main app tabs for authenticated users
const MainTabNavigator = () => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = AuthService.addAuthListener((user) => {
      setCurrentUser(user);
    });

    // Get initial user state
    setCurrentUser(AuthService.getCurrentUser());

    return unsubscribe;
  }, []);

  const isMosqueAdmin = currentUser && AuthService.isMosqueAdmin();
  const isAnonymous = currentUser && AuthService.isAnonymous();

  // Ensure we have valid components with fallbacks
  const MainContentComponent = (isMosqueAdmin && BroadcastingScreen) ? BroadcastingScreen : TranslationScreen;
  const mainContentLabel = isMosqueAdmin ? 'Broadcasting' : 'Translation';
  const mainContentIcon = isMosqueAdmin ? 'mic' : 'translate';

  // Safety check - if components are not loaded, show loading
  if (!TranslationScreen || !BroadcastingScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Prayer Times') {
            iconName = 'schedule';
          } else if (route.name === 'Qibla') {
            iconName = 'explore';
          } else if (route.name === 'Translation') {
            iconName = 'translate';
          } else if (route.name === 'Speeches') {
            iconName = 'library-music';
          } else if (route.name === 'Mosque Control') {
            iconName = 'settings';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary.main,
        tabBarInactiveTintColor: Colors.text.secondary,
        headerStyle: {
          backgroundColor: Colors.primary.main,
        },
        headerTintColor: Colors.text.inverse,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      {/* Prayer Times - Default tab for all users */}
      <Tab.Screen
        name="Prayer Times"
        component={PrayerTimesScreen}
        options={{
          tabBarLabel: 'Prayer Times',
          tabBarIcon: ({ color, size }) => (
            <Icon name="access-time" size={size} color={color} />
          ),
          headerShown: false, // Hide default header since we have custom header
        }}
      />

      {/* Main Content Tab - Shows different content based on user type */}
      <Tab.Screen
        name="MainContent"
        component={MainContentComponent}
        options={{
          tabBarLabel: mainContentLabel,
          tabBarIcon: ({ color, size }) => (
            <Icon name={mainContentIcon} size={size} color={color} />
          ),
        }}
      />

      {/* Announcements for all users */}
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{
          tabBarLabel: 'Announcements',
          tabBarIcon: ({ color, size }) => (
            <Icon name="announcement" size={size} color={color} />
          ),
        }}
      />

      {/* Qibla for all users */}
      <Tab.Screen
        name="Qibla"
        component={QiblaScreen}
        options={{
          tabBarLabel: 'Qibla',
          tabBarIcon: ({ color, size }) => (
            <Icon name="explore" size={size} color={color} />
          ),
        }}
      />

      {/* Settings for all users */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main stack navigator that includes tabs and modal screens
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="HorizontalTranslation"
        component={HorizontalTranslationScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="MosqueManagement"
        component={MosqueManagementScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ConnectionTest"
        component={ConnectionTestScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Connection Test',
        }}
      />
      <Stack.Screen
        name="MosqueProfile"
        component={MosqueProfileScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PasswordChange"
        component={PasswordChangeScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

// Authentication stack for non-authenticated users
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MosqueRegistration" component={MosqueRegistrationScreen} />
      <Stack.Screen name="IndividualOnboarding" component={IndividualOnboardingScreen} />
    </Stack.Navigator>
  );
};



// Main App Navigator with authentication flow
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize auth service
      await AuthService.initialize();

      // Check if user has any session (authenticated or anonymous)
      const hasUser = AuthService.hasUser();
      setIsAuthenticated(hasUser);

      // Check if this is first time user
      const firstTime = await AuthService.isFirstTimeUser();
      setIsFirstTime(firstTime);

      // If user has session but it's first time, mark as not first time
      if (hasUser && firstTime) {
        await AuthService.markNotFirstTime();
        setIsFirstTime(false);
      }

    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = AuthService.addAuthListener((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        setIsFirstTime(false);
      }
    });

    return unsubscribe;
  }, []);

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.neutral.background,
      }}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainStackNavigator />
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
