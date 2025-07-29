import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicButton from './IslamicButton';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';
import AuthService from '../../services/AuthService/AuthService';

const AuthenticationPrompt = ({ 
  title = "Sign In Required",
  message = "Please sign in to access live translation features and follow mosques.",
  onSignIn,
  onRegister,
  showRegisterOption = true,
  style = {},
}) => {

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      // Default navigation to login screen
      Alert.alert(
        'Sign In',
        'Please navigate to the sign-in screen to continue.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister();
    } else {
      // Default navigation to registration screen
      Alert.alert(
        'Register',
        'Please navigate to the registration screen to create an account.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[Colors.primary.light, Colors.primary.main]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="lock" size={48} color={Colors.text.inverse} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <IslamicButton
              title="Sign In"
              onPress={handleSignIn}
              variant="secondary"
              size="lg"
              icon="login"
              style={styles.signInButton}
            />

            {showRegisterOption && (
              <IslamicButton
                title="Create Account"
                onPress={handleRegister}
                variant="outline"
                size="lg"
                icon="person-add"
                style={styles.registerButton}
              />
            )}
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>With an account you can:</Text>
            <View style={styles.benefitItem}>
              <Icon name="translate" size={16} color={Colors.text.inverse} />
              <Text style={styles.benefitText}>Access live translations</Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="favorite" size={16} color={Colors.text.inverse} />
              <Text style={styles.benefitText}>Follow your favorite mosques</Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="notifications" size={16} color={Colors.text.inverse} />
              <Text style={styles.benefitText}>Receive prayer notifications</Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="history" size={16} color={Colors.text.inverse} />
              <Text style={styles.benefitText}>View translation history</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  gradient: {
    flex: 1,
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading.h2,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.body.large,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    opacity: 0.9,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  signInButton: {
    marginBottom: Spacing.md,
  },
  registerButton: {
    borderColor: Colors.text.inverse,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  benefitsTitle: {
    ...Typography.body.medium,
    color: Colors.text.inverse,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  benefitText: {
    ...Typography.body.medium,
    color: Colors.text.inverse,
    marginLeft: Spacing.sm,
    opacity: 0.9,
  },
});

export default AuthenticationPrompt;
