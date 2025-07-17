import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step6Completion = ({ data }) => {
  const renderSummarySection = (title, icon, children) => (
    <View style={styles.summarySection}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={24} color={Colors.primary.main} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderSummaryItem = (label, value) => (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}:</Text>
      <Text style={styles.summaryValue}>{value || 'Not provided'}</Text>
    </View>
  );

  const getSelectedFacilities = () => {
    const facilities = data.facilities || {};
    const facilityLabels = {
      spaceForWomen: 'Space for women',
      ablutionsRoom: 'Ablutions room',
      adultCourses: 'Adult courses',
      childrenCourses: 'Children courses',
      disabledAccessibility: 'Disabled accessibility',
      library: 'Library',
      quranForBlind: 'Quran for blind people',
      salatAlJanaza: 'Salât al-Janaza',
      salatElEid: 'Salat El Eid',
      ramadanIftar: 'Ramadan iftar',
      parking: 'Parking',
      bikeParking: 'Bike parking',
      electricCarCharging: 'Electric car charging',
    };

    return Object.entries(facilities)
      .filter(([key, value]) => value)
      .map(([key]) => facilityLabels[key])
      .join(', ') || 'None selected';
  };

  const getUploadedPhotos = () => {
    const photos = data.photos || {};
    const photoTypes = [];
    
    if (photos.exterior) photoTypes.push('Exterior');
    if (photos.interior) photoTypes.push('Interior');
    if (photos.logo) photoTypes.push('Logo');
    
    return photoTypes.length > 0 ? photoTypes.join(', ') : 'None uploaded';
  };

  const getTotalCapacity = () => {
    const women = parseInt(data.capacityWomen || 0);
    const men = parseInt(data.capacityMen || 0);
    return women + men;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <View style={styles.successIcon}>
          <Icon name="check-circle" size={40} color={Colors.status.success} />
        </View>
        <Text style={styles.stepTitle}>Review & Complete</Text>
        <Text style={styles.stepDescription}>
          Review your information
        </Text>
      </View>

      <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
        {/* Account Information */}
        {renderSummarySection('Account Information', 'account-circle', (
          <>
            {renderSummaryItem('Email', data.email)}
            {renderSummaryItem('Language', data.language?.toUpperCase())}
          </>
        ))}

        {/* Mosque Information */}
        {renderSummarySection('Mosque Information', 'account-balance', (
          <>
            {renderSummaryItem('Mosque Name', data.mosqueName)}
            {renderSummaryItem('Address', data.address)}
            {renderSummaryItem('City', data.city)}
            {renderSummaryItem('Zip Code', data.zipCode)}
            {renderSummaryItem('Country', data.country)}
            {renderSummaryItem('Website', data.website)}
          </>
        ))}

        {/* Facilities & Services */}
        {renderSummarySection('Facilities & Services', 'build', (
          <View style={styles.facilitiesContainer}>
            <Text style={styles.facilitiesText}>{getSelectedFacilities()}</Text>
          </View>
        ))}

        {/* Mosque Details */}
        {renderSummarySection('Mosque Details', 'info', (
          <>
            {renderSummaryItem('Construction Year', data.constructionYear)}
            {renderSummaryItem('Women Capacity', data.capacityWomen)}
            {renderSummaryItem('Men Capacity', data.capacityMen)}
            {renderSummaryItem('Total Capacity', getTotalCapacity().toString())}
            {data.briefHistory && renderSummaryItem('Brief History', data.briefHistory)}
            {data.otherInfo && renderSummaryItem('Other Information', data.otherInfo)}
          </>
        ))}

        {/* Photos */}
        {renderSummarySection('Photos', 'photo-camera', (
          <View style={styles.photosContainer}>
            <Text style={styles.photosText}>{getUploadedPhotos()}</Text>
          </View>
        ))}

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            By completing this registration, you agree to:
          </Text>
          <Text style={styles.termsBullet}>
            • Provide accurate and truthful information about your mosque
          </Text>
          <Text style={styles.termsBullet}>
            • Maintain appropriate content and conduct on the platform
          </Text>
          <Text style={styles.termsBullet}>
            • Respect the privacy and rights of all users
          </Text>
          <Text style={styles.termsBullet}>
            • Comply with local laws and Islamic principles
          </Text>
          <Text style={styles.termsBullet}>
            • Allow verification of your mosque information if requested
          </Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          <View style={styles.nextStepItem}>
            <Icon name="email" size={20} color={Colors.primary.main} />
            <Text style={styles.nextStepText}>
              You'll receive a verification email to confirm your account
            </Text>
          </View>
          <View style={styles.nextStepItem}>
            <Icon name="verified" size={20} color={Colors.primary.main} />
            <Text style={styles.nextStepText}>
              Our team will review your mosque information
            </Text>
          </View>
          <View style={styles.nextStepItem}>
            <Icon name="dashboard" size={20} color={Colors.primary.main} />
            <Text style={styles.nextStepText}>
              You'll gain access to your mosque dashboard
            </Text>
          </View>
          <View style={styles.nextStepItem}>
            <Icon name="people" size={20} color={Colors.primary.main} />
            <Text style={styles.nextStepText}>
              Community members can discover and follow your mosque
            </Text>
          </View>
        </View>

        {/* Islamic Blessing */}
        <View style={styles.blessingSection}>
          <Text style={styles.blessingText}>
            "And whoever builds a mosque for Allah, Allah will build for him a house in Paradise"
          </Text>
          <Text style={styles.blessingReference}>
            - Sahih al-Bukhari
          </Text>
        </View>
      </ScrollView>
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
  successIcon: {
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  stepDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  summaryContainer: {
    flex: 1,
  },
  summarySection: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.divider,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary.main,
    marginLeft: Spacing.sm,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  sectionContent: {
    padding: Spacing.lg,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weights.medium,
    width: 120,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 1,
  },
  summaryValue: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 1,
  },
  facilitiesContainer: {
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  facilitiesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  photosContainer: {
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  photosText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  termsSection: {
    backgroundColor: Colors.secondary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
    overflow: 'visible',
  },
  termsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.md,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  termsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  termsBullet: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 1,
  },
  nextStepsSection: {
    backgroundColor: Colors.primary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
    overflow: 'visible',
  },
  nextStepsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.lg,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  nextStepText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  blessingSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.status.success + '10',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  blessingText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
    marginBottom: Spacing.sm,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  blessingReference: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
});

export default Step6Completion;
