import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import services
import LocationService from '../../services/LocationService/LocationService';
import PrayerTimeService from '../../services/PrayerTimeService/PrayerTimeService';
import QiblaService from '../../services/QiblaService/QiblaService';

const { width, height } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width, height) * 0.7;

// Advanced compass stabilization to handle noisy magnetometer data
const stabilizeCompass = (newHeading, history, lastStableHeading, maxHistorySize = 10) => {
  // Add new heading to history
  history.push(newHeading);

  // Keep only recent readings
  if (history.length > maxHistorySize) {
    history.shift();
  }

  // Need at least 5 readings for stabilization
  if (history.length < 5) {
    return newHeading;
  }

  // Calculate moving average
  const average = history.reduce((sum, val) => sum + val, 0) / history.length;

  // Calculate variance to detect if phone is moving or just sensor noise
  const variance = history.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / history.length;
  const standardDeviation = Math.sqrt(variance);

  // If variance is low (phone is stable), use heavy smoothing
  if (standardDeviation < 3) {
    // Phone appears stable - apply strong smoothing
    const smoothingFactor = 0.1; // Very slow changes
    return lastStableHeading + (average - lastStableHeading) * smoothingFactor;
  } else if (standardDeviation < 8) {
    // Phone is moving slowly - moderate smoothing
    const smoothingFactor = 0.3;
    return lastStableHeading + (average - lastStableHeading) * smoothingFactor;
  } else {
    // Phone is moving quickly - less smoothing but still some
    const smoothingFactor = 0.7;
    return lastStableHeading + (average - lastStableHeading) * smoothingFactor;
  }
};

const QiblaScreen = () => {
  const [location, setLocation] = useState(null);
  const [qiblaDirection, setQiblaDirection] = useState(0);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [heading, setHeading] = useState(0);
  const [smoothedHeading, setSmoothedHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calibrationNeeded, setCalibrationNeeded] = useState(false);
  const [magneticDeclination, setMagneticDeclination] = useState(0);
  
  const compassRotation = new Animated.Value(0);
  const lastUpdateTime = useRef(Date.now());
  const headingHistory = useRef([]);
  const lastStableHeading = useRef(0);
  const previousMagnetometerData = useRef(null);

  useEffect(() => {
    initializeQibla();
    return () => {
      Magnetometer.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (location) {
      startMagnetometer();
    }
  }, [location]);

  // Stabilize compass to prevent spinning from sensor noise
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current > 100) { // Check every 100ms
      const stabilized = stabilizeCompass(
        heading,
        headingHistory.current,
        lastStableHeading.current
      );

      // Only update if change is significant enough
      const headingDiff = Math.abs(stabilized - smoothedHeading);
      if (headingDiff > 0.5) { // Minimum change threshold
        setSmoothedHeading(stabilized);
        lastStableHeading.current = stabilized;
      }

      lastUpdateTime.current = now;
    }
  }, [heading, smoothedHeading]);

  useEffect(() => {
    // Animate compass rotation with smoothed heading - very slow and smooth
    Animated.timing(compassRotation, {
      toValue: -smoothedHeading,
      duration: 800, // Longer duration for very smooth movement
      useNativeDriver: true,
    }).start();
  }, [smoothedHeading]);

  const initializeQibla = async () => {
    try {
      setLoading(true);
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);

      // Calculate Qibla direction using QiblaService
      const qibla = QiblaService.calculateQiblaDirection(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setQiblaDirection(qibla);

      // Calculate magnetic declination for this location
      const declination = QiblaService.estimateMagneticDeclination(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setMagneticDeclination(declination);
    } catch (error) {
      console.error('Error initializing Qibla:', error);
      Alert.alert('Error', 'Failed to get location for Qibla direction.');
    } finally {
      setLoading(false);
    }
  };

  const startMagnetometer = () => {
    Magnetometer.setUpdateInterval(300); // Even slower updates for stability

    const subscription = Magnetometer.addListener((data) => {
      // Validate the reading first
      const validation = QiblaService.validateCompassReading(data);

      // Only process valid readings
      if (validation.isValid && !validation.isInterference) {
        setMagnetometerData(data);

        // Use QiblaService to calculate heading with low-pass filtering and magnetic declination correction
        const calculatedHeading = QiblaService.calculateHeading(
          data,
          magneticDeclination,
          previousMagnetometerData.current
        );

        // Store current data for next iteration's filtering
        previousMagnetometerData.current = data;

        // Apply deadzone - only update if change is significant
        const currentHeading = heading;
        const headingChange = Math.abs(calculatedHeading - currentHeading);

        // Normalize the change to handle 0°/360° wraparound
        const normalizedChange = headingChange > 180 ? 360 - headingChange : headingChange;

        // Only update if change is greater than 2 degrees (increased threshold)
        if (normalizedChange > 2.0) {
          setHeading(calculatedHeading);
        }
      }

      // Always update calibration status
      setCalibrationNeeded(validation.needsCalibration);
    });

    return () => subscription && subscription.remove();
  };

  const getQiblaOffset = () => {
    // Use QiblaService to calculate offset consistently with smoothed heading
    return QiblaService.getQiblaOffset(smoothedHeading, qiblaDirection);
  };

  const getDirectionText = () => {
    const offset = Math.abs(getQiblaOffset());
    if (offset < 5) return 'Perfect! You are facing Qibla';
    if (offset < 15) return 'Very close to Qibla';
    if (offset < 45) return 'Close to Qibla';
    return 'Turn to face Qibla';
  };

  const getDirectionColor = () => {
    const offset = Math.abs(getQiblaOffset());
    if (offset < 5) return '#4CAF50';
    if (offset < 15) return '#8BC34A';
    if (offset < 45) return '#FF9800';
    return '#F44336';
  };

  const renderCompass = () => {
    const qiblaOffset = getQiblaOffset();

    return (
      <View style={styles.compassContainer}>
        <Animated.View
          style={[
            styles.compass,
            {
              transform: [{
                rotate: compassRotation.interpolate({
                  inputRange: [-360, 0, 360],
                  outputRange: ['-360deg', '0deg', '360deg'],
                })
              }],
            },
          ]}
        >
          {/* Compass Circle */}
          <View style={styles.compassCircle}>
            {/* Cardinal Directions */}
            <Text style={[styles.cardinalText, styles.northText]}>N</Text>
            <Text style={[styles.cardinalText, styles.eastText]}>E</Text>
            <Text style={[styles.cardinalText, styles.southText]}>S</Text>
            <Text style={[styles.cardinalText, styles.westText]}>W</Text>

            {/* Degree Markers */}
            {Array.from({ length: 36 }, (_, i) => {
              const angle = i * 10;
              const isMainDirection = angle % 90 === 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.degreeMarker,
                    isMainDirection && styles.mainDegreeMarker,
                    {
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -COMPASS_SIZE / 2 + 10 },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* Qibla Indicator */}
        <View
          style={[
            styles.qiblaIndicator,
            {
              transform: [{ rotate: `${qiblaOffset}deg` }],
            },
          ]}
        >
          <Icon name="place" size={30} color="#2E7D32" />
          <Text style={styles.qiblaText}>Qibla</Text>
        </View>

        {/* Phone Direction Indicator */}
        <View style={styles.phoneIndicator}>
          <Icon name="navigation" size={24} color="#FF5722" />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Finding Qibla direction...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Qibla Direction</Text>
        <Text style={styles.subtitle}>
          {location?.city || 'Current Location'}
        </Text>
      </View>

      {/* Calibration Warning */}
      {calibrationNeeded && (
        <View style={styles.calibrationWarning}>
          <Icon name="warning" size={20} color="#FF9800" />
          <Text style={styles.calibrationText}>
            Move your phone in a figure-8 pattern to calibrate the compass
          </Text>
        </View>
      )}

      {/* Compass */}
      <View style={styles.compassSection}>
        {renderCompass()}
      </View>

      {/* Direction Info */}
      <View style={styles.infoSection}>
        <View style={styles.directionCard}>
          <Text style={[styles.directionText, { color: getDirectionColor() }]}>
            {getDirectionText()}
          </Text>
          <Text style={styles.degreeText}>
            Qibla: {Math.round(qiblaDirection)}°
          </Text>
          <Text style={styles.degreeText}>
            Current: {Math.round(smoothedHeading)}° (Raw: {Math.round(heading)}°)
          </Text>
          <Text style={styles.offsetText}>
            Offset: {Math.round(getQiblaOffset())}°
          </Text>
          <Text style={styles.debugText}>
            Raw: x={magnetometerData.x.toFixed(2)}, y={magnetometerData.y.toFixed(2)}
          </Text>
          <Text style={styles.debugText}>
            Mag Decl: {magneticDeclination.toFixed(1)}°
          </Text>
          <Text style={styles.debugText}>
            History: {headingHistory.current.length} readings
          </Text>
        </View>
      </View>

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <Text style={styles.locationTitle}>Your Location</Text>
        <Text style={styles.locationText}>
          Latitude: {location?.latitude.toFixed(6)}
        </Text>
        <Text style={styles.locationText}>
          Longitude: {location?.longitude.toFixed(6)}
        </Text>
        <Text style={styles.locationText}>
          Distance to Kaaba: {calculateDistanceToKaaba(location)} km
        </Text>
      </View>
    </View>
  );
};

const calculateDistanceToKaaba = (location) => {
  if (!location) return 0;

  // Use QiblaService for consistent distance calculation
  const distance = QiblaService.calculateDistanceToKaaba(
    location.latitude,
    location.longitude
  );

  return Math.round(distance);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 5,
  },
  calibrationWarning: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    margin: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  calibrationText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 10,
    flex: 1,
  },
  compassSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compass: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassCircle: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardinalText: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  northText: {
    top: 10,
  },
  eastText: {
    right: 10,
  },
  southText: {
    bottom: 10,
  },
  westText: {
    left: 10,
  },
  degreeMarker: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: '#ccc',
  },
  mainDegreeMarker: {
    height: 15,
    backgroundColor: '#666',
  },
  qiblaIndicator: {
    position: 'absolute',
    alignItems: 'center',
    top: 20,
  },
  qiblaText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 2,
  },
  phoneIndicator: {
    position: 'absolute',
    alignItems: 'center',
  },
  infoSection: {
    padding: 20,
  },
  directionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  directionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  degreeText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  offsetText: {
    fontSize: 14,
    color: '#999',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 5,
  },
  locationInfo: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default QiblaScreen;
