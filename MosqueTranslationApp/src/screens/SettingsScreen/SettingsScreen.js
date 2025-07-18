import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicButton from '../../components/Common/IslamicButton';
import IslamicDropdown from '../../components/Common/IslamicDropdown';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';
import AuthService from '../../services/AuthService/AuthService';

const SettingsScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    prayerTimes: true,
    liveTranslation: true,
    mosqueNews: true,
    events: true,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    
    if (user && user.preferences) {
      setLanguage(user.preferences.language || 'en');
      setNotifications(user.preferences.notifications || notifications);
    }
  };

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'العربية (Arabic)', value: 'ar' },
    { label: 'Français (French)', value: 'fr' },
    { label: 'اردو (Urdu)', value: 'ur' },
    { label: 'Türkçe (Turkish)', value: 'tr' },
  ];

  const handleLanguageChange = async (selectedLanguage) => {
    setLanguage(selectedLanguage.value);
    await AuthService.setLanguagePreference(selectedLanguage.value);
  };

  const handleNotificationToggle = async (key, value) => {
    const newNotifications = {
      ...notifications,
      [key]: value,
    };
    setNotifications(newNotifications);
    
    // Update user preferences (works for both anonymous and authenticated users)
    if (currentUser) {
      await AuthService.updateUserPreferences({
        notifications: newNotifications,
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            // Navigation will be handled automatically by the auth listener
          },
        },
      ]
    );
  };

  const getSelectedLanguage = () => {
    return languageOptions.find(lang => lang.value === language) || languageOptions[0];
  };

  const renderSettingSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderSettingItem = (icon, title, subtitle, onPress, rightComponent) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color={Colors.primary.main} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationToggle = (key, title, subtitle) => (
    renderSettingItem(
      'notifications',
      title,
      subtitle,
      null,
      <Switch
        value={notifications[key]}
        onValueChange={(value) => handleNotificationToggle(key, value)}
        trackColor={{
          false: Colors.neutral.border,
          true: Colors.primary.light,
        }}
        thumbColor={notifications[key] ? Colors.primary.main : Colors.neutral.surface}
      />
    )
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        {currentUser && (
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <Icon
                name={AuthService.isMosqueAdmin() ? 'account-balance' :
                      AuthService.isAnonymous() ? 'person-outline' : 'person'}
                size={40}
                color={Colors.primary.main}
              />
              <View style={styles.userText}>
                <Text style={styles.userName}>
                  {AuthService.isMosqueAdmin()
                    ? currentUser.mosqueName || 'Mosque Admin'
                    : AuthService.isAnonymous()
                    ? 'Anonymous User'
                    : 'Individual User'
                  }
                </Text>
                <Text style={styles.userEmail}>
                  {AuthService.isAnonymous()
                    ? 'Using app without account'
                    : currentUser.email || 'No email'
                  }
                </Text>
              </View>
            </View>

            {/* Show account creation option for anonymous users */}
            {AuthService.isAnonymous() && (
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => {
                  Alert.alert(
                    'Create Account',
                    'Creating an account will clear your current session. Your followed mosques will be lost unless you follow them again after creating an account.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Continue',
                        onPress: async () => {
                          await AuthService.logout();
                          // Navigation will be handled automatically by the auth listener
                        },
                      },
                    ]
                  );
                }}
              >
                <Icon name="person-add" size={20} color={Colors.primary.main} />
                <Text style={styles.createAccountText}>Create Account</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Language Settings */}
        {renderSettingSection('Language & Region', (
          <View style={styles.languageContainer}>
            <IslamicDropdown
              label="Interface Language"
              value={getSelectedLanguage()}
              onSelect={handleLanguageChange}
              options={languageOptions}
              style={styles.languageDropdown}
            />
          </View>
        ))}

        {/* Notification Settings */}
        {renderSettingSection('Notifications', (
          <>
            {renderNotificationToggle(
              'prayerTimes',
              'Prayer Time Reminders',
              'Get notified before prayer times'
            )}
            {renderNotificationToggle(
              'liveTranslation',
              'Live Translation Alerts',
              'Notifications when live sessions start'
            )}
            {renderNotificationToggle(
              'mosqueNews',
              'Mosque News & Updates',
              'Updates from followed mosques'
            )}
            {renderNotificationToggle(
              'events',
              'Events & Programs',
              'Special events and programs'
            )}
          </>
        ))}

        {/* App Settings */}
        {renderSettingSection('App Settings', (
          <>
            {renderSettingItem(
              'info',
              'About Us',
              'Learn more about the app',
              () => {
                // Navigate to About screen
                Alert.alert('About Us', 'About Us screen coming soon!');
              },
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            )}
            {renderSettingItem(
              'privacy-tip',
              'Privacy Policy',
              'Read our privacy policy',
              () => {
                Alert.alert('Privacy Policy', 'Privacy Policy screen coming soon!');
              },
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            )}
            {renderSettingItem(
              'description',
              'Terms of Service',
              'Read our terms of service',
              () => {
                Alert.alert('Terms of Service', 'Terms of Service screen coming soon!');
              },
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            )}
            {renderSettingItem(
              'feedback',
              'Send Feedback',
              'Help us improve the app',
              () => {
                Alert.alert('Feedback', 'Feedback feature coming soon!');
              },
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            )}
            {renderSettingItem(
              'wifi',
              'Connection Test',
              'Test connection to backend server',
              () => {
                navigation.navigate('ConnectionTest');
              },
              <Icon name="chevron-right" size={24} color={Colors.text.secondary} />
            )}
          </>
        ))}

        {/* Account Actions */}
        {currentUser && (
          <View style={styles.actionsSection}>
            <IslamicButton
              title="Logout"
              onPress={handleLogout}
              variant="outline"
              size="lg"
              icon="logout"
              style={styles.logoutButton}
            />
          </View>
        )}

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>
            Mosque Translation App v1.0.0
          </Text>
          <Text style={styles.versionSubtext}>
            Made with ❤️ for the Muslim community
          </Text>
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
  scrollView: {
    flex: 1,
  },
  userSection: {
    backgroundColor: Colors.neutral.surface,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.light + '20',
  },
  createAccountText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.main,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.divider,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  settingSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.normal,
  },
  settingRight: {
    marginLeft: Spacing.md,
  },
  languageContainer: {
    padding: Spacing.lg,
  },
  languageDropdown: {
    marginBottom: 0,
  },
  actionsSection: {
    margin: Spacing.lg,
  },
  logoutButton: {
    borderColor: Colors.status.error,
  },
  versionSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  versionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  versionSubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.hint,
    textAlign: 'center',
  },
});

export default SettingsScreen;
