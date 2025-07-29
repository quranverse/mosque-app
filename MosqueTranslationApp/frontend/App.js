import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkService from './src/services/NetworkService';
import SocketService from './src/services/SocketService/SocketService';
import NotificationService from './src/services/NotificationService/NotificationService';

export default function App() {
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize notification service
        await NotificationService.initialize();
        console.log('✅ Notification service initialized');

        // Initialize global socket service for real-time updates
        const socketResult = await SocketService.initialize();
        if (socketResult) {
          console.log('✅ Socket service initialized');
        } else {
          console.warn('⚠️ Socket service initialization failed, but app will continue');
        }
      } catch (error) {
        console.error('❌ Error initializing services:', error);
        console.warn('⚠️ Some services failed to initialize, but app will continue');
      }
    };

    // Start network monitoring when app starts
    const unsubscribe = NetworkService.addListener((eventType, data) => {
      console.log('🌐 Network event:', eventType, data);

      if (eventType === 'network_changed') {
        console.log('✅ Network changed, API connection refreshed to:', data.newApiUrl);
      } else if (eventType === 'network_error') {
        console.error('❌ Network error:', data.error.message);
      }
    });

    // Initialize services
    initializeServices();

    // Cleanup on unmount
    return () => {
      unsubscribe();
      SocketService.disconnect();
    };
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" backgroundColor="#2E7D32" />
    </>
  );
}
