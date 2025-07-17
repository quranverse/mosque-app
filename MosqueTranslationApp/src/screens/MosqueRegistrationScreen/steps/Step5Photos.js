import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActionSheetIOS,
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicButton from '../../../components/Common/IslamicButton';
import { Colors, Typography, Spacing, BorderRadius } from '../../../utils/theme';

const Step5Photos = ({ data, onUpdate }) => {
  const [uploading, setUploading] = useState(false);

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

    setUploading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        updatePhoto(photoType, result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const openImageLibrary = async (photoType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: photoType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        updatePhoto(photoType, result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select photo');
    } finally {
      setUploading(false);
    }
  };

  const updatePhoto = (photoType, imageAsset) => {
    onUpdate({
      photos: {
        ...data.photos,
        [photoType]: imageAsset,
      },
    });
  };

  const removePhoto = (photoType) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => updatePhoto(photoType, null),
        },
      ]
    );
  };

  const renderPhotoUpload = (photoType, title, description, required = false) => {
    const photo = data.photos[photoType];
    const isSquare = photoType === 'logo';

    return (
      <View style={styles.photoContainer}>
        <View style={styles.photoHeader}>
          <Text style={styles.photoTitle}>
            {title}{required && ' *'}
          </Text>
          <Text style={styles.photoDescription}>{description}</Text>
        </View>

        <View style={[styles.photoUploadArea, isSquare && styles.squareUpload]}>
          {photo ? (
            <View style={styles.photoPreview}>
              <Image 
                source={{ uri: photo.uri }} 
                style={[styles.previewImage, isSquare && styles.squareImage]}
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removePhoto(photoType)}
              >
                <Icon name="close" size={20} color={Colors.text.inverse} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => showImagePicker(photoType)}
              disabled={uploading}
            >
              <Icon 
                name="add-a-photo" 
                size={40} 
                color={Colors.text.secondary} 
              />
              <Text style={styles.uploadText}>
                {uploading ? 'Uploading...' : 'Add Photo'}
              </Text>
              <Text style={styles.uploadHint}>
                Tap to {uploading ? 'upload' : 'select photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {photo && (
          <IslamicButton
            title="Change Photo"
            onPress={() => showImagePicker(photoType)}
            variant="outline"
            size="sm"
            icon="edit"
            style={styles.changeButton}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Photos</Text>
        <Text style={styles.stepDescription}>
          Upload mosque photos
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Exterior Photo */}
        {renderPhotoUpload(
          'exterior',
          'Exterior Photo',
          'Good quality landscape format (800x450 px minimum). No faces or license plates should appear.',
          true
        )}

        {/* Interior Photo */}
        {renderPhotoUpload(
          'interior',
          'Interior Photo',
          'Good quality landscape format (800x450 px minimum). No faces should appear.',
          true
        )}

        {/* Logo */}
        {renderPhotoUpload(
          'logo',
          'Mosque/Association Logo',
          'Good quality square format (500x500 px maximum). Ideally in .png with transparent background.',
          false
        )}

        {/* Guidelines */}
        <View style={styles.guidelinesBox}>
          <Text style={styles.guidelinesTitle}>📸 Photo Guidelines</Text>
          <Text style={styles.guidelinesText}>
            • Use high-quality, well-lit photos
          </Text>
          <Text style={styles.guidelinesText}>
            • Landscape photos should showcase mosque architecture
          </Text>
          <Text style={styles.guidelinesText}>
            • No people's faces should be visible in any photos
          </Text>
          <Text style={styles.guidelinesText}>
            • No license plates or personal information visible
          </Text>
          <Text style={styles.guidelinesText}>
            • Photos will be reviewed before approval
          </Text>
        </View>

        {/* Upload Progress */}
        <View style={styles.progressBox}>
          <Text style={styles.progressTitle}>Upload Progress</Text>
          <View style={styles.progressItems}>
            <View style={styles.progressItem}>
              <Icon 
                name={data.photos.exterior ? 'check-circle' : 'radio-button-unchecked'} 
                size={20} 
                color={data.photos.exterior ? Colors.status.success : Colors.text.secondary}
              />
              <Text style={styles.progressText}>Exterior Photo</Text>
            </View>
            <View style={styles.progressItem}>
              <Icon 
                name={data.photos.interior ? 'check-circle' : 'radio-button-unchecked'} 
                size={20} 
                color={data.photos.interior ? Colors.status.success : Colors.text.secondary}
              />
              <Text style={styles.progressText}>Interior Photo</Text>
            </View>
            <View style={styles.progressItem}>
              <Icon 
                name={data.photos.logo ? 'check-circle' : 'radio-button-unchecked'} 
                size={20} 
                color={data.photos.logo ? Colors.status.success : Colors.text.secondary}
              />
              <Text style={styles.progressText}>Logo (Optional)</Text>
            </View>
          </View>
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
  photoContainer: {
    marginBottom: Spacing['2xl'],
  },
  photoHeader: {
    marginBottom: Spacing.md,
  },
  photoTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  photoDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  photoUploadArea: {
    height: 200,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  squareUpload: {
    height: 150,
    aspectRatio: 1,
  },
  photoPreview: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  squareImage: {
    aspectRatio: 1,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.status.error,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  uploadButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  uploadText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  uploadHint: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.hint,
    marginTop: Spacing.xs,
  },
  changeButton: {
    marginTop: Spacing.md,
  },
  guidelinesBox: {
    backgroundColor: Colors.secondary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary.main,
    overflow: 'visible',
  },
  guidelinesTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary.main,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  guidelinesText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xs,
    includeFontPadding: false,
    paddingVertical: 1,
  },
  progressBox: {
    backgroundColor: Colors.primary.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
    overflow: 'visible',
  },
  progressTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary.main,
    marginBottom: Spacing.md,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    includeFontPadding: false,
    paddingVertical: 2,
  },
  progressItems: {
    gap: Spacing.sm,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },
});

export default Step5Photos;
