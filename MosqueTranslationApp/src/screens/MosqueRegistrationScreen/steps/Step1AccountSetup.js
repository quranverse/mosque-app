import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IslamicInput from '../../../components/Common/IslamicInput';
import IslamicDropdown from '../../../components/Common/IslamicDropdown';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step1AccountSetup = ({ data, onUpdate }) => {
  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'العربية (Arabic)', value: 'ar' },
    { label: 'Français (French)', value: 'fr' },
    { label: 'اردو (Urdu)', value: 'ur' },
    { label: 'Türkçe (Turkish)', value: 'tr' },
    { label: 'Español (Spanish)', value: 'es' },
    { label: 'Deutsch (German)', value: 'de' },
    { label: 'Italiano (Italian)', value: 'it' },
    { label: 'Português (Portuguese)', value: 'pt' },
    { label: 'Русский (Russian)', value: 'ru' },
  ];

  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleLanguageChange = (selectedLanguage) => {
    onUpdate({ language: selectedLanguage.value });
  };

  const getSelectedLanguage = () => {
    return languageOptions.find(lang => lang.value === data.language) || languageOptions[0];
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Account Setup</Text>
        <Text style={styles.stepDescription}>
          Create your administrator account
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Email Address */}
        <IslamicInput
          label="Email Address"
          value={data.email}
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
          value={data.password}
          onChangeText={(value) => handleInputChange('password', value)}
          placeholder="Enter a secure password"
          secureTextEntry
          leftIcon="lock"
          required
        />

        {/* Confirm Password */}
        <IslamicInput
          label="Confirm Password"
          value={data.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          placeholder="Re-enter your password"
          secureTextEntry
          leftIcon="lock"
          required
          error={
            data.password && 
            data.confirmPassword && 
            data.password !== data.confirmPassword 
              ? 'Passwords do not match' 
              : null
          }
        />

        {/* Language Preference */}
        <IslamicDropdown
          label="Interface Language"
          value={getSelectedLanguage()}
          onSelect={handleLanguageChange}
          options={languageOptions}
          placeholder="Select your preferred language"
          required
        />

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Account Information</Text>
          <Text style={styles.infoText}>
            • Your email will be used for login and important notifications
          </Text>
          <Text style={styles.infoText}>
            • Password must be at least 8 characters long
          </Text>
          <Text style={styles.infoText}>
            • You can change your language preference later in settings
          </Text>
          <Text style={styles.infoText}>
            • This account will have administrative privileges for your mosque
          </Text>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Security Notice</Text>
          <Text style={styles.securityText}>
            Your password is encrypted and stored securely. We recommend using a strong password with a mix of letters, numbers, and symbols.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.normal,
  },
  formContainer: {
    flex: 1,
    paddingBottom: Spacing['2xl'], // Extra padding for keyboard
  },
  infoBox: {
    backgroundColor: Colors.primary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
  },
  infoTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  securityNotice: {
    backgroundColor: Colors.secondary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
  },
  securityTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.sm,
  },
  securityText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed,
  },
});

export default Step1AccountSetup;
