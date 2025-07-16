import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width, height) * 0.6;

const CompassView = ({ 
  heading = 0, 
  qiblaDirection = 0, 
  accuracy = null,
  style = {},
}) => {
  const compassRotation = useRef(new Animated.Value(0)).current;
  const qiblaRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate compass rotation with longer duration to prevent spinning
    Animated.timing(compassRotation, {
      toValue: -heading,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [heading]);

  useEffect(() => {
    // Calculate Qibla indicator position with longer duration
    const qiblaOffset = qiblaDirection - heading;
    Animated.timing(qiblaRotation, {
      toValue: qiblaOffset,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [heading, qiblaDirection]);

  const renderDegreeMarkers = () => {
    const markers = [];
    for (let i = 0; i < 36; i++) {
      const angle = i * 10;
      const isMainDirection = angle % 90 === 0;
      const isCardinal = angle % 90 === 0;
      
      markers.push(
        <View
          key={i}
          style={[
            styles.degreeMarker,
            isMainDirection && styles.mainDegreeMarker,
            {
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -COMPASS_SIZE / 2 + 15 },
              ],
            },
          ]}
        />
      );
    }
    return markers;
  };

  const renderCardinalDirections = () => {
    const directions = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: 90 },
      { label: 'S', angle: 180 },
      { label: 'W', angle: 270 },
    ];

    return directions.map((direction) => (
      <Text
        key={direction.label}
        style={[
          styles.cardinalText,
          {
            transform: [
              { rotate: `${direction.angle}deg` },
              { translateY: -COMPASS_SIZE / 2 + 35 },
            ],
          },
        ]}
      >
        {direction.label}
      </Text>
    ));
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.compassContainer}>
        {/* Compass Background */}
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
          <View style={styles.compassCircle}>
            {renderDegreeMarkers()}
            {renderCardinalDirections()}
          </View>
        </Animated.View>

        {/* Qibla Indicator */}
        <Animated.View
          style={[
            styles.qiblaIndicator,
            {
              transform: [{
                rotate: qiblaRotation.interpolate({
                  inputRange: [-360, 0, 360],
                  outputRange: ['-360deg', '0deg', '360deg'],
                })
              }],
            },
          ]}
        >
          <View style={styles.qiblaArrow}>
            <Icon name="place" size={30} color="#2E7D32" />
            <Text style={styles.qiblaText}>Qibla</Text>
          </View>
        </Animated.View>

        {/* Phone Direction Indicator */}
        <View style={styles.phoneIndicator}>
          <Icon name="navigation" size={24} color="#FF5722" />
        </View>

        {/* Center Dot */}
        <View style={styles.centerDot} />
      </View>

      {/* Accuracy Display */}
      {accuracy && (
        <View style={styles.accuracyContainer}>
          <Text style={[styles.accuracyText, { color: accuracy.color }]}>
            {accuracy.message}
          </Text>
          <View style={styles.accuracyBar}>
            <View 
              style={[
                styles.accuracyFill, 
                { 
                  width: `${accuracy.accuracy}%`,
                  backgroundColor: accuracy.color,
                }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
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
  degreeMarker: {
    position: 'absolute',
    width: 1,
    height: 8,
    backgroundColor: '#ccc',
  },
  mainDegreeMarker: {
    width: 2,
    height: 12,
    backgroundColor: '#666',
  },
  cardinalText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  qiblaIndicator: {
    position: 'absolute',
    alignItems: 'center',
    top: 20,
  },
  qiblaArrow: {
    alignItems: 'center',
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
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  accuracyContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  accuracyBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default CompassView;
