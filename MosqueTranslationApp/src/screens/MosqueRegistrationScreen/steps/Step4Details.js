import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IslamicInput from '../../../components/Common/IslamicInput';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step4Details = ({ data, onUpdate }) => {
  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const getCurrentYear = () => new Date().getFullYear();

  const validateYear = (year) => {
    const numYear = parseInt(year);
    return !isNaN(numYear) && numYear >= 1000 && numYear <= getCurrentYear();
  };

  const validateCapacity = (capacity) => {
    const numCapacity = parseInt(capacity);
    return !isNaN(numCapacity) && numCapacity > 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Details & History</Text>
        <Text style={styles.stepDescription}>
          Mosque capacity and history information
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Construction Year */}
        <IslamicInput
          label="Construction Year"
          value={data.constructionYear}
          onChangeText={(value) => handleInputChange('constructionYear', value)}
          placeholder={`e.g., ${getCurrentYear() - 10}`}
          keyboardType="numeric"
          leftIcon="calendar-today"
          required
          error={
            data.constructionYear && !validateYear(data.constructionYear)
              ? 'Please enter a valid year (1000-' + getCurrentYear() + ')'
              : null
          }
        />

        {/* Capacity Section */}
        <View style={styles.capacitySection}>
          <Text style={styles.sectionTitle}>Prayer Capacity</Text>
          <Text style={styles.sectionDescription}>
            Maximum number of worshippers during prayer times
          </Text>

          <View style={styles.capacityRow}>
            <View style={styles.capacityItem}>
              <IslamicInput
                label="Capacity (Women)"
                value={data.capacityWomen}
                onChangeText={(value) => handleInputChange('capacityWomen', value)}
                placeholder="e.g., 100"
                keyboardType="numeric"
                leftIcon="female"
                required
                error={
                  data.capacityWomen && !validateCapacity(data.capacityWomen)
                    ? 'Enter a valid number'
                    : null
                }
              />
            </View>

            <View style={styles.capacityItem}>
              <IslamicInput
                label="Capacity (Men)"
                value={data.capacityMen}
                onChangeText={(value) => handleInputChange('capacityMen', value)}
                placeholder="e.g., 200"
                keyboardType="numeric"
                leftIcon="male"
                required
                error={
                  data.capacityMen && !validateCapacity(data.capacityMen)
                    ? 'Enter a valid number'
                    : null
                }
              />
            </View>
          </View>
        </View>

        {/* Brief History */}
        <IslamicInput
          label="Brief History (Optional)"
          value={data.briefHistory}
          onChangeText={(value) => handleInputChange('briefHistory', value)}
          placeholder="Short summary of the mosque's history..."
          multiline
          numberOfLines={4}
          maxLength={200}
          leftIcon="history"
        />

        {/* Other Information */}
        <IslamicInput
          label="Other Information (Optional)"
          value={data.otherInfo}
          onChangeText={(value) => handleInputChange('otherInfo', value)}
          placeholder="Any additional information about your mosque..."
          multiline
          numberOfLines={3}
          maxLength={300}
          leftIcon="info"
        />

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Capacity Guidelines</Text>
          <Text style={styles.infoText}>
            • Enter the maximum capacity during regular prayer times
          </Text>
          <Text style={styles.infoText}>
            • This helps community members plan their visit
          </Text>
          <Text style={styles.infoText}>
            • Separate capacities help families plan accordingly
          </Text>
          <Text style={styles.infoText}>
            • You can update these numbers anytime
          </Text>
        </View>

        {/* History Guidelines */}
        <View style={styles.historyBox}>
          <Text style={styles.historyTitle}>📚 History & Information</Text>
          <Text style={styles.historyText}>
            Share your mosque's story! This could include when it was founded, significant events, architectural features, or community milestones. This information helps visitors connect with your mosque's heritage.
          </Text>
        </View>

        {/* Total Capacity Display */}
        {data.capacityWomen && data.capacityMen && (
          <View style={styles.totalCapacity}>
            <Text style={styles.totalCapacityLabel}>Total Capacity</Text>
            <Text style={styles.totalCapacityNumber}>
              {parseInt(data.capacityWomen || 0) + parseInt(data.capacityMen || 0)} worshippers
            </Text>
          </View>
        )}
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
  },
  capacitySection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeights.normal,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capacityItem: {
    flex: 1,
    marginHorizontal: Spacing.xs,
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
  },
  historyBox: {
    backgroundColor: Colors.secondary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
  },
  historyTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.sm,
  },
  historyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.relaxed,
  },
  totalCapacity: {
    backgroundColor: Colors.status.success + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.status.success,
  },
  totalCapacityLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  totalCapacityNumber: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.status.success,
  },
});

export default Step4Details;
