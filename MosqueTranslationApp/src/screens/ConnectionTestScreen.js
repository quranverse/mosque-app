import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing } from '../utils/theme';
import { ConnectionTest } from '../utils/ConnectionTest';
import { API_BASE_URL } from '../config/api';

const ConnectionTestScreen = ({ navigation }) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);

  const runConnectionTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const testResults = await ConnectionTest.runFullConnectionTest();
      setResults(testResults);

      if (testResults.success) {
        Alert.alert('✅ Success', 'All connections are working properly!');
      } else {
        Alert.alert('❌ Connection Issues', 'Some connections failed. Check the details below.');
      }
    } catch (error) {
      console.error('Test error:', error);
      Alert.alert('Error', 'Failed to run connection test');
    } finally {
      setTesting(false);
    }
  };

  const testApiOnly = async () => {
    setTesting(true);
    try {
      const result = await ConnectionTest.testApiConnection();
      Alert.alert(
        result.success ? '✅ API Success' : '❌ API Failed',
        result.message
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test API connection');
    } finally {
      setTesting(false);
    }
  };

  const testWebSocketOnly = async () => {
    setTesting(true);
    try {
      const result = await ConnectionTest.testWebSocketConnection();
      Alert.alert(
        result.success ? '✅ WebSocket Success' : '❌ WebSocket Failed',
        result.message
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test WebSocket connection');
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connection Test</Text>
        <Text style={styles.subtitle}>Test your app's connection to the backend server</Text>
      </View>

      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Current Configuration</Text>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>API Base URL:</Text>
          <Text style={styles.configValue}>{API_BASE_URL}</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>WebSocket URL:</Text>
          <Text style={styles.configValue}>{API_BASE_URL.replace('/api', '').replace('http', 'ws')}</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Frontend Port:</Text>
          <Text style={styles.configValue}>5000</Text>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Backend Port:</Text>
          <Text style={styles.configValue}>8080</Text>
        </View>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runConnectionTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Run Full Test</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testApiOnly}
          disabled={testing}
        >
          <Text style={styles.secondaryButtonText}>Test API Only</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testWebSocketOnly}
          disabled={testing}
        >
          <Text style={styles.secondaryButtonText}>Test WebSocket Only</Text>
        </TouchableOpacity>
      </View>

      {results && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Overall Status:</Text>
            <Text style={[styles.resultValue, results.success ? styles.success : styles.error]}>
              {results.success ? '✅ All Good' : '❌ Issues Found'}
            </Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>API Connection:</Text>
            <Text style={[styles.resultValue, results.results.api.success ? styles.success : styles.error]}>
              {results.summary.api}
            </Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>WebSocket Connection:</Text>
            <Text style={[styles.resultValue, results.results.websocket.success ? styles.success : styles.error]}>
              {results.summary.websocket}
            </Text>
          </View>

          {!results.success && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              {!results.results.api.success && (
                <Text style={styles.errorText}>API: {results.results.api.error}</Text>
              )}
              {!results.results.websocket.success && (
                <Text style={styles.errorText}>WebSocket: {results.results.websocket.error}</Text>
              )}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.backButton]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  configSection: {
    backgroundColor: Colors.neutral.surface,
    padding: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  configItem: {
    marginBottom: Spacing.sm,
  },
  configLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  configValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  buttonSection: {
    marginBottom: Spacing.xl,
  },
  button: {
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary.main,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary.main,
  },
  backButton: {
    backgroundColor: Colors.neutral.border,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  secondaryButtonText: {
    color: Colors.primary.main,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  backButtonText: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  resultsSection: {
    backgroundColor: Colors.neutral.surface,
    padding: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
  },
  resultValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  success: {
    color: Colors.status.success,
  },
  error: {
    color: Colors.status.error,
  },
  errorDetails: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.status.errorSurface,
    borderRadius: 4,
  },
  errorTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.status.error,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.status.error,
    marginBottom: Spacing.xs,
  },
});

export default ConnectionTestScreen;
