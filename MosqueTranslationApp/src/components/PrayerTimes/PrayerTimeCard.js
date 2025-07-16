import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Card from '../Common/Card';

const PrayerTimeCard = ({ 
  prayerName, 
  time, 
  isNext = false, 
  isPassed = false,
  timeRemaining = null,
  onPress = null,
}) => {
  const getPrayerIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'fajr':
        return 'wb-sunny';
      case 'sunrise':
        return 'wb-sunny';
      case 'dhuhr':
        return 'wb-sunny';
      case 'asr':
        return 'wb-cloudy';
      case 'maghrib':
        return 'brightness-3';
      case 'isha':
        return 'brightness-2';
      default:
        return 'schedule';
    }
  };

  const getCardStyle = () => {
    if (isNext) {
      return styles.nextPrayerCard;
    } else if (isPassed) {
      return styles.passedPrayerCard;
    }
    return styles.defaultCard;
  };

  const getTextStyle = () => {
    if (isNext) {
      return styles.nextPrayerText;
    } else if (isPassed) {
      return styles.passedPrayerText;
    }
    return styles.defaultText;
  };

  return (
    <Card 
      style={getCardStyle()} 
      onPress={onPress}
      elevation={isNext ? 4 : 2}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Icon 
            name={getPrayerIcon(prayerName)} 
            size={24} 
            color={isNext ? '#2E7D32' : isPassed ? '#999' : '#666'} 
          />
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, getTextStyle()]}>
              {prayerName}
            </Text>
            {timeRemaining && isNext && (
              <Text style={styles.timeRemaining}>
                {timeRemaining}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.time, getTextStyle()]}>
          {time}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prayerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
  },
  defaultCard: {
    marginBottom: 8,
  },
  nextPrayerCard: {
    marginBottom: 8,
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  passedPrayerCard: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  defaultText: {
    color: '#333',
  },
  nextPrayerText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  passedPrayerText: {
    color: '#999',
  },
});

export default PrayerTimeCard;
