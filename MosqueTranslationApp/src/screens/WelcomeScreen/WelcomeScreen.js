import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicButton from '../../components/Common/IslamicButton';
import AuthService from '../../services/AuthService/AuthService';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCreateMosqueAccount = () => {
    navigation.navigate('MosqueRegistration');
  };

  const handleContinueAsIndividual = async () => {
    // Set up anonymous user and navigate to main app
    try {
      await AuthService.setupAnonymousUser();
      // Navigation will be handled automatically by AppNavigator
      // when the auth state changes to anonymous user
    } catch (error) {
      console.error('Error setting up anonymous user:', error);
      Alert.alert('Error', 'Failed to continue. Please try again.');
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary.main} />
      
      <LinearGradient
        colors={[Colors.primary.main, Colors.primary.dark]}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View 
            style={[
              styles.headerSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Islamic Pattern Background */}
            <View style={styles.patternContainer}>
              <Text style={styles.islamicPattern}>۞</Text>
              <Text style={styles.islamicPattern}>۞</Text>
              <Text style={styles.islamicPattern}>۞</Text>
            </View>

            {/* App Logo/Icon */}
            <View style={styles.logoContainer}>
              <Icon name="mosque" size={80} color={Colors.text.inverse} />
            </View>

            {/* Welcome Text */}
            <Text style={styles.welcomeTitle}>
              Assalamu Alaikum
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Welcome to Mosque Translation App
            </Text>
            <Text style={styles.welcomeDescription}>
              Connect with your local mosque community and access live translations, prayer times, and Islamic content
            </Text>
          </Animated.View>

          {/* Choice Section */}
          <Animated.View 
            style={[
              styles.choiceSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.choiceContainer}>
              <Text style={styles.choiceTitle}>
                How would you like to continue?
              </Text>

              {/* Mosque Account Option */}
              <View style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <Icon name="account-balance" size={40} color={Colors.primary.main} />
                  <Text style={styles.optionTitle}>Create Mosque Account</Text>
                </View>
                <Text style={styles.optionDescription}>
                  For mosque administrators to manage their mosque profile, broadcast live translations, and connect with the community
                </Text>
                <View style={styles.optionFeatures}>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.primary.main} />
                    <Text style={styles.featureText}>Manage mosque information</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.primary.main} />
                    <Text style={styles.featureText}>Broadcast live translations</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.primary.main} />
                    <Text style={styles.featureText}>Connect with followers</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.primary.main} />
                    <Text style={styles.featureText}>Share events and news</Text>
                  </View>
                </View>
                <IslamicButton
                  title="Create Mosque Account"
                  onPress={handleCreateMosqueAccount}
                  variant="primary"
                  size="lg"
                  icon="add"
                  gradient
                  style={styles.optionButton}
                />
              </View>

              {/* Individual User Option */}
              <View style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <Icon name="person" size={40} color={Colors.secondary.main} />
                  <Text style={styles.optionTitle}>Continue as Individual</Text>
                </View>
                <Text style={styles.optionDescription}>
                  For community members to follow local mosques, receive prayer times, and access live translations
                </Text>
                <View style={styles.optionFeatures}>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.secondary.main} />
                    <Text style={styles.featureText}>Follow nearby mosques</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.secondary.main} />
                    <Text style={styles.featureText}>Receive prayer times</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.secondary.main} />
                    <Text style={styles.featureText}>Access live translations</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color={Colors.secondary.main} />
                    <Text style={styles.featureText}>Get mosque updates</Text>
                  </View>
                </View>
                <IslamicButton
                  title="Continue as Individual"
                  onPress={handleContinueAsIndividual}
                  variant="secondary"
                  size="lg"
                  icon="arrow-forward"
                  gradient
                  style={styles.optionButton}
                />
              </View>
            </View>
          </Animated.View>

          {/* Sign In Section */}
          <Animated.View
            style={[
              styles.signInSection,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.signInText}>
              Already have a mosque account?
            </Text>
            <IslamicButton
              title="Sign In"
              onPress={handleSignIn}
              variant="outline"
              size="md"
              icon="login"
              style={styles.signInButton}
            />
          </Animated.View>

          {/* Footer */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.footerText}>
              "And whoever does good deeds, whether male or female, while being a believer, those will enter Paradise"
            </Text>
            <Text style={styles.footerReference}>
              - Quran 4:124
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.xl,
    overflow: 'visible',
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    opacity: 0.1,
  },
  islamicPattern: {
    fontSize: 40,
    color: Colors.text.inverse,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes['3xl'] * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.xl,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.md,
    opacity: 0.9,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  welcomeDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.inverse,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
    opacity: 0.8,
    paddingHorizontal: Spacing.lg,
    includeFontPadding: false,
    paddingVertical: 4,
  },
  choiceSection: {
    flex: 1,
  },
  choiceContainer: {
    backgroundColor: Colors.neutral.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    // Remove minHeight to allow natural content flow
  },
  choiceTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.normal,
    includeFontPadding: false,
  },
  optionCard: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 280, // Ensure adequate height for content
    overflow: 'visible', // Ensure content is not clipped
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    minHeight: 48, // Ensure adequate height for icon and text
    overflow: 'visible', // Ensure text is not clipped
  },
  optionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginLeft: Spacing.md,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.normal,
    textAlign: 'left',
    includeFontPadding: false, // Android specific
  },
  optionDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
    marginBottom: Spacing.lg,
    textAlign: 'left',
    includeFontPadding: false, // Android specific - removes extra padding
    paddingVertical: 4, // Increased padding to prevent clipping
    // backgroundColor: 'rgba(255,0,0,0.1)', // Temporary debug background
  },
  optionFeatures: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
    flex: 1,
    textAlign: 'left',
    includeFontPadding: false, // Android specific - removes extra padding
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    paddingVertical: 1, // Small padding to prevent clipping
  },
  optionButton: {
    marginTop: Spacing.md,
  },
  signInSection: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: Spacing.lg,
  },
  signInText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: Spacing.md,
    opacity: 0.9,
  },
  signInButton: {
    minWidth: 120,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    overflow: 'visible',
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.inverse,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    opacity: 0.8,
    marginBottom: Spacing.xs,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  footerReference: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.inverse,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: Typography.sizes.xs * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 1,
  },
});

export default WelcomeScreen;
