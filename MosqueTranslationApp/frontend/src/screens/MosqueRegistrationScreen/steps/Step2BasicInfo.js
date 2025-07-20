import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import IslamicInput from '../../../components/Common/IslamicInput';
import IslamicDropdown from '../../../components/Common/IslamicDropdown';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step2BasicInfo = ({ data, onUpdate }) => {
  const countryOptions = [
    { label: 'United States', value: 'US' },
    { label: 'Canada', value: 'CA' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'France', value: 'FR' },
    { label: 'Germany', value: 'DE' },
    { label: 'Saudi Arabia', value: 'SA' },
    { label: 'United Arab Emirates', value: 'AE' },
    { label: 'Turkey', value: 'TR' },
    { label: 'Egypt', value: 'EG' },
    { label: 'Pakistan', value: 'PK' },
    { label: 'India', value: 'IN' },
    { label: 'Indonesia', value: 'ID' },
    { label: 'Malaysia', value: 'MY' },
    { label: 'Morocco', value: 'MA' },
    { label: 'Algeria', value: 'DZ' },
    { label: 'Tunisia', value: 'TN' },
    { label: 'Jordan', value: 'JO' },
    { label: 'Lebanon', value: 'LB' },
    { label: 'Syria', value: 'SY' },
    { label: 'Iraq', value: 'IQ' },
    { label: 'Iran', value: 'IR' },
    { label: 'Afghanistan', value: 'AF' },
    { label: 'Bangladesh', value: 'BD' },
    { label: 'Nigeria', value: 'NG' },
    { label: 'South Africa', value: 'ZA' },
    { label: 'Australia', value: 'AU' },
    { label: 'Other', value: 'OTHER' },
  ];

  const handleInputChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleCountryChange = (selectedCountry) => {
    onUpdate({ country: selectedCountry.value });
  };

  const getSelectedCountry = () => {
    return countryOptions.find(country => country.value === data.country) || null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepDescription}>
          Mosque location and contact details
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Mosque Name */}
        <IslamicInput
          label="Mosque Name"
          value={data.mosqueName}
          onChangeText={(value) => handleInputChange('mosqueName', value)}
          placeholder="Enter the official name of your mosque"
          leftIcon="account-balance"
          required
        />

        {/* Address */}
        <IslamicInput
          label="Street Address"
          value={data.address}
          onChangeText={(value) => handleInputChange('address', value)}
          placeholder="123 Main Street"
          leftIcon="location-on"
          required
        />

        {/* City */}
        <IslamicInput
          label="City"
          value={data.city}
          onChangeText={(value) => handleInputChange('city', value)}
          placeholder="Enter city name"
          leftIcon="location-city"
          required
        />

        {/* Zip Code */}
        <IslamicInput
          label="Zip Code / Postal Code"
          value={data.zipCode}
          onChangeText={(value) => handleInputChange('zipCode', value)}
          placeholder="12345"
          keyboardType="numeric"
          leftIcon="markunread-mailbox"
          required
        />

        {/* Country */}
        <IslamicDropdown
          label="Country"
          value={getSelectedCountry()}
          onSelect={handleCountryChange}
          options={countryOptions}
          placeholder="Select your country"
          searchable
          required
        />

        {/* Phone Number */}
        <IslamicInput
          label="Phone Number"
          value={data.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          placeholder="5551234567"
          keyboardType="phone-pad"
          leftIcon="phone"
          required
        />

        {/* Website (Optional) */}
        <IslamicInput
          label="Website (Optional)"
          value={data.website}
          onChangeText={(value) => handleInputChange('website', value)}
          placeholder="https://www.yourmosque.com"
          keyboardType="url"
          autoCapitalize="none"
          leftIcon="language"
        />

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Location Information</Text>
          <Text style={styles.infoText}>
            • This address will be used to help community members find your mosque
          </Text>
          <Text style={styles.infoText}>
            • Make sure the address is accurate for GPS navigation
          </Text>
          <Text style={styles.infoText}>
            • Website is optional but helps provide more information to visitors
          </Text>
          <Text style={styles.infoText}>
            • All information can be updated later from your mosque dashboard
          </Text>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyTitle}>🌍 Visibility Notice</Text>
          <Text style={styles.privacyText}>
            This information will be visible to app users searching for nearby mosques. This helps the community discover and connect with your mosque.
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
  formContainer: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: Colors.primary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
    overflow: 'visible',
  },
  infoTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.md,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xs,
    includeFontPadding: false,
    paddingVertical: 1,
  },
  privacyNotice: {
    backgroundColor: Colors.secondary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
    overflow: 'visible',
  },
  privacyTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  privacyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 2,
  },
});

export default Step2BasicInfo;
