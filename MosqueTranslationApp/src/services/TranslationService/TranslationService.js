import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TranslationService {
  static instance = null;
  static socket = null;
  static currentSession = null;
  static listeners = new Map();

  static getInstance() {
    if (!this.instance) {
      this.instance = new TranslationService();
    }
    return this.instance;
  }

  static async connectToServer(serverUrl = 'ws://localhost:3001') {
    try {
      if (this.socket && this.socket.connected) {
        return this.socket;
      }

      this.socket = io(serverUrl, {
        transports: ['websocket'],
        timeout: 10000,
      });

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('Connected to translation server');
          resolve(this.socket);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from translation server');
        });

        // Set up translation event listeners
        this.setupEventListeners();
      });
    } catch (error) {
      console.error('Error connecting to server:', error);
      throw error;
    }
  }

  static setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('translation_update', (data) => {
      this.handleTranslationUpdate(data);
    });

    this.socket.on('session_started', (data) => {
      this.handleSessionStarted(data);
    });

    this.socket.on('session_ended', (data) => {
      this.handleSessionEnded(data);
    });

    this.socket.on('participant_joined', (data) => {
      this.handleParticipantJoined(data);
    });

    this.socket.on('participant_left', (data) => {
      this.handleParticipantLeft(data);
    });
  }

  static async joinTranslationSession(mosqueId, sessionId) {
    try {
      if (!this.socket || !this.socket.connected) {
        throw new Error('Not connected to translation server');
      }

      const deviceId = await this.getDeviceId();
      
      return new Promise((resolve, reject) => {
        this.socket.emit('join_session', {
          mosqueId,
          sessionId,
          deviceId,
          userType: 'listener',
        }, (response) => {
          if (response.success) {
            this.currentSession = {
              mosqueId,
              sessionId,
              joinedAt: new Date(),
              translations: [],
            };
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('Error joining translation session:', error);
      throw error;
    }
  }

  static async leaveTranslationSession() {
    try {
      if (!this.socket || !this.currentSession) {
        return;
      }

      const deviceId = await this.getDeviceId();
      
      this.socket.emit('leave_session', {
        sessionId: this.currentSession.sessionId,
        deviceId,
      });

      this.currentSession = null;
    } catch (error) {
      console.error('Error leaving translation session:', error);
    }
  }

  static async startTranslationSession(mosqueId, languages = ['English']) {
    try {
      if (!this.socket || !this.socket.connected) {
        throw new Error('Not connected to translation server');
      }

      const deviceId = await this.getDeviceId();
      
      return new Promise((resolve, reject) => {
        this.socket.emit('start_session', {
          mosqueId,
          deviceId,
          languages,
          userType: 'broadcaster',
        }, (response) => {
          if (response.success) {
            this.currentSession = {
              mosqueId,
              sessionId: response.sessionId,
              startedAt: new Date(),
              languages,
              translations: [],
              isBroadcaster: true,
            };
            resolve(response);
          } else {
            reject(new Error(response.error));
          }
        });
      });
    } catch (error) {
      console.error('Error starting translation session:', error);
      throw error;
    }
  }

  static async endTranslationSession() {
    try {
      if (!this.socket || !this.currentSession || !this.currentSession.isBroadcaster) {
        return;
      }

      this.socket.emit('end_session', {
        sessionId: this.currentSession.sessionId,
      });

      this.currentSession = null;
    } catch (error) {
      console.error('Error ending translation session:', error);
    }
  }

  static async sendTranslation(arabicText, englishText) {
    try {
      if (!this.socket || !this.currentSession || !this.currentSession.isBroadcaster) {
        throw new Error('Not authorized to send translations');
      }

      const translation = {
        id: Date.now().toString(),
        arabicText,
        englishText,
        timestamp: new Date().toISOString(),
        sessionId: this.currentSession.sessionId,
      };

      this.socket.emit('send_translation', translation);
      
      // Add to local session
      this.currentSession.translations.push(translation);
      
      return translation;
    } catch (error) {
      console.error('Error sending translation:', error);
      throw error;
    }
  }

  static handleTranslationUpdate(data) {
    if (this.currentSession) {
      this.currentSession.translations.push(data);
    }

    // Notify all listeners
    this.listeners.forEach((callback, listenerId) => {
      try {
        callback('translation_update', data);
      } catch (error) {
        console.error('Error in translation listener:', error);
      }
    });
  }

  static handleSessionStarted(data) {
    this.listeners.forEach((callback, listenerId) => {
      try {
        callback('session_started', data);
      } catch (error) {
        console.error('Error in session started listener:', error);
      }
    });
  }

  static handleSessionEnded(data) {
    if (this.currentSession && this.currentSession.sessionId === data.sessionId) {
      this.currentSession = null;
    }

    this.listeners.forEach((callback, listenerId) => {
      try {
        callback('session_ended', data);
      } catch (error) {
        console.error('Error in session ended listener:', error);
      }
    });
  }

  static handleParticipantJoined(data) {
    this.listeners.forEach((callback, listenerId) => {
      try {
        callback('participant_joined', data);
      } catch (error) {
        console.error('Error in participant joined listener:', error);
      }
    });
  }

  static handleParticipantLeft(data) {
    this.listeners.forEach((callback, listenerId) => {
      try {
        callback('participant_left', data);
      } catch (error) {
        console.error('Error in participant left listener:', error);
      }
    });
  }

  static addListener(callback) {
    const listenerId = Date.now().toString() + Math.random().toString(36);
    this.listeners.set(listenerId, callback);
    return listenerId;
  }

  static removeListener(listenerId) {
    this.listeners.delete(listenerId);
  }

  static async getAvailableSessions(location) {
    try {
      // Use the real API endpoint
      const { default: ApiService } = await import('../ApiService');
      const response = await ApiService.get('/sessions/active');

      if (response.success) {
        return response.sessions || [];
      }

      return [];
    } catch (error) {
      console.error('Error getting available sessions:', error);
      return [];
    }
  }

  static async getSessionHistory(mosqueId) {
    try {
      const history = await AsyncStorage.getItem(`session_history_${mosqueId}`);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }

  static async saveSessionToHistory(sessionData) {
    try {
      const mosqueId = sessionData.mosqueId;
      const history = await this.getSessionHistory(mosqueId);
      
      const sessionSummary = {
        id: sessionData.sessionId,
        mosqueId,
        startedAt: sessionData.startedAt,
        endedAt: new Date(),
        translationCount: sessionData.translations.length,
        languages: sessionData.languages,
      };

      history.unshift(sessionSummary);
      
      // Keep only last 50 sessions
      const trimmedHistory = history.slice(0, 50);
      
      await AsyncStorage.setItem(
        `session_history_${mosqueId}`,
        JSON.stringify(trimmedHistory)
      );
    } catch (error) {
      console.error('Error saving session to history:', error);
    }
  }

  static async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = Date.now().toString() + Math.random().toString(36);
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return 'unknown_device';
    }
  }

  static getCurrentSession() {
    return this.currentSession;
  }

  static isConnected() {
    return this.socket && this.socket.connected;
  }

  static disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentSession = null;
    this.listeners.clear();
  }


}

export default TranslationService;
