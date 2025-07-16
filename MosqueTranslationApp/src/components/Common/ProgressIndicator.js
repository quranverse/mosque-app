import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';

const ProgressIndicator = ({
  currentStep = 1,
  totalSteps = 6,
  steps = [],
  style = {},
  compact = false,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  const defaultSteps = [
    'Account',
    'Info',
    'Facilities',
    'Details',
    'Photos',
    'Complete',
  ];

  const stepLabels = steps.length > 0 ? steps : defaultSteps;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        {/* Compact Progress Bar */}
        <View style={styles.compactProgressBar}>
          <View
            style={[
              styles.compactProgressFill,
              { width: `${progress}%` }
            ]}
          />
        </View>

        {/* Compact Step Info */}
        <View style={styles.compactStepInfo}>
          <Text style={styles.compactStepText}>
            Step {currentStep} of {totalSteps}
          </Text>
          <Text style={styles.compactStepTitle}>
            {stepLabels[currentStep - 1]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>

      {/* Step Indicators */}
      <View style={styles.stepsContainer}>
        {stepLabels.slice(0, totalSteps).map((stepLabel, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <View key={stepNumber} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isCompleted && styles.stepCircleCompleted,
                isCurrent && styles.stepCircleCurrent,
                isUpcoming && styles.stepCircleUpcoming,
              ]}>
                <Text style={[
                  styles.stepNumber,
                  isCompleted && styles.stepNumberCompleted,
                  isCurrent && styles.stepNumberCurrent,
                  isUpcoming && styles.stepNumberUpcoming,
                ]}>
                  {isCompleted ? '✓' : stepNumber}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelCompleted,
                isCurrent && styles.stepLabelCurrent,
                isUpcoming && styles.stepLabelUpcoming,
              ]}>
                {stepLabel}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Current Step Title */}
      <View style={styles.currentStepContainer}>
        <Text style={styles.currentStepTitle}>
          {stepLabels[currentStep - 1]}
        </Text>
        <Text style={styles.currentStepDescription}>
          {getStepDescription(currentStep)}
        </Text>
      </View>
    </View>
  );
};

const getStepDescription = (step) => {
  const descriptions = {
    1: 'Create your account with email and password',
    2: 'Enter mosque name and location details',
    3: 'Select available facilities and services',
    4: 'Add mosque history and capacity information',
    5: 'Upload photos of your mosque',
    6: 'Review and complete registration',
  };
  
  return descriptions[step] || '';
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  compactContainer: {
    backgroundColor: Colors.neutral.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.neutral.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
  },
  compactStepInfo: {
    alignItems: 'flex-end',
  },
  compactStepText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
  },
  compactStepTitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.main,
    fontWeight: Typography.weights.semibold,
    marginTop: 2,
  },
  progressBarContainer: {
    marginBottom: Spacing.lg,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.neutral.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 2,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  stepCircleCurrent: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },
  stepCircleUpcoming: {
    backgroundColor: Colors.neutral.surface,
    borderColor: Colors.neutral.border,
  },
  stepNumber: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  stepNumberCompleted: {
    color: Colors.text.inverse,
  },
  stepNumberCurrent: {
    color: Colors.text.inverse,
  },
  stepNumberUpcoming: {
    color: Colors.text.secondary,
  },
  stepLabel: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },
  stepLabelCompleted: {
    color: Colors.primary.main,
  },
  stepLabelCurrent: {
    color: Colors.primary.main,
  },
  stepLabelUpcoming: {
    color: Colors.text.secondary,
  },
  currentStepContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.divider,
  },
  currentStepTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  currentStepDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed,
  },
});

export default ProgressIndicator;
