import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import PrayerTimeService from '../PrayerTimeService/PrayerTimeService';
import { DateUtils } from '../../utils';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  static SETTINGS_KEY = 'notification_settings';
  static SCHEDULED_KEY = 'scheduled_notifications';

  static defaultSettings = {
    prayerTimes: {
      enabled: true,
      beforeMinutes: 10, // Notify 10 minutes before prayer time
      sound: 'default',
      vibrate: true,
    },
    liveTranslation: {
      enabled: true,
      sound: 'default',
      vibrate: true,
    },
    mosqueNews: {
      enabled: true,
      sound: 'default',
      vibrate: false,
    },
    fridayReminder: {
      enabled: true,
      beforeHours: 2, // Notify 2 hours before Jummah
      sound: 'default',
      vibrate: true,
    },
    islamicEvents: {
      enabled: true,
      sound: 'default',
      vibrate: false,
    },
  };

  static async initialize() {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('prayer-times', {
          name: 'Prayer Times',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D32',
        });

        await Notifications.setNotificationChannelAsync('live-translation', {
          name: 'Live Translation',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E7D32',
        });

        await Notifications.setNotificationChannelAsync('mosque-news', {
          name: 'Mosque News',
          importance: Notifications.AndroidImportance.LOW,
          lightColor: '#2E7D32',
        });
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  static async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(this.SETTINGS_KEY);
      return settings ? { ...this.defaultSettings, ...JSON.parse(settings) } : this.defaultSettings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.defaultSettings;
    }
  }

  static async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
      
      // Reschedule notifications with new settings
      await this.scheduleAllNotifications();
      
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  static async schedulePrayerTimeNotifications(latitude, longitude) {
    try {
      const settings = await this.getSettings();
      if (!settings.prayerTimes.enabled) return;

      // Cancel existing prayer time notifications
      await this.cancelNotificationsByType('prayer');

      // Get prayer times for the next 7 days
      const notifications = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const prayerTimes = await PrayerTimeService.getPrayerTimes(latitude, longitude, date);
        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        
        prayers.forEach(prayer => {
          const prayerTime = prayerTimes.times[prayer];
          if (prayerTime) {
            const notificationTime = new Date(prayerTime);
            notificationTime.setMinutes(notificationTime.getMinutes() - settings.prayerTimes.beforeMinutes);
            
            if (notificationTime > new Date()) {
              notifications.push({
                identifier: `prayer_${prayer}_${date.toDateString()}`,
                content: {
                  title: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} Prayer Time`,
                  body: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer is in ${settings.prayerTimes.beforeMinutes} minutes`,
                  data: { type: 'prayer', prayer, time: prayerTime },
                  sound: settings.prayerTimes.sound,
                  categoryIdentifier: 'prayer-times',
                },
                trigger: {
                  date: notificationTime,
                },
              });
            }
          }
        });
      }

      // Schedule all notifications
      for (const notification of notifications) {
        await Notifications.scheduleNotificationAsync(notification);
      }

      console.log(`Scheduled ${notifications.length} prayer time notifications`);
      return true;
    } catch (error) {
      console.error('Error scheduling prayer time notifications:', error);
      return false;
    }
  }

  static async scheduleFridayReminder(latitude, longitude) {
    try {
      const settings = await this.getSettings();
      if (!settings.fridayReminder.enabled) return;

      // Cancel existing Friday reminders
      await this.cancelNotificationsByType('friday');

      // Schedule Friday reminders for the next 4 weeks
      const notifications = [];
      for (let i = 0; i < 4; i++) {
        const friday = this.getNextFriday(i);
        const prayerTimes = await PrayerTimeService.getPrayerTimes(latitude, longitude, friday);
        const jummahTime = prayerTimes.times.dhuhr; // Jummah is typically at Dhuhr time
        
        if (jummahTime) {
          const notificationTime = new Date(jummahTime);
          notificationTime.setHours(notificationTime.getHours() - settings.fridayReminder.beforeHours);
          
          if (notificationTime > new Date()) {
            notifications.push({
              identifier: `friday_${friday.toDateString()}`,
              content: {
                title: 'Jummah Prayer Reminder',
                body: `Jummah prayer is in ${settings.fridayReminder.beforeHours} hours. Don't forget to attend!`,
                data: { type: 'friday', time: jummahTime },
                sound: settings.fridayReminder.sound,
                categoryIdentifier: 'prayer-times',
              },
              trigger: {
                date: notificationTime,
              },
            });
          }
        }
      }

      // Schedule all notifications
      for (const notification of notifications) {
        await Notifications.scheduleNotificationAsync(notification);
      }

      console.log(`Scheduled ${notifications.length} Friday reminders`);
      return true;
    } catch (error) {
      console.error('Error scheduling Friday reminders:', error);
      return false;
    }
  }

  static async scheduleIslamicEventNotifications() {
    try {
      const settings = await this.getSettings();
      if (!settings.islamicEvents.enabled) return;

      // Cancel existing Islamic event notifications
      await this.cancelNotificationsByType('islamic-event');

      // Mock Islamic events (in a real app, this would come from an Islamic calendar API)
      const islamicEvents = [
        {
          name: 'Laylat al-Qadr',
          date: new Date('2024-04-05'), // Example date
          description: 'The Night of Power - one of the most sacred nights in Islam',
        },
        {
          name: 'Eid al-Fitr',
          date: new Date('2024-04-10'), // Example date
          description: 'Festival of Breaking the Fast',
        },
        {
          name: 'Eid al-Adha',
          date: new Date('2024-06-16'), // Example date
          description: 'Festival of Sacrifice',
        },
      ];

      const notifications = [];
      islamicEvents.forEach(event => {
        // Notify 1 day before
        const notificationTime = new Date(event.date);
        notificationTime.setDate(notificationTime.getDate() - 1);
        
        if (notificationTime > new Date()) {
          notifications.push({
            identifier: `islamic_event_${event.name.replace(/\s+/g, '_')}`,
            content: {
              title: `${event.name} Tomorrow`,
              body: event.description,
              data: { type: 'islamic-event', event: event.name },
              sound: settings.islamicEvents.sound,
            },
            trigger: {
              date: notificationTime,
            },
          });
        }
      });

      // Schedule all notifications
      for (const notification of notifications) {
        await Notifications.scheduleNotificationAsync(notification);
      }

      console.log(`Scheduled ${notifications.length} Islamic event notifications`);
      return true;
    } catch (error) {
      console.error('Error scheduling Islamic event notifications:', error);
      return false;
    }
  }

  static async sendLiveTranslationNotification(mosqueName, language = 'English') {
    try {
      const settings = await this.getSettings();
      if (!settings.liveTranslation.enabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Live Translation Started',
          body: `${mosqueName} has started live translation in ${language}`,
          data: { type: 'live-translation', mosqueName, language },
          sound: settings.liveTranslation.sound,
          categoryIdentifier: 'live-translation',
        },
        trigger: null, // Send immediately
      });

      return true;
    } catch (error) {
      console.error('Error sending live translation notification:', error);
      return false;
    }
  }

  static async sendMosqueNewsNotification(mosqueName, title, message) {
    try {
      const settings = await this.getSettings();
      if (!settings.mosqueNews.enabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${mosqueName}: ${title}`,
          body: message,
          data: { type: 'mosque-news', mosqueName, title },
          sound: settings.mosqueNews.sound,
          categoryIdentifier: 'mosque-news',
        },
        trigger: null, // Send immediately
      });

      return true;
    } catch (error) {
      console.error('Error sending mosque news notification:', error);
      return false;
    }
  }

  static async scheduleAllNotifications() {
    try {
      // This would typically get the user's location
      // For now, using default coordinates
      const latitude = 40.7128; // New York
      const longitude = -74.0060;

      await Promise.all([
        this.schedulePrayerTimeNotifications(latitude, longitude),
        this.scheduleFridayReminder(latitude, longitude),
        this.scheduleIslamicEventNotifications(),
      ]);

      return true;
    } catch (error) {
      console.error('Error scheduling all notifications:', error);
      return false;
    }
  }

  static async cancelNotificationsByType(type) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications
        .filter(notification => notification.identifier.startsWith(type))
        .map(notification => notification.identifier);

      await Notifications.cancelScheduledNotificationsAsync(notificationsToCancel);
      return true;
    } catch (error) {
      console.error('Error canceling notifications:', error);
      return false;
    }
  }

  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  static getNextFriday(weeksFromNow = 0) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7; // 5 = Friday
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday + (weeksFromNow * 7));
    return nextFriday;
  }

  static addNotificationListener(listener) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseListener(listener) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  static removeNotificationListener(subscription) {
    if (subscription) {
      subscription.remove();
    }
  }
}

export default NotificationService;
