const fs = require('fs').promises;
const path = require('path');
const AudioRecording = require('../models/AudioRecording');
const config = require('../config/config');

class AudioStorageService {
  constructor() {
    this.baseStoragePath = path.join(__dirname, '..', 'audio-recordings');
    this.ensureStorageDirectories();
  }

  async ensureStorageDirectories() {
    try {
      // Create base audio-recordings directory
      await fs.mkdir(this.baseStoragePath, { recursive: true });
      console.log('✅ Audio storage directories ensured');
    } catch (error) {
      console.error('❌ Error creating storage directories:', error);
    }
  }

  async createMosqueDirectory(mosqueId) {
    try {
      const mosqueDirPath = path.join(this.baseStoragePath, mosqueId.toString());
      await fs.mkdir(mosqueDirPath, { recursive: true });
      return mosqueDirPath;
    } catch (error) {
      console.error('❌ Error creating mosque directory:', error);
      throw error;
    }
  }

  generateFileName(mosqueId, sessionId, sessionType = 'general') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substr(2, 6);
    return `${mosqueId}_${sessionType}_${timestamp}_${randomId}.wav`;
  }

  async saveAudioRecording(audioData) {
    try {
      const {
        mosqueId,
        mosqueName,
        sessionId,
        sessionType = 'general',
        provider = 'munsit',
        language = 'ar-SA',
        filePath,
        metadata = {}
      } = audioData;

      // Create mosque directory if it doesn't exist
      await this.createMosqueDirectory(mosqueId);

      // Generate filename if not provided
      const fileName = audioData.fileName || this.generateFileName(mosqueId, sessionId, sessionType);
      const fullFilePath = filePath || path.join(this.baseStoragePath, mosqueId.toString(), fileName);

      // Create audio recording record in database
      const recording = await AudioRecording.createRecording({
        mosqueId,
        mosqueName,
        sessionId,
        sessionType,
        fileName,
        filePath: fullFilePath,
        provider,
        language,
        format: 'wav',
        metadata: {
          ...metadata,
          createdAt: new Date(),
          source: 'mobile_app'
        }
      });

      console.log('✅ Audio recording saved to database:', recording.recordingId);
      return recording;

    } catch (error) {
      console.error('❌ Error saving audio recording:', error);
      throw error;
    }
  }

  async updateRecordingFile(recordingId, fileInfo) {
    try {
      const recording = await AudioRecording.findOne({ recordingId });
      if (!recording) {
        throw new Error(`Recording not found: ${recordingId}`);
      }

      // Update file information
      await recording.updateFileInfo({
        size: fileInfo.size,
        duration: fileInfo.duration
      });

      console.log('✅ Recording file info updated:', recordingId);
      return recording;

    } catch (error) {
      console.error('❌ Error updating recording file:', error);
      throw error;
    }
  }

  async updateRecordingTranscription(recordingId, transcriptionData) {
    try {
      const recording = await AudioRecording.findOne({ recordingId });
      if (!recording) {
        throw new Error(`Recording not found: ${recordingId}`);
      }

      // Update transcription
      await recording.updateTranscription(transcriptionData);

      console.log('✅ Recording transcription updated:', recordingId);
      return recording;

    } catch (error) {
      console.error('❌ Error updating recording transcription:', error);
      throw error;
    }
  }

  async getMosqueRecordings(mosqueId, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        sortBy = 'recordingStarted',
        sortOrder = -1,
        status,
        sessionType
      } = options;

      const query = { mosqueId };
      
      if (status) {
        query.status = status;
      }
      
      if (sessionType) {
        query.sessionType = sessionType;
      }

      const recordings = await AudioRecording
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip)
        .populate('mosqueId', 'name location')
        .lean();

      console.log(`✅ Retrieved ${recordings.length} recordings for mosque ${mosqueId}`);
      return recordings;

    } catch (error) {
      console.error('❌ Error getting mosque recordings:', error);
      throw error;
    }
  }

  async getRecordingFile(recordingId) {
    try {
      const recording = await AudioRecording.findOne({ recordingId });
      if (!recording) {
        throw new Error(`Recording not found: ${recordingId}`);
      }

      // Check if file exists
      const fileExists = await fs.access(recording.filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error(`Audio file not found: ${recording.filePath}`);
      }

      return {
        filePath: recording.filePath,
        fileName: recording.fileName,
        mimeType: this.getMimeType(recording.format),
        size: recording.fileSize
      };

    } catch (error) {
      console.error('❌ Error getting recording file:', error);
      throw error;
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'aac': 'audio/aac',
      'webm': 'audio/webm'
    };
    return mimeTypes[format] || 'audio/wav';
  }

  async deleteRecording(recordingId) {
    try {
      const recording = await AudioRecording.findOne({ recordingId });
      if (!recording) {
        throw new Error(`Recording not found: ${recordingId}`);
      }

      // Delete file from filesystem
      try {
        await fs.unlink(recording.filePath);
        console.log('✅ Audio file deleted:', recording.filePath);
      } catch (fileError) {
        console.warn('⚠️ Could not delete audio file:', fileError.message);
      }

      // Delete from database
      await AudioRecording.deleteOne({ recordingId });
      console.log('✅ Recording deleted from database:', recordingId);

      return true;

    } catch (error) {
      console.error('❌ Error deleting recording:', error);
      throw error;
    }
  }

  async getStorageStats(mosqueId) {
    try {
      const stats = await AudioRecording.aggregate([
        { $match: { mosqueId: mosqueId } },
        {
          $group: {
            _id: null,
            totalRecordings: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            totalDuration: { $sum: '$duration' },
            avgConfidence: { $avg: '$confidence' },
            statusCounts: {
              $push: '$status'
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalRecordings: 0,
        totalSize: 0,
        totalDuration: 0,
        avgConfidence: 0,
        statusCounts: []
      };

      // Count status occurrences
      const statusCount = {};
      result.statusCounts.forEach(status => {
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      result.statusBreakdown = statusCount;
      delete result.statusCounts;

      console.log('✅ Storage stats calculated for mosque:', mosqueId);
      return result;

    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      throw error;
    }
  }

  async cleanupOldRecordings(mosqueId, daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldRecordings = await AudioRecording.find({
        mosqueId,
        recordingStarted: { $lt: cutoffDate },
        status: { $in: ['completed', 'failed'] }
      });

      let deletedCount = 0;
      for (const recording of oldRecordings) {
        try {
          await this.deleteRecording(recording.recordingId);
          deletedCount++;
        } catch (error) {
          console.warn('⚠️ Could not delete old recording:', recording.recordingId, error.message);
        }
      }

      console.log(`✅ Cleaned up ${deletedCount} old recordings for mosque ${mosqueId}`);
      return deletedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old recordings:', error);
      throw error;
    }
  }
}

// Export singleton instance
const audioStorageService = new AudioStorageService();
module.exports = audioStorageService;
