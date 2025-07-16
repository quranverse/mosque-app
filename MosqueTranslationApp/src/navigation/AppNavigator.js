import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import HomeScreen from '../screens/HomeScreen/HomeScreen';
import PrayerTimesScreen from '../screens/PrayerTimesScreen/PrayerTimesScreen';
import QiblaScreen from '../screens/QiblaScreen/QiblaScreen';
import TranslationScreen from '../screens/TranslationScreen/TranslationScreen';
import SpeechLibraryScreen from '../screens/SpeechLibraryScreen/SpeechLibraryScreen';
import MosqueControlScreen from '../screens/MosqueControlScreen/MosqueControlScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
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
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2E7D32',
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: '#2E7D32',
          },
          headerTintColor: '#fff',
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
        <Tab.Screen name="Mosque Control" component={MosqueControlScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
