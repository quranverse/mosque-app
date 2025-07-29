import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';
import IslamicInput from '../../components/Common/IslamicInput';
import IslamicButton from '../../components/Common/IslamicButton';
import AuthService from '../../services/AuthService/AuthService';

const PasswordChangeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }

    if (!formData.newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (formData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'Password changed successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Change Password</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <Icon name="security" size={48} color={Colors.primary.main} />
            <Text style={styles.infoTitle}>Change Your Password</Text>
            <Text style={styles.infoDescription}>
              Enter your current password and choose a new secure password for your account.
            </Text>
          </View>

          <View style={styles.formSection}>
            <IslamicInput
              label="Current Password"
              value={formData.currentPassword}
              onChangeText={(value) => handleInputChange('currentPassword', value)}
              placeholder="Enter your current password"
              secureTextEntry={!showPasswords.current}
              leftIcon="lock"
              rightIcon={showPasswords.current ? "visibility-off" : "visibility"}
              onRightIconPress={() => togglePasswordVisibility('current')}
              required
            />

            <IslamicInput
              label="New Password"
              value={formData.newPassword}
              onChangeText={(value) => handleInputChange('newPassword', value)}
              placeholder="Enter a new secure password"
              secureTextEntry={!showPasswords.new}
              leftIcon="lock-outline"
              rightIcon={showPasswords.new ? "visibility-off" : "visibility"}
              onRightIconPress={() => togglePasswordVisibility('new')}
              required
              helperText="Password must be at least 6 characters long"
            />

            <IslamicInput
              label="Confirm New Password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              placeholder="Confirm your new password"
              secureTextEntry={!showPasswords.confirm}
              leftIcon="lock-outline"
              rightIcon={showPasswords.confirm ? "visibility-off" : "visibility"}
              onRightIconPress={() => togglePasswordVisibility('confirm')}
              required
              error={
                formData.confirmPassword && 
                formData.newPassword !== formData.confirmPassword
                  ? 'Passwords do not match'
                  : null
              }
            />
          </View>

          <View style={styles.actionSection}>
            <IslamicButton
              title="Change Password"
              onPress={handleChangePassword}
              loading={loading}
              disabled={!formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              icon="security"
            />
          </View>

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Password Security Tips</Text>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={Colors.status.success} />
              <Text style={styles.tipText}>Use at least 6 characters</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={Colors.status.success} />
              <Text style={styles.tipText}>Include letters and numbers</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={Colors.status.success} />
              <Text style={styles.tipText}>Avoid common words or phrases</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={Colors.status.success} />
              <Text style={styles.tipText}>Don't reuse old passwords</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  infoSection: {
    alignItems: 'center',
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  infoTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.sizes.md * 1.5,
  },
  formSection: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  actionSection: {
    marginBottom: Spacing.lg,
  },
  tipsSection: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
});

export default PasswordChangeScreen;
