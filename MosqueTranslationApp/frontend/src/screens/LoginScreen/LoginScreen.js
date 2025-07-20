import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicInput from '../../components/Common/IslamicInput';
import IslamicButton from '../../components/Common/IslamicButton';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';
import AuthService from '../../services/AuthService/AuthService';

const LoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { email, password } = formData;
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    
    if (!AuthService.isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await AuthService.login(formData.email, formData.password);
      
      if (result.success) {
        // Navigation will be handled automatically by AppNavigator
        // when the auth state changes
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToWelcome = () => {
    navigation.goBack();
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password reset functionality will be available soon. Please contact support if you need assistance.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return <LoadingSpinner message="Signing you in..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary.main, Colors.primary.dark]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToWelcome}
              >
                <Icon name="arrow-back" size={24} color={Colors.text.inverse} />
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <Icon name="mosque" size={60} color={Colors.text.inverse} />
              </View>
              
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to your mosque account
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Sign In</Text>
                
                {/* Email */}
                <IslamicInput
                  label="Email Address"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="mosque@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="email"
                  required
                />

                {/* Password */}
                <IslamicInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  leftIcon="lock"
                  rightIcon={showPassword ? "visibility-off" : "visibility"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  required
                />

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot your password?
                  </Text>
                </TouchableOpacity>

                {/* Login Button */}
                <IslamicButton
                  title="Sign In"
                  onPress={handleLogin}
                  variant="primary"
                  size="lg"
                  icon="login"
                  loading={loading}
                  style={styles.loginButton}
                />

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Register Link */}
                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => navigation.navigate('MosqueRegistration')}
                >
                  <Text style={styles.registerText}>
                    Don't have an account? <Text style={styles.registerTextBold}>Register here</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.heading.h1,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body.large,
    color: Colors.text.inverse,
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  formCard: {
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    ...Typography.heading.h2,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.body.small,
    color: Colors.primary.main,
  },
  loginButton: {
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral.border,
  },
  dividerText: {
    ...Typography.body.small,
    color: Colors.text.secondary,
    marginHorizontal: Spacing.md,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  registerText: {
    ...Typography.body.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  registerTextBold: {
    color: Colors.primary.main,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
