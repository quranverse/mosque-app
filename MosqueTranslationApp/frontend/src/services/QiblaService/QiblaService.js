import { Magnetometer } from 'expo-sensors';

class QiblaService {
  static KAABA_LATITUDE = 21.4225;
  static KAABA_LONGITUDE = 39.8262;

  static calculateQiblaDirection(latitude, longitude) {
    const lat1 = this.toRadians(latitude);
    const lat2 = this.toRadians(this.KAABA_LATITUDE);
    const deltaLng = this.toRadians(this.KAABA_LONGITUDE - longitude);

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = Math.atan2(x, y);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  static calculateDistanceToKaaba(latitude, longitude) {
    const R = 6371; // Earth's radius in kilometers
    const lat1 = this.toRadians(latitude);
    const lat2 = this.toRadians(this.KAABA_LATITUDE);
    const deltaLat = this.toRadians(this.KAABA_LATITUDE - latitude);
    const deltaLng = this.toRadians(this.KAABA_LONGITUDE - longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static async startCompassTracking(callback, options = {}) {
    try {
      const { updateInterval = 100 } = options;
      
      Magnetometer.setUpdateInterval(updateInterval);
      
      const subscription = Magnetometer.addListener((data) => {
        const heading = this.calculateHeading(data);
        const magneticStrength = this.calculateMagneticStrength(data);
        
        callback({
          heading,
          magneticStrength,
          needsCalibration: magneticStrength < 25,
          rawData: data,
        });
      });

      return subscription;
    } catch (error) {
      console.error('Error starting compass tracking:', error);
      throw error;
    }
  }

  static stopCompassTracking(subscription) {
    if (subscription) {
      subscription.remove();
    }
    Magnetometer.removeAllListeners();
  }

  static calculateHeading(magnetometerData, magneticDeclination = 0, previousData = null) {
    let { x, y } = magnetometerData;

    // Apply low-pass filter if we have previous data
    if (previousData) {
      const alpha = 0.3; // Low-pass filter coefficient (0 = no filtering, 1 = no smoothing)
      x = alpha * x + (1 - alpha) * previousData.x;
      y = alpha * y + (1 - alpha) * previousData.y;
    }

    // Calculate heading with proper mobile device orientation
    // For portrait mode, we need to adjust the calculation
    let angle = Math.atan2(-y, x) * (180 / Math.PI);
    // Convert to compass bearing (0° = North, 90° = East)
    angle = (90 - angle + 360) % 360;

    // Apply magnetic declination correction to get true north
    angle = (angle + magneticDeclination + 360) % 360;

    return angle;
  }

  static calculateMagneticStrength(magnetometerData) {
    const { x, y, z } = magnetometerData;
    return Math.sqrt(x * x + y * y + z * z);
  }

  static getQiblaOffset(currentHeading, qiblaDirection) {
    let offset = qiblaDirection - currentHeading;
    if (offset > 180) offset -= 360;
    if (offset < -180) offset += 360;
    return offset;
  }

  static getDirectionAccuracy(offset) {
    const absOffset = Math.abs(offset);
    
    if (absOffset < 5) {
      return {
        level: 'perfect',
        message: 'Perfect! You are facing Qibla',
        color: '#4CAF50',
        accuracy: 100 - absOffset,
      };
    } else if (absOffset < 15) {
      return {
        level: 'very-close',
        message: 'Very close to Qibla',
        color: '#8BC34A',
        accuracy: 100 - absOffset * 2,
      };
    } else if (absOffset < 45) {
      return {
        level: 'close',
        message: 'Close to Qibla',
        color: '#FF9800',
        accuracy: 100 - absOffset * 1.5,
      };
    } else {
      return {
        level: 'far',
        message: 'Turn to face Qibla',
        color: '#F44336',
        accuracy: Math.max(0, 100 - absOffset),
      };
    }
  }

  static getCardinalDirection(heading) {
    const directions = [
      { name: 'N', min: 0, max: 11.25 },
      { name: 'NNE', min: 11.25, max: 33.75 },
      { name: 'NE', min: 33.75, max: 56.25 },
      { name: 'ENE', min: 56.25, max: 78.75 },
      { name: 'E', min: 78.75, max: 101.25 },
      { name: 'ESE', min: 101.25, max: 123.75 },
      { name: 'SE', min: 123.75, max: 146.25 },
      { name: 'SSE', min: 146.25, max: 168.75 },
      { name: 'S', min: 168.75, max: 191.25 },
      { name: 'SSW', min: 191.25, max: 213.75 },
      { name: 'SW', min: 213.75, max: 236.25 },
      { name: 'WSW', min: 236.25, max: 258.75 },
      { name: 'W', min: 258.75, max: 281.25 },
      { name: 'WNW', min: 281.25, max: 303.75 },
      { name: 'NW', min: 303.75, max: 326.25 },
      { name: 'NNW', min: 326.25, max: 348.75 },
      { name: 'N', min: 348.75, max: 360 },
    ];

    for (const direction of directions) {
      if (heading >= direction.min && heading < direction.max) {
        return direction.name;
      }
    }
    return 'N';
  }

  static formatDirection(heading) {
    const cardinal = this.getCardinalDirection(heading);
    return `${Math.round(heading)}° ${cardinal}`;
  }

  static getQiblaInfo(latitude, longitude) {
    const qiblaDirection = this.calculateQiblaDirection(latitude, longitude);
    const distanceToKaaba = this.calculateDistanceToKaaba(latitude, longitude);
    
    return {
      qiblaDirection,
      distanceToKaaba,
      formattedDirection: this.formatDirection(qiblaDirection),
      formattedDistance: `${Math.round(distanceToKaaba)} km`,
      kaabaCoordinates: {
        latitude: this.KAABA_LATITUDE,
        longitude: this.KAABA_LONGITUDE,
      },
    };
  }

  static isCompassAvailable() {
    return Magnetometer.isAvailableAsync();
  }

  static async requestCompassPermissions() {
    // Magnetometer doesn't require explicit permissions on most platforms
    // but we can check if it's available
    try {
      const isAvailable = await this.isCompassAvailable();
      return isAvailable;
    } catch (error) {
      console.error('Error checking compass availability:', error);
      return false;
    }
  }

  static calibrateCompass() {
    // Return calibration instructions
    return {
      instructions: [
        'Hold your phone flat in your palm',
        'Move your phone in a figure-8 pattern',
        'Rotate the phone around all three axes',
        'Continue for 10-15 seconds',
        'Keep away from metal objects and magnets',
      ],
      duration: 15000, // 15 seconds
    };
  }

  static validateCompassReading(magnetometerData) {
    const strength = this.calculateMagneticStrength(magnetometerData);
    const { x, y, z } = magnetometerData;

    // Check for reasonable magnetic field strength
    const isValidStrength = strength > 15 && strength < 100;

    // Check for reasonable individual component values
    const maxComponent = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    const isValidComponents = maxComponent < 80;

    return {
      isValid: isValidStrength && isValidComponents,
      strength,
      needsCalibration: strength < 25,
      isInterference: strength > 100 || maxComponent > 80,
      rawValues: { x, y, z },
    };
  }

  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  static toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  static estimateMagneticDeclination(latitude, longitude) {
    // Simplified magnetic declination estimation
    // For more accuracy, you would use a proper magnetic model like WMM
    // This is a rough approximation for demonstration

    // Basic approximation based on geographic location
    // Positive values indicate magnetic north is east of true north
    // Negative values indicate magnetic north is west of true north

    if (latitude > 60) {
      // Arctic regions - high declination
      return longitude > 0 ? 15 : -15;
    } else if (latitude < -60) {
      // Antarctic regions
      return longitude > 0 ? -20 : 20;
    } else if (Math.abs(longitude) < 30) {
      // Europe/Africa region
      return latitude > 0 ? 2 : -5;
    } else if (longitude > 30 && longitude < 150) {
      // Asia/Australia region
      return latitude > 0 ? -5 : 10;
    } else if (longitude < -30) {
      // Americas region
      return latitude > 0 ? -10 : 5;
    }

    return 0; // Default fallback
  }

  static smoothHeading(currentHeading, previousHeading, smoothingFactor = 0.1) {
    if (previousHeading === null) return currentHeading;
    
    // Handle the 360/0 degree boundary
    let diff = currentHeading - previousHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    let smoothed = previousHeading + diff * smoothingFactor;
    if (smoothed < 0) smoothed += 360;
    if (smoothed >= 360) smoothed -= 360;
    
    return smoothed;
  }

  static getQiblaVisualization(qiblaDirection, currentHeading) {
    const offset = this.getQiblaOffset(currentHeading, qiblaDirection);
    const accuracy = this.getDirectionAccuracy(offset);
    
    return {
      qiblaDirection,
      currentHeading,
      offset,
      accuracy,
      rotationAngle: -currentHeading, // For compass rotation
      qiblaIndicatorAngle: offset, // For Qibla indicator position
      formattedQibla: this.formatDirection(qiblaDirection),
      formattedCurrent: this.formatDirection(currentHeading),
    };
  }
}

export default QiblaService;
