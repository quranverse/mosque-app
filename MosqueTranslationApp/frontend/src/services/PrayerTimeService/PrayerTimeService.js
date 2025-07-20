import { Coordinates, CalculationMethod, PrayerTimes, Prayer } from 'adhan';
import moment from 'moment-timezone';

class PrayerTimeService {
  static async getPrayerTimes(latitude, longitude, date = new Date()) {
    try {
      const coordinates = new Coordinates(latitude, longitude);
      const calculationParams = CalculationMethod.MoonsightingCommittee();
      
      // You can customize calculation parameters
      calculationParams.highLatitudeRule = 'SeventhOfTheNight';

      const prayerTimes = new PrayerTimes(coordinates, date, calculationParams);

      // Get timezone for the location
      const timezone = await this.getTimezone(latitude, longitude);

      const times = {
        fajr: moment(prayerTimes.fajr).tz(timezone).format('h:mm A'),
        sunrise: moment(prayerTimes.sunrise).tz(timezone).format('h:mm A'),
        dhuhr: moment(prayerTimes.dhuhr).tz(timezone).format('h:mm A'),
        asr: moment(prayerTimes.asr).tz(timezone).format('h:mm A'),
        maghrib: moment(prayerTimes.maghrib).tz(timezone).format('h:mm A'),
        isha: moment(prayerTimes.isha).tz(timezone).format('h:mm A'),
      };

      // Calculate next prayer
      const nextPrayer = this.getNextPrayer(prayerTimes, timezone);

      return {
        times,
        next: nextPrayer,
        date: moment(date).format('MMMM DD, YYYY'),
        location: { latitude, longitude },
        timezone,
      };
    } catch (error) {
      console.error('Error calculating prayer times:', error);
      throw error;
    }
  }

  static getNextPrayer(prayerTimes, timezone) {
    const now = moment().tz(timezone);
    const prayers = [
      { name: 'Fajr', time: prayerTimes.fajr, displayName: 'Fajr' },
      { name: 'Dhuhr', time: prayerTimes.dhuhr, displayName: 'Dhuhr' },
      { name: 'Asr', time: prayerTimes.asr, displayName: 'Asr' },
      { name: 'Maghrib', time: prayerTimes.maghrib, displayName: 'Maghrib' },
      { name: 'Isha', time: prayerTimes.isha, displayName: 'Isha' },
    ];

    // Find next prayer
    for (const prayer of prayers) {
      const prayerTime = moment(prayer.time).tz(timezone);
      if (prayerTime.isAfter(now)) {
        const timeRemaining = this.getTimeRemaining(now, prayerTime);
        return {
          name: prayer.displayName,
          time: prayerTime.format('h:mm A'),
          timeRemaining,
          timestamp: prayer.time,
        };
      }
    }

    // If no prayer found today, return tomorrow's Fajr
    const tomorrow = moment().tz(timezone).add(1, 'day').toDate();
    const tomorrowPrayerTimes = new PrayerTimes(
      new Coordinates(prayerTimes.coordinates.latitude, prayerTimes.coordinates.longitude),
      tomorrow,
      prayerTimes.calculationParameters
    );
    
    const tomorrowFajr = moment(tomorrowPrayerTimes.fajr).tz(timezone);
    const timeRemaining = this.getTimeRemaining(now, tomorrowFajr);
    
    return {
      name: 'Fajr',
      time: tomorrowFajr.format('h:mm A'),
      timeRemaining,
      timestamp: tomorrowPrayerTimes.fajr,
    };
  }

  static getTimeRemaining(now, prayerTime) {
    const duration = moment.duration(prayerTime.diff(now));
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }

  static async getTimezone(latitude, longitude) {
    // This is a simplified timezone detection
    // In a real app, you might want to use a more robust timezone API
    try {
      // For now, we'll use a simple approach based on longitude
      // This is not accurate for all locations but works as a starting point
      const offset = Math.round(longitude / 15);
      return moment.tz.guess() || `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`;
    } catch (error) {
      console.error('Error getting timezone:', error);
      return moment.tz.guess() || 'UTC';
    }
  }

  static async getPrayerTimesForWeek(latitude, longitude) {
    try {
      const weekTimes = [];
      const today = moment().startOf('day');

      for (let i = 0; i < 7; i++) {
        const date = today.clone().add(i, 'days').toDate();
        const dayTimes = await this.getPrayerTimes(latitude, longitude, date);
        weekTimes.push({
          date: moment(date).format('dddd, MMM DD'),
          times: dayTimes.times,
          isToday: i === 0,
        });
      }

      return weekTimes;
    } catch (error) {
      console.error('Error getting weekly prayer times:', error);
      throw error;
    }
  }

  static async getPrayerTimesForMonth(latitude, longitude, year, month) {
    try {
      const monthTimes = [];
      const startOfMonth = moment().year(year).month(month - 1).startOf('month');
      const daysInMonth = startOfMonth.daysInMonth();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = startOfMonth.clone().date(day).toDate();
        const dayTimes = await this.getPrayerTimes(latitude, longitude, date);
        monthTimes.push({
          date: moment(date).format('DD'),
          fullDate: moment(date).format('YYYY-MM-DD'),
          times: dayTimes.times,
          isToday: moment(date).isSame(moment(), 'day'),
        });
      }

      return {
        month: startOfMonth.format('MMMM YYYY'),
        times: monthTimes,
      };
    } catch (error) {
      console.error('Error getting monthly prayer times:', error);
      throw error;
    }
  }

  static getCurrentPrayer(prayerTimes, timezone) {
    const now = moment().tz(timezone);
    const prayers = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha },
    ];

    let currentPrayer = null;
    
    for (let i = 0; i < prayers.length; i++) {
      const prayerTime = moment(prayers[i].time).tz(timezone);
      const nextPrayerTime = i < prayers.length - 1 
        ? moment(prayers[i + 1].time).tz(timezone)
        : moment(prayers[0].time).tz(timezone).add(1, 'day');

      if (now.isAfter(prayerTime) && now.isBefore(nextPrayerTime)) {
        currentPrayer = prayers[i].name;
        break;
      }
    }

    return currentPrayer;
  }

  static getQiblaDirection(latitude, longitude) {
    // Kaaba coordinates
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
  }
}

export default PrayerTimeService;
