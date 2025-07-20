import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

// Device and Storage Utilities
export const DeviceUtils = {
  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `fallback_${Date.now()}`;
    }
  },

  async getAppVersion() {
    // In a real app, this would come from app.json or package.json
    return '1.0.0';
  },

  async getDeviceInfo() {
    const deviceId = await this.getDeviceId();
    const appVersion = await this.getAppVersion();
    
    return {
      deviceId,
      appVersion,
      platform: 'mobile', // Could be 'ios', 'android', 'web'
      timestamp: new Date().toISOString(),
    };
  },
};

// Storage Utilities
export const StorageUtils = {
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Error storing data:', error);
      return false;
    }
  },

  async getItem(key, defaultValue = null) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return defaultValue;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data:', error);
      return false;
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },
};

// Date and Time Utilities
export const DateUtils = {
  formatTime(date, format = 'h:mm A') {
    return moment(date).format(format);
  },

  formatDate(date, format = 'MMMM DD, YYYY') {
    return moment(date).format(format);
  },

  formatDateTime(date, format = 'MMMM DD, YYYY h:mm A') {
    return moment(date).format(format);
  },

  getTimeRemaining(targetDate) {
    const now = moment();
    const target = moment(targetDate);
    const duration = moment.duration(target.diff(now));

    if (duration.asMilliseconds() <= 0) {
      return 'Time passed';
    }

    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  },

  isToday(date) {
    return moment(date).isSame(moment(), 'day');
  },

  isTomorrow(date) {
    return moment(date).isSame(moment().add(1, 'day'), 'day');
  },

  getRelativeTime(date) {
    return moment(date).fromNow();
  },

  convertToHijri(gregorianDate) {
    // Simplified Hijri conversion - in a real app, use a proper Hijri calendar library
    const hijriYear = Math.floor((moment(gregorianDate).year() - 622) * 1.030684);
    return {
      year: hijriYear,
      formatted: `${hijriYear} AH`,
    };
  },
};

// Validation Utilities
export const ValidationUtils = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  },

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.trim().replace(/[<>]/g, '');
  },
};

// Formatting Utilities
export const FormatUtils = {
  formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    } else if (distanceInKm < 10) {
      return `${distanceInKm.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceInKm)} km`;
    }
  },

  formatNumber(number) {
    if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    } else {
      return number.toString();
    }
  },

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },
};

// Network Utilities
export const NetworkUtils = {
  async checkConnectivity() {
    try {
      // Simple connectivity check
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  },
};

// Islamic Utilities
export const IslamicUtils = {
  getIslamicGreeting() {
    const greetings = [
      'Assalamu Alaikum',
      'Peace be upon you',
      'May Allah bless you',
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  },

  getPrayerNames() {
    return ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  },

  getIslamicMonths() {
    return [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
      'Ramadan', 'Shawwal', 'Dhu al-Qidah', 'Dhu al-Hijjah'
    ];
  },

  getQiblaDirection(latitude, longitude) {
    const kaabaLat = 21.4225;
    const kaabaLng = 39.8262;

    const lat1 = latitude * (Math.PI / 180);
    const lat2 = kaabaLat * (Math.PI / 180);
    const deltaLng = (kaabaLng - longitude) * (Math.PI / 180);

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = Math.atan2(x, y);
    bearing = bearing * (180 / Math.PI);
    bearing = (bearing + 360) % 360;

    return bearing;
  },

  isRamadan() {
    // Simplified check - in a real app, use proper Islamic calendar
    const now = moment();
    const ramadanStart = moment('2024-03-11'); // Example date
    const ramadanEnd = moment('2024-04-09'); // Example date
    return now.isBetween(ramadanStart, ramadanEnd);
  },
};

// Error Handling Utilities
export const ErrorUtils = {
  logError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    // In a real app, you might send this to a crash reporting service
  },

  getErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
  },

  isNetworkError(error) {
    return (
      error?.code === 'NETWORK_ERROR' ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch')
    );
  },
};

// Performance Utilities
export const PerformanceUtils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  measureTime(label) {
    const start = Date.now();
    return () => {
      const end = Date.now();
      console.log(`${label}: ${end - start}ms`);
    };
  },
};

// Export all utilities
export default {
  DeviceUtils,
  StorageUtils,
  DateUtils,
  ValidationUtils,
  FormatUtils,
  NetworkUtils,
  IslamicUtils,
  ErrorUtils,
  PerformanceUtils,
};
