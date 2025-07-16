import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, ActivityIndicator, Text } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import PrayerTimesScreen from '../screens/PrayerTimesScreen/PrayerTimesScreen';
import QiblaScreen from '../screens/QiblaScreen/QiblaScreen';
import TranslationScreen from '../screens/TranslationScreen/TranslationScreen';
import SpeechLibraryScreen from '../screens/SpeechLibraryScreen/SpeechLibraryScreen';
import MosqueControlScreen from '../screens/MosqueControlScreen/MosqueControlScreen';

// Import new authentication screens
import WelcomeScreen from '../screens/WelcomeScreen/WelcomeScreen';
import MosqueRegistrationScreen from '../screens/MosqueRegistrationScreen/MosqueRegistrationScreen';
import IndividualOnboardingScreen from '../screens/IndividualOnboardingScreen/IndividualOnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Prayer Times" component={PrayerTimesScreen} />
      <Tab.Screen name="Qibla" component={QiblaScreen} />
      <Tab.Screen name="Translation" component={TranslationScreen} />
      <Tab.Screen name="Speeches" component={SpeechLibraryScreen} />

      {/* Show Mosque Control tab only for mosque admins */}
      {isMosqueAdmin && (
        <Tab.Screen
          name="Mosque Control"
          component={MosqueControlScreen}
          options={{
            tabBarLabel: 'Control',
          }}
        />
      )}

      {/* Settings tab for all users */}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
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

      // Check if user is authenticated
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Check if this is first time user
      const firstTime = await AuthService.isFirstTimeUser();
      setIsFirstTime(firstTime);

      // If user is authenticated but it's first time, mark as not first time
      if (authenticated && firstTime) {
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
        <MainTabNavigator />
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
