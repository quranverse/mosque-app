import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  ActionSheetIOS,
  Platform,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';
import IslamicInput from '../../components/Common/IslamicInput';
import AuthService from '../../services/AuthService/AuthService';
import { API_BASE_URL } from '../../config/api';

const MosqueProfileScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    // Account Info
    email: '',
    
    // Basic Information
    mosqueName: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    phone: '',
    website: '',
    
    // Facilities & Services
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
    
    // Details & History
    constructionYear: '',
    capacityWomen: '',
    capacityMen: '',
    briefHistory: '',
    otherInfo: '',
    
    // Photos
    photos: {
      exterior: null,
      interior: null,
      logo: null,
    },
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Map database fields to frontend state
        const facilitiesMap = {};
        if (user.facilities && Array.isArray(user.facilities)) {
          // Convert array of facility strings to boolean object
          const facilityReverseMap = {
            'Space for women': 'spaceForWomen',
            'Ablutions room': 'ablutionsRoom',
            'Adult courses': 'adultCourses',
            'Children courses': 'childrenCourses',
            'Disabled accessibility': 'disabledAccessibility',
            'Library': 'library',
            'Quran for blind people': 'quranForBlind',
            'Salât al-Janaza': 'salatAlJanaza',
            'Salat El Eid': 'salatElEid',
            'Ramadan iftar': 'ramadanIftar',
            'Parking': 'parking',
            'Bike parking': 'bikeParking',
            'Electric car charging': 'electricCarCharging'
          };

          user.facilities.forEach(facility => {
            const facilityKey = facilityReverseMap[facility];
            if (facilityKey) {
              facilitiesMap[facilityKey] = true;
            }
          });
        }

        // Parse address components from mosqueAddress if city/zipCode are empty
        let addressParts = {
          street: user.mosqueAddress || '',
          city: user.city || '',
          zipCode: user.zipCode || '',
          country: user.country || ''
        };

        // If city or zipCode are missing, try to parse from mosqueAddress
        if (user.mosqueAddress && (!user.city || !user.zipCode)) {
          const addressMatch = user.mosqueAddress.match(/^(.+?),\s*(.+?),?\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?\s*$/);
          if (addressMatch) {
            addressParts.street = addressMatch[1] || user.mosqueAddress;
            addressParts.city = user.city || addressMatch[2] || '';
            addressParts.zipCode = user.zipCode || addressMatch[4] || '';
          }
        }

        setProfileData({
          email: user.email || '',
          mosqueName: user.mosqueName || '',
          address: addressParts.street,
          city: addressParts.city,
          zipCode: addressParts.zipCode,
          country: addressParts.country,
          phone: user.phone || '',
          website: user.website || '',
          facilities: {
            ...profileData.facilities,
            ...facilitiesMap
          },
          constructionYear: user.constructionYear?.toString() || '',
          capacityWomen: user.capacityWomen?.toString() || '',
          capacityMen: user.capacityMen?.toString() || '',
          briefHistory: user.briefHistory || '',
          otherInfo: user.otherInfo || '',
          photos: {
            exterior: user.photos?.exterior ? { uri: `${API_BASE_URL}${user.photos.exterior}` } : null,
            interior: user.photos?.interior ? { uri: `${API_BASE_URL}${user.photos.interior}` } : null,
            logo: user.photos?.logo ? { uri: `${API_BASE_URL}${user.photos.logo}` } : null,
          },
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFacilityToggle = (facilityKey, value) => {
    setProfileData(prev => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        [facilityKey]: value,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Convert frontend data to backend format
      const facilitiesArray = Object.keys(profileData.facilities)
        .filter(key => profileData.facilities[key])
        .map(key => {
          // Convert camelCase keys back to readable facility names
          const facilityMap = {
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
            electricCarCharging: 'Electric car charging'
          };
          return facilityMap[key] || key;
        });

      const updateData = {
        mosqueName: profileData.mosqueName,
        mosqueAddress: profileData.address, // Map address back to mosqueAddress
        city: profileData.city,
        zipCode: profileData.zipCode,
        country: profileData.country,
        phone: profileData.phone,
        website: profileData.website,
        facilities: facilitiesArray,
        constructionYear: profileData.constructionYear ? parseInt(profileData.constructionYear) : undefined,
        capacityWomen: profileData.capacityWomen ? parseInt(profileData.capacityWomen) : undefined,
        capacityMen: profileData.capacityMen ? parseInt(profileData.capacityMen) : undefined,
        briefHistory: profileData.briefHistory,
        otherInfo: profileData.otherInfo
      };

      const result = await AuthService.updateProfile(updateData);
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        await loadUserProfile(); // Reload to get updated data
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleChangePassword = () => {
    navigation.navigate('PasswordChange');
  };

  // Image upload functions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload photos.'
      );
      return false;
    }
    return true;
  };

  const showImagePicker = (photoType) => {
    const options = [
      'Take Photo',
      'Choose from Library',
      'Cancel'
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera(photoType);
          } else if (buttonIndex === 1) {
            openImageLibrary(photoType);
          }
        }
      );
    } else {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add the photo',
        [
          { text: 'Take Photo', onPress: () => openCamera(photoType) },
          { text: 'Choose from Library', onPress: () => openImageLibrary(photoType) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const openCamera = async (photoType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: photoType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadPhoto(photoType, result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openImageLibrary = async (photoType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: photoType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadPhoto(photoType, result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const uploadPhoto = async (photoType, imageAsset) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(photoType, {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: `${photoType}.jpg`,
      });

      const result = await AuthService.uploadPhotos(formData);
      if (result.success) {
        Alert.alert('Success', 'Photo uploaded successfully');
        await loadUserProfile(); // Reload to get updated photos
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
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
        value={profileData.facilities[facility.key]}
        onValueChange={(value) => handleFacilityToggle(facility.key, value)}
        trackColor={{
          false: Colors.neutral.border,
          true: Colors.primary.light,
        }}
        thumbColor={
          profileData.facilities[facility.key]
            ? Colors.primary.main
            : Colors.neutral.surface
        }

      />
    </View>
  );

  const renderFacilitiesSection = () => (
    <View>
      {facilityCategories.map((category) => (
        <View key={category.title} style={styles.facilityCategory}>
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
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary.main} />
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mosque Profile</Text>
        <TouchableOpacity
          style={styles.headerSaveButton}
          onPress={handleSave}
          disabled={loading}
        >
          <Icon
            name="save"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={() => showImagePicker('logo')}
          >
            {profileData.photos?.logo ? (
              <Image
                source={{ uri: profileData.photos.logo.uri }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="account-balance" size={40} color={Colors.primary.main} />
              </View>
            )}
            <View style={styles.editImageOverlay}>
              <Icon name="camera-alt" size={20} color={Colors.text.inverse} />
            </View>
          </TouchableOpacity>
          <Text style={styles.mosqueName}>
            {profileData.mosqueName || 'Mosque Name'}
          </Text>
          <Text style={styles.mosqueEmail}>
            {profileData.email || 'No email'}
          </Text>
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <IslamicInput
            label="Email Address"
            value={profileData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="mosque@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="email"

          />

          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={handleChangePassword}

          >
            <Icon name="lock" size={20} color={Colors.primary.main} />
            <Text style={styles.changePasswordText}>Change Password</Text>
            <Icon name="chevron-right" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <IslamicInput
            label="Mosque Name"
            value={profileData.mosqueName}
            onChangeText={(value) => handleInputChange('mosqueName', value)}
            placeholder="Enter the official name of your mosque"
            leftIcon="account-balance"
          />

          <IslamicInput
            label="Street Address"
            value={profileData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            placeholder="123 Main Street"
            leftIcon="location-on"
          />

          <IslamicInput
            label="City"
            value={profileData.city}
            onChangeText={(value) => handleInputChange('city', value)}
            placeholder="Enter city name"
            leftIcon="location-city"
          />

          <IslamicInput
            label="Zip Code / Postal Code"
            value={profileData.zipCode}
            onChangeText={(value) => handleInputChange('zipCode', value)}
            placeholder="12345"
            keyboardType="numeric"
            leftIcon="markunread-mailbox"
          />

          <IslamicInput
            label="Country"
            value={profileData.country}
            onChangeText={(value) => handleInputChange('country', value)}
            placeholder="Select your country"
            leftIcon="public"
          />

          <IslamicInput
            label="Phone Number"
            value={profileData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="5551234567"
            keyboardType="phone-pad"
            leftIcon="phone"
          />

          <IslamicInput
            label="Website (Optional)"
            value={profileData.website}
            onChangeText={(value) => handleInputChange('website', value)}
            placeholder="https://www.mosque.com"
            keyboardType="url"
            autoCapitalize="none"
            leftIcon="language"
          />
        </View>

        {/* Details & History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details & History</Text>

          <IslamicInput
            label="Construction Year"
            value={profileData.constructionYear}
            onChangeText={(value) => handleInputChange('constructionYear', value)}
            placeholder="e.g., 2010"
            keyboardType="numeric"
            leftIcon="calendar-today"
          />

          <IslamicInput
            label="Capacity for Women"
            value={profileData.capacityWomen}
            onChangeText={(value) => handleInputChange('capacityWomen', value)}
            placeholder="e.g., 100"
            keyboardType="numeric"
            leftIcon="female"
          />

          <IslamicInput
            label="Capacity for Men"
            value={profileData.capacityMen}
            onChangeText={(value) => handleInputChange('capacityMen', value)}
            placeholder="e.g., 200"
            keyboardType="numeric"
            leftIcon="male"
          />

          <IslamicInput
            label="Brief History (Optional)"
            value={profileData.briefHistory}
            onChangeText={(value) => handleInputChange('briefHistory', value)}
            placeholder="Short summary of the mosque's history..."
            multiline
            numberOfLines={4}
            maxLength={200}
            leftIcon="history"
          />

          <IslamicInput
            label="Other Information (Optional)"
            value={profileData.otherInfo}
            onChangeText={(value) => handleInputChange('otherInfo', value)}
            placeholder="Any additional information about your mosque..."
            multiline
            numberOfLines={3}
            maxLength={300}
            leftIcon="info"
          />
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mosque Photos</Text>

          <View style={styles.photosContainer}>
            {/* Exterior Photo */}
            <View style={styles.photoItem}>
              <Text style={styles.photoLabel}>Exterior Photo</Text>
              <TouchableOpacity
                style={styles.photoUpload}
                onPress={() => showImagePicker('exterior')}
              >
                {profileData.photos?.exterior ? (
                  <Image
                    source={{ uri: profileData.photos.exterior.uri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon name="add-a-photo" size={30} color={Colors.text.secondary} />
                    <Text style={styles.photoPlaceholderText}>Add Exterior Photo</Text>
                  </View>
                )}
                <View style={styles.photoEditOverlay}>
                  <Icon name="edit" size={16} color={Colors.text.inverse} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Interior Photo */}
            <View style={styles.photoItem}>
              <Text style={styles.photoLabel}>Interior Photo</Text>
              <TouchableOpacity
                style={styles.photoUpload}
                onPress={() => showImagePicker('interior')}
              >
                {profileData.photos?.interior ? (
                  <Image
                    source={{ uri: profileData.photos.interior.uri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon name="add-a-photo" size={30} color={Colors.text.secondary} />
                    <Text style={styles.photoPlaceholderText}>Add Interior Photo</Text>
                  </View>
                )}
                <View style={styles.photoEditOverlay}>
                  <Icon name="edit" size={16} color={Colors.text.inverse} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Facilities & Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities & Services</Text>

          {renderFacilitiesSection()}
        </View>
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    backgroundColor: Colors.primary.main,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0, // Safe area for status bar
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56, // Standard header height
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: Platform.OS === 'ios' ? Spacing.xs : 0, // Extra margin for iOS notch
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  headerSaveButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: Colors.neutral.surface,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  profileImageContainer: {
    marginBottom: Spacing.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary.main,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mosqueName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  mosqueEmail: {
    fontSize: Typography.sizes.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.neutral.surface,
    margin: Spacing.lg,
    marginTop: 0,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.background,
    marginTop: Spacing.md,
  },
  changePasswordText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },

  facilityCategory: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  categoryIcon: {
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.neutral.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  facilityInfo: {
    flex: 1,
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
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
  },
  facilityDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: 32, // Align with label text
  },
  photosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  photoItem: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  photoLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  photoUpload: {
    height: 120,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  photoPlaceholderText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  photoEditOverlay: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.primary.main,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MosqueProfileScreen;
