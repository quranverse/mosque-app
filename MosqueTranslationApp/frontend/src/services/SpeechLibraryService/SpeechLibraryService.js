import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateUtils, FormatUtils } from '../../utils';

class SpeechLibraryService {
  static STORAGE_KEY = 'speech_library';
  static FAVORITES_KEY = 'favorite_speeches';
  static DOWNLOADS_KEY = 'downloaded_speeches';

  // Removed mock data - use real API instead

  static async getAllSpeeches() {
    try {
      // TODO: Implement real API call to fetch speeches
      // const { default: ApiService } = await import('../ApiService');
      // const response = await ApiService.get('/speeches');
      // return response.speeches || [];

      // For now, return empty array until API is implemented
      return [];
    } catch (error) {
      console.error('Error getting all speeches:', error);
      return [];
    }
  }

  static async getSpeechesByMosque(mosqueId) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      return allSpeeches.filter(speech => speech.mosqueId === mosqueId);
    } catch (error) {
      console.error('Error getting speeches by mosque:', error);
      return [];
    }
  }

  static async getSpeechesByCategory(category) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      return allSpeeches.filter(speech => speech.category === category);
    } catch (error) {
      console.error('Error getting speeches by category:', error);
      return [];
    }
  }

  static async searchSpeeches(query, filters = {}) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      let filteredSpeeches = allSpeeches;

      // Text search
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase();
        filteredSpeeches = filteredSpeeches.filter(speech =>
          speech.title.toLowerCase().includes(searchTerm) ||
          speech.speaker.toLowerCase().includes(searchTerm) ||
          speech.description.toLowerCase().includes(searchTerm) ||
          speech.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          speech.mosqueName.toLowerCase().includes(searchTerm)
        );
      }

      // Apply filters
      if (filters.category) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          speech.category === filters.category
        );
      }

      if (filters.speaker) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          speech.speaker === filters.speaker
        );
      }

      if (filters.mosque) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          speech.mosqueId === filters.mosque
        );
      }

      if (filters.language) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          speech.language === filters.language ||
          speech.translationLanguages.includes(filters.language)
        );
      }

      if (filters.dateFrom) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          new Date(speech.date) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredSpeeches = filteredSpeeches.filter(speech => 
          new Date(speech.date) <= new Date(filters.dateTo)
        );
      }

      // Sort results
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'desc';

      filteredSpeeches.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.date) - new Date(b.date);
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'speaker':
            comparison = a.speaker.localeCompare(b.speaker);
            break;
          case 'duration':
            comparison = a.duration - b.duration;
            break;
          case 'views':
            comparison = a.views - b.views;
            break;
          case 'likes':
            comparison = a.likes - b.likes;
            break;
          default:
            comparison = 0;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      return filteredSpeeches;
    } catch (error) {
      console.error('Error searching speeches:', error);
      return [];
    }
  }

  static async getSpeechById(speechId) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      return allSpeeches.find(speech => speech.id === speechId);
    } catch (error) {
      console.error('Error getting speech by ID:', error);
      return null;
    }
  }

  static async getFavoriteSpeeches() {
    try {
      const favorites = await AsyncStorage.getItem(this.FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error getting favorite speeches:', error);
      return [];
    }
  }

  static async addToFavorites(speechId) {
    try {
      const favorites = await this.getFavoriteSpeeches();
      if (!favorites.includes(speechId)) {
        favorites.push(speechId);
        await AsyncStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
      }
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  }

  static async removeFromFavorites(speechId) {
    try {
      const favorites = await this.getFavoriteSpeeches();
      const updatedFavorites = favorites.filter(id => id !== speechId);
      await AsyncStorage.setItem(this.FAVORITES_KEY, JSON.stringify(updatedFavorites));
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  }

  static async getDownloadedSpeeches() {
    try {
      const downloads = await AsyncStorage.getItem(this.DOWNLOADS_KEY);
      return downloads ? JSON.parse(downloads) : [];
    } catch (error) {
      console.error('Error getting downloaded speeches:', error);
      return [];
    }
  }

  static async markAsDownloaded(speechId) {
    try {
      const downloads = await this.getDownloadedSpeeches();
      if (!downloads.includes(speechId)) {
        downloads.push(speechId);
        await AsyncStorage.setItem(this.DOWNLOADS_KEY, JSON.stringify(downloads));
      }
      return true;
    } catch (error) {
      console.error('Error marking as downloaded:', error);
      return false;
    }
  }

  static async removeDownload(speechId) {
    try {
      const downloads = await this.getDownloadedSpeeches();
      const updatedDownloads = downloads.filter(id => id !== speechId);
      await AsyncStorage.setItem(this.DOWNLOADS_KEY, JSON.stringify(updatedDownloads));
      return true;
    } catch (error) {
      console.error('Error removing download:', error);
      return false;
    }
  }

  static async getCategories() {
    try {
      const allSpeeches = await this.getAllSpeeches();
      const categories = [...new Set(allSpeeches.map(speech => speech.category))];
      return categories.sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  static async getSpeakers() {
    try {
      const allSpeeches = await this.getAllSpeeches();
      const speakers = [...new Set(allSpeeches.map(speech => speech.speaker))];
      return speakers.sort();
    } catch (error) {
      console.error('Error getting speakers:', error);
      return [];
    }
  }

  static async getLanguages() {
    try {
      const allSpeeches = await this.getAllSpeeches();
      const languages = new Set();
      
      allSpeeches.forEach(speech => {
        languages.add(speech.language);
        speech.translationLanguages.forEach(lang => languages.add(lang));
      });
      
      return Array.from(languages).sort();
    } catch (error) {
      console.error('Error getting languages:', error);
      return [];
    }
  }

  static async getRecentSpeeches(limit = 10) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      return allSpeeches
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent speeches:', error);
      return [];
    }
  }

  static async getPopularSpeeches(limit = 10) {
    try {
      const allSpeeches = await this.getAllSpeeches();
      return allSpeeches
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting popular speeches:', error);
      return [];
    }
  }

  static async incrementViews(speechId) {
    try {
      // In a real app, this would update the server
      // For now, just simulate the action
      console.log(`Incrementing views for speech ${speechId}`);
      return true;
    } catch (error) {
      console.error('Error incrementing views:', error);
      return false;
    }
  }

  static async toggleLike(speechId) {
    try {
      // In a real app, this would update the server
      // For now, just simulate the action
      console.log(`Toggling like for speech ${speechId}`);
      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  static formatSpeechDuration(seconds) {
    return FormatUtils.formatDuration(seconds);
  }

  static formatSpeechDate(dateString) {
    return DateUtils.formatDate(new Date(dateString), 'MMM DD, YYYY');
  }

  static async getPlaybackHistory() {
    try {
      const history = await AsyncStorage.getItem('playback_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting playback history:', error);
      return [];
    }
  }

  static async addToPlaybackHistory(speechId) {
    try {
      const history = await this.getPlaybackHistory();
      const existingIndex = history.findIndex(item => item.speechId === speechId);
      
      if (existingIndex >= 0) {
        // Update existing entry
        history[existingIndex].lastPlayed = new Date().toISOString();
        history[existingIndex].playCount += 1;
      } else {
        // Add new entry
        history.unshift({
          speechId,
          lastPlayed: new Date().toISOString(),
          playCount: 1,
        });
      }
      
      // Keep only last 50 entries
      const trimmedHistory = history.slice(0, 50);
      await AsyncStorage.setItem('playback_history', JSON.stringify(trimmedHistory));
      
      return true;
    } catch (error) {
      console.error('Error adding to playback history:', error);
      return false;
    }
  }
}

export default SpeechLibraryService;
