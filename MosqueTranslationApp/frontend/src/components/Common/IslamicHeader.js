import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Typography, Spacing, Layout } from '../../utils/theme';

const IslamicHeader = ({ 
  title, 
  subtitle = null, 
  showPattern = true,
  gradient = true,
  rightComponent = null,
  leftComponent = null,
  style = {},
}) => {
  const renderContent = () => (
    <View style={styles.content}>
      {leftComponent && (
        <View style={styles.leftSection}>
          {leftComponent}
        </View>
      )}
      
      <View style={styles.centerSection}>
        <View style={styles.titleContainer}>
          {showPattern && (
            <Text style={styles.pattern}>🕌</Text>
          )}
          <Text style={styles.title}>{title}</Text>
          {showPattern && (
            <Text style={styles.pattern}>🕌</Text>
          )}
        </View>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
      
      {rightComponent && (
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      )}
    </View>
  );

  if (gradient) {
    return (
      <View style={[styles.container, style]}>
        <StatusBar backgroundColor={Colors.primary.dark} barStyle="light-content" />
        <LinearGradient
          colors={[Colors.primary.main, Colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {renderContent()}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.solidBackground, style]}>
      <StatusBar backgroundColor={Colors.primary.main} barStyle="light-content" />
      {renderContent()}
    </View>
  );
};

const IslamicHeaderWithGreeting = ({ 
  userName = null, 
  location = null,
  showTime = true,
  ...props 
}) => {
  const getIslamicGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير'; // Good morning in Arabic
    if (hour < 18) return 'مساء الخير'; // Good afternoon in Arabic
    return 'مساء الخير'; // Good evening in Arabic
  };

  const getGreetingTranslation = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <IslamicHeader
      title="Assalamu Alaikum"
      subtitle={
        <View style={styles.greetingContainer}>
          <Text style={styles.arabicGreeting}>{getIslamicGreeting()}</Text>
          <Text style={styles.englishGreeting}>{getGreetingTranslation()}</Text>
          {userName && (
            <Text style={styles.userName}>{userName}</Text>
          )}
          {location && (
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={12} color={Colors.primary.surface} />
              <Text style={styles.location}>{location}</Text>
            </View>
          )}
          {showTime && (
            <Text style={styles.currentTime}>{getCurrentTime()}</Text>
          )}
        </View>
      }
      {...props}
    />
  );
};

const IslamicHeaderWithPrayerTime = ({ 
  nextPrayer = null,
  timeRemaining = null,
  ...props 
}) => {
  if (!nextPrayer) {
    return <IslamicHeader {...props} />;
  }

  return (
    <IslamicHeader
      subtitle={
        <View style={styles.prayerContainer}>
          <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
          <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
          <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
          {timeRemaining && (
            <Text style={styles.timeRemaining}>{timeRemaining}</Text>
          )}
        </View>
      }
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  gradient: {
    minHeight: Layout.headerHeight + (StatusBar.currentHeight || 0),
  },
  solidBackground: {
    backgroundColor: Colors.primary.main,
    minHeight: Layout.headerHeight + (StatusBar.currentHeight || 0),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: Layout.headerHeight,
  },
  leftSection: {
    flex: 0,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 0,
    alignItems: 'flex-end',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pattern: {
    fontSize: Typography.sizes.lg,
    marginHorizontal: Spacing.sm,
    opacity: 0.8,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.surface,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  greetingContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  arabicGreeting: {
    fontSize: Typography.sizes.base,
    color: Colors.primary.surface,
    fontFamily: Typography.fonts.arabic,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  englishGreeting: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.surface,
    textAlign: 'center',
  },
  userName: {
    fontSize: Typography.sizes.base,
    color: Colors.text.inverse,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  location: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary.surface,
    marginLeft: Spacing.xs,
  },
  currentTime: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.surface,
    marginTop: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  prayerContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  nextPrayerLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary.surface,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  nextPrayerName: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.inverse,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  nextPrayerTime: {
    fontSize: Typography.sizes.base,
    color: Colors.primary.surface,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  timeRemaining: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary.surface,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

// Export different header variants
export default IslamicHeader;
export { IslamicHeaderWithGreeting, IslamicHeaderWithPrayerTime };
