import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressIndicator from '../../components/Common/ProgressIndicator';
import IslamicButton from '../../components/Common/IslamicButton';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';
import AuthService from '../../services/AuthService/AuthService';

// Import step components
import Step1AccountSetup from './steps/Step1AccountSetup';
import Step2BasicInfo from './steps/Step2BasicInfo';
import Step3Facilities from './steps/Step3Facilities';
import Step4Details from './steps/Step4Details';
import Step5Photos from './steps/Step5Photos';
import Step6Completion from './steps/Step6Completion';

const TOTAL_STEPS = 6;

const MosqueRegistrationScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    // Step 1: Account Setup
    email: '',
    password: '',
    confirmPassword: '',
    language: 'en',
    
    // Step 2: Basic Information
    mosqueName: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    website: '',
    
    // Step 3: Facilities & Services
    facilities: {
      spaceForWomen: false,
      ablutionsRoom: false,
      adultCourses: false,
      childrenCourses: false,
      disabledAccessibility: false,
      library: false,
      quranForBlind: false,
      salatAlJanaza: false,
      salatElEid: false,
      ramadanIftar: false,
      parking: false,
      bikeParking: false,
      electricCarCharging: false,
    },
    
    // Step 4: Details & History
    constructionYear: '',
    capacityWomen: '',
    capacityMen: '',
    briefHistory: '',
    otherInfo: '',
    
    // Step 5: Photos
    photos: {
      exterior: null,
      interior: null,
      logo: null,
    },
  });

  const scrollViewRef = useRef(null);

  const updateRegistrationData = (stepData) => {
    setRegistrationData(prev => ({
      ...prev,
      ...stepData,
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return true; // Facilities are optional
      case 4:
        return validateStep4();
      case 5:
        return validateStep5();
      case 6:
        return true;
      default:
        return false;
    }
  };

  const validateStep1 = () => {
    const { email, password, confirmPassword } = registrationData;
    
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    
    if (!AuthService.isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!AuthService.isValidPassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    const { mosqueName, address, city, zipCode, country } = registrationData;
    
    if (!mosqueName || !address || !city || !zipCode || !country) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    
    return true;
  };

  const validateStep4 = () => {
    const { constructionYear, capacityWomen, capacityMen } = registrationData;
    
    if (!constructionYear || !capacityWomen || !capacityMen) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    
    const year = parseInt(constructionYear);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(year) || year < 1000 || year > currentYear) {
      Alert.alert('Error', 'Please enter a valid construction year');
      return false;
    }
    
    if (isNaN(parseInt(capacityWomen)) || isNaN(parseInt(capacityMen))) {
      Alert.alert('Error', 'Please enter valid capacity numbers');
      return false;
    }
    
    return true;
  };

  const validateStep5 = () => {
    const { exterior, interior } = registrationData.photos;
    
    if (!exterior || !interior) {
      Alert.alert('Error', 'Please upload both exterior and interior photos');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await AuthService.registerMosque(registrationData);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your mosque has been registered successfully. Please check your email for verification.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('Main'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentStep = () => {
    const stepProps = {
      data: registrationData,
      onUpdate: updateRegistrationData,
    };

    switch (currentStep) {
      case 1:
        return <Step1AccountSetup {...stepProps} />;
      case 2:
        return <Step2BasicInfo {...stepProps} />;
      case 3:
        return <Step3Facilities {...stepProps} />;
      case 4:
        return <Step4Details {...stepProps} />;
      case 5:
        return <Step5Photos {...stepProps} />;
      case 6:
        return <Step6Completion {...stepProps} />;
      default:
        return null;
    }
  };

  const getActionButtons = () => {
    const isLastStep = currentStep === TOTAL_STEPS;
    
    return (
      <View style={styles.actionButtons}>
        {currentStep > 1 && (
          <IslamicButton
            title="Previous"
            onPress={handlePrevious}
            variant="outline"
            size="lg"
            icon="arrow-back"
            style={styles.previousButton}
          />
        )}
        
        <IslamicButton
          title={isLastStep ? 'Complete Registration' : 'Next'}
          onPress={isLastStep ? handleSubmit : handleNext}
          variant="primary"
          size="lg"
          icon={isLastStep ? 'check' : 'arrow-forward'}
          iconPosition="right"
          loading={loading}
          gradient
          style={styles.nextButton}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Mosque Account</Text>
        </View>

        {/* Compact Progress Indicator */}
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          style={styles.progressIndicator}
          compact={true}
        />

        {/* Step Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={100}
          enableAutomaticScroll={true}
        >
          <View style={styles.stepContainer}>
            {renderCurrentStep()}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {getActionButtons()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },
  progressIndicator: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
    flexGrow: 1,
  },
  stepContainer: {
    padding: Spacing.lg,
    flex: 1, // Take available space
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.neutral.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  previousButton: {
    flex: 1,
    marginRight: Spacing.md,
  },
  nextButton: {
    flex: 2,
  },
});

export default MosqueRegistrationScreen;
