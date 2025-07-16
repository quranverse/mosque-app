import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step3Facilities = ({ data, onUpdate }) => {
  const handleFacilityToggle = (facility, value) => {
    onUpdate({
      facilities: {
        ...data.facilities,
        [facility]: value,
      },
    });
  };

  const facilityCategories = [
    {
      title: 'Worship Facilities',
      icon: 'mosque',
      facilities: [
        {
          key: 'spaceForWomen',
          label: 'Space for women',
          description: 'Dedicated prayer area for women',
          icon: 'female',
        },
        {
          key: 'ablutionsRoom',
          label: 'Ablutions room',
          description: 'Wudu facilities available',
          icon: 'water-drop',
        },
        {
          key: 'salatAlJanaza',
          label: 'Salât al-Janaza',
          description: 'Funeral prayer services',
          icon: 'favorite',
        },
        {
          key: 'salatElEid',
          label: 'Salat El Eid',
          description: 'Eid prayer celebrations',
          icon: 'celebration',
        },
        {
          key: 'ramadanIftar',
          label: 'Ramadan iftar',
          description: 'Iftar meals during Ramadan',
          icon: 'restaurant',
        },
      ],
    },
    {
      title: 'Educational Services',
      icon: 'school',
      facilities: [
        {
          key: 'adultCourses',
          label: 'Adult courses',
          description: 'Islamic education for adults',
          icon: 'person',
        },
        {
          key: 'childrenCourses',
          label: 'Children courses',
          description: 'Islamic education for children',
          icon: 'child-care',
        },
        {
          key: 'library',
          label: 'Library',
          description: 'Islamic books and resources',
          icon: 'library-books',
        },
        {
          key: 'quranForBlind',
          label: 'Quran for blind people',
          description: 'Braille Quran and audio services',
          icon: 'visibility-off',
        },
      ],
    },
    {
      title: 'Accessibility & Parking',
      icon: 'accessible',
      facilities: [
        {
          key: 'disabledAccessibility',
          label: 'Disabled accessibility',
          description: 'Wheelchair accessible facilities',
          icon: 'accessible',
        },
        {
          key: 'parking',
          label: 'Parking',
          description: 'Car parking available',
          icon: 'local-parking',
        },
        {
          key: 'bikeParking',
          label: 'Bike parking',
          description: 'Bicycle parking facilities',
          icon: 'pedal-bike',
        },
        {
          key: 'electricCarCharging',
          label: 'Electric car charging',
          description: 'EV charging stations',
          icon: 'electric-car',
        },
      ],
    },
  ];

  const renderFacilityItem = (facility) => (
    <View key={facility.key} style={styles.facilityItem}>
      <View style={styles.facilityInfo}>
        <View style={styles.facilityHeader}>
          <Icon 
            name={facility.icon} 
            size={20} 
            color={Colors.primary.main} 
            style={styles.facilityIcon}
          />
          <Text style={styles.facilityLabel}>{facility.label}</Text>
        </View>
        <Text style={styles.facilityDescription}>{facility.description}</Text>
      </View>
      <Switch
        value={data.facilities[facility.key]}
        onValueChange={(value) => handleFacilityToggle(facility.key, value)}
        trackColor={{
          false: Colors.neutral.border,
          true: Colors.primary.light,
        }}
        thumbColor={
          data.facilities[facility.key] 
            ? Colors.primary.main 
            : Colors.neutral.surface
        }
      />
    </View>
  );

  const renderCategory = (category) => (
    <View key={category.title} style={styles.categoryContainer}>
      <View style={styles.categoryHeader}>
        <Icon 
          name={category.icon} 
          size={24} 
          color={Colors.primary.main} 
          style={styles.categoryIcon}
        />
        <Text style={styles.categoryTitle}>{category.title}</Text>
      </View>
      {category.facilities.map(renderFacilityItem)}
    </View>
  );

  const getSelectedCount = () => {
    return Object.values(data.facilities).filter(Boolean).length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Facilities & Services</Text>
        <Text style={styles.stepDescription}>
          Select available facilities ({getSelectedCount()} selected)
        </Text>
      </View>

      <View style={styles.formContainer}>
        {facilityCategories.map(renderCategory)}

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Facility Information</Text>
          <Text style={styles.infoText}>
            • All facilities are optional - select only what applies to your mosque
          </Text>
          <Text style={styles.infoText}>
            • This information helps community members know what services are available
          </Text>
          <Text style={styles.infoText}>
            • You can update these settings anytime from your mosque dashboard
          </Text>
          <Text style={styles.infoText}>
            • More facilities can be added in future updates
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
  },
  categoryContainer: {
    marginBottom: Spacing['2xl'],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.divider,
  },
  categoryIcon: {
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  facilityInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  facilityIcon: {
    marginRight: Spacing.sm,
  },
  facilityLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  facilityDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeights.normal,
  },
  infoBox: {
    backgroundColor: Colors.primary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
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
});

export default Step3Facilities;
