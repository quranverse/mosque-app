// Audio Recording Service for Mosque Translation App
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const AudioRecording = require('../models/AudioRecording');
const AudioSession = require('../models/AudioSession');

class AudioRecordingService {
  constructor() {
    this.activeRecordings = new Map(); // sessionId -> recording info
    this.storageBasePath = process.env.AUDIO_STORAGE_PATH || './audio-recordings';
    this.maxConcurrentRecordings = process.env.MAX_CONCURRENT_RECORDINGS || 10;
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  async ensureStorageDirectory() {
    try {
      await fs.promises.mkdir(this.storageBasePath, { recursive: true });
      console.log(`📁 Audio storage directory ready: ${this.storageBasePath}`);
    } catch (error) {
      console.error('❌ Failed to create audio storage directory:', error);
      throw error;
    }
  }

  async startRecording(sessionId, mosqueId, options = {}) {
    try {
      // Check if already recording
      if (this.activeRecordings.has(sessionId)) {
        throw new Error(`Recording already active for session ${sessionId}`);
      }

      // Check concurrent recording limit
      if (this.activeRecordings.size >= this.maxConcurrentRecordings) {
        throw new Error('Maximum concurrent recordings reached');
      }

      // Generate recording paths
      const recordingPath = this.generateRecordingPath(sessionId, mosqueId);
      const fileName = path.basename(recordingPath);
      
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(recordingPath), { recursive: true });

      // Create database record
      const recordingId = `rec_${sessionId}_${Date.now()}`;
      const audioRecording = new AudioRecording({
        recordingId,
        sessionId,
        audioSessionId: options.audioSessionId,
        filePath: recordingPath,
        fileName,
        format: options.format || 'mp3',
        quality: options.quality || 'standard',
        bitRate: options.bitRate || 128000,
        sampleRate: options.sampleRate || 48000,
        channels: options.channels || 1,
        status: 'recording',
        metadata: {
          title: options.title || `Recording for session ${sessionId}`,
          description: options.description,
          sessionType: options.sessionType || 'general',
          language: options.language || 'ar'
        },
        processing: {
          startedAt: new Date()
        }
      });

      await audioRecording.save();

      // Start FFmpeg recording process
      const ffmpegProcess = ffmpeg()
        .input('pipe:0')
        .inputFormat('webm')
        .audioCodec('libmp3lame')
        .audioBitrate(`${options.bitRate || 128}k`)
        .audioChannels(options.channels || 1)
        .audioFrequency(options.sampleRate || 48000)
        .format('mp3')
        .output(recordingPath)
        .on('start', (commandLine) => {
          console.log(`🎵 Recording started for session ${sessionId}`);
          console.log(`📝 FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          // Update recording progress
          this.updateRecordingProgress(sessionId, progress);
        })
        .on('error', (error) => {
          console.error(`❌ Recording error for session ${sessionId}:`, error);
          this.handleRecordingError(sessionId, error);
        })
        .on('end', () => {
          console.log(`✅ Recording completed for session ${sessionId}`);
          this.handleRecordingComplete(sessionId);
        });

      // Start the recording
      ffmpegProcess.run();

      // Store recording info
      const recordingInfo = {
        sessionId,
        mosqueId,
        recordingId,
        audioRecording,
        ffmpegProcess,
        filePath: recordingPath,
        startTime: new Date(),
        bytesWritten: 0,
        isActive: true
      };

      this.activeRecordings.set(sessionId, recordingInfo);

      console.log(`🎵 Audio recording started: ${recordingPath}`);
      return {
        recordingId,
        filePath: recordingPath,
        status: 'recording'
      };

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async writeAudioChunk(sessionId, audioChunk) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (!recording || !recording.isActive) {
        console.warn(`⚠️ No active recording for session ${sessionId}`);
        return false;
      }

      if (recording.ffmpegProcess && recording.ffmpegProcess.stdin) {
        recording.ffmpegProcess.stdin.write(audioChunk);
        recording.bytesWritten += audioChunk.length;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error writing audio chunk for session ${sessionId}:`, error);
      return false;
    }
  }

  async stopRecording(sessionId) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (!recording) {
        console.warn(`⚠️ No active recording found for session ${sessionId}`);
        return null;
      }

      // End FFmpeg input stream
      if (recording.ffmpegProcess && recording.ffmpegProcess.stdin) {
        recording.ffmpegProcess.stdin.end();
      }

      // Mark as inactive
      recording.isActive = false;

      // Calculate duration
      const duration = Math.round((new Date() - recording.startTime) / 1000);

      // Update database record
      await this.finalizeRecording(recording, duration);

      // Remove from active recordings
      this.activeRecordings.delete(sessionId);

      console.log(`✅ Recording stopped for session ${sessionId}`);
      return {
        recordingId: recording.recordingId,
        filePath: recording.filePath,
        duration,
        status: 'completed'
      };

    } catch (error) {
      console.error(`❌ Error stopping recording for session ${sessionId}:`, error);
      throw error;
    }
  }

  async pauseRecording(sessionId) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (!recording) {
        throw new Error(`No active recording found for session ${sessionId}`);
      }

      // Pause FFmpeg process (implementation depends on requirements)
      recording.isActive = false;
      
      // Update database
      await AudioRecording.findOneAndUpdate(
        { recordingId: recording.recordingId },
        { status: 'paused' }
      );

      console.log(`⏸️ Recording paused for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error pausing recording for session ${sessionId}:`, error);
      throw error;
    }
  }

  async resumeRecording(sessionId) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (!recording) {
        throw new Error(`No recording found for session ${sessionId}`);
      }

      recording.isActive = true;
      
      // Update database
      await AudioRecording.findOneAndUpdate(
        { recordingId: recording.recordingId },
        { status: 'recording' }
      );

      console.log(`▶️ Recording resumed for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error resuming recording for session ${sessionId}:`, error);
      throw error;
    }
  }

  generateRecordingPath(sessionId, mosqueId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = date.getTime();
    
    return path.join(
      this.storageBasePath,
      mosqueId.toString(),
      year.toString(),
      month,
      day,
      `${sessionId}_${timestamp}.mp3`
    );
  }

  async updateRecordingProgress(sessionId, progress) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (recording && recording.audioRecording) {
        // Update progress in database if needed
        // This could include duration, file size estimates, etc.
      }
    } catch (error) {
      console.error('Error updating recording progress:', error);
    }
  }

  async handleRecordingError(sessionId, error) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (recording) {
        // Update database record with error
        await AudioRecording.findOneAndUpdate(
          { recordingId: recording.recordingId },
          { 
            status: 'failed',
            'processing.errors': [error.message]
          }
        );

        // Clean up
        this.activeRecordings.delete(sessionId);
      }
    } catch (updateError) {
      console.error('Error handling recording error:', updateError);
    }
  }

  async handleRecordingComplete(sessionId) {
    try {
      const recording = this.activeRecordings.get(sessionId);
      if (recording) {
        // File should be complete, get file stats
        const stats = await fs.promises.stat(recording.filePath);
        const duration = Math.round((new Date() - recording.startTime) / 1000);

        await this.finalizeRecording(recording, duration, stats.size);
      }
    } catch (error) {
      console.error('Error handling recording completion:', error);
    }
  }

  async finalizeRecording(recording, duration, fileSize = null) {
    try {
      // Get file size if not provided
      if (!fileSize) {
        try {
          const stats = await fs.promises.stat(recording.filePath);
          fileSize = stats.size;
        } catch (error) {
          console.warn('Could not get file size:', error);
          fileSize = 0;
        }
      }

      // Update database record
      await AudioRecording.findOneAndUpdate(
        { recordingId: recording.recordingId },
        {
          status: 'completed',
          fileSizeBytes: fileSize,
          durationSeconds: duration,
          'processing.completedAt': new Date(),
          'processing.processingTimeMs': new Date() - recording.startTime
        }
      );

      console.log(`📊 Recording finalized: ${recording.recordingId}, Duration: ${duration}s, Size: ${fileSize} bytes`);
    } catch (error) {
      console.error('Error finalizing recording:', error);
    }
  }

  // Utility methods
  getActiveRecordings() {
    return Array.from(this.activeRecordings.keys());
  }

  getRecordingInfo(sessionId) {
    return this.activeRecordings.get(sessionId);
  }

  async getRecordingsBySession(sessionId) {
    return await AudioRecording.find({ sessionId }).sort({ createdAt: -1 });
  }

  async getStorageStats() {
    const stats = await AudioRecording.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSizeBytes' },
          totalDuration: { $sum: '$durationSeconds' },
          avgFileSize: { $avg: '$fileSizeBytes' }
        }
      }
    ]);

    return stats[0] || {
      totalFiles: 0,
      totalSize: 0,
      totalDuration: 0,
      avgFileSize: 0
    };
  }

  // Write audio chunk to file (for real-time streaming)
  async writeAudioChunk(sessionId, audioChunk, metadata = {}) {
    try {
      const recordingInfo = this.activeRecordings.get(sessionId);
      if (!recordingInfo) {
        console.warn(`No active recording for session ${sessionId}`);
        return;
      }

      // Convert audio chunk array to buffer if needed
      const chunkBuffer = Array.isArray(audioChunk) ? Buffer.from(audioChunk) : audioChunk;

      // Append chunk to the recording file
      await fs.promises.appendFile(recordingInfo.filePath, chunkBuffer);

      // Update recording info
      recordingInfo.totalChunks = (recordingInfo.totalChunks || 0) + 1;
      recordingInfo.totalBytes = (recordingInfo.totalBytes || 0) + chunkBuffer.length;
      recordingInfo.lastChunkTime = Date.now();

      console.log(`📁 Audio chunk written for session ${sessionId}: ${chunkBuffer.length} bytes`);

    } catch (error) {
      console.error('Error writing audio chunk:', error);
      throw error;
    }
  }

  // Save complete audio file to backend storage
  async saveCompleteAudioFile(sessionId, audioFileData) {
    try {
      const { audioBuffer, mosqueId, provider, format, fileName, duration, deviceInfo } = audioFileData;

      // Generate file path
      const mosqueDir = path.join(this.storageBasePath, `mosque_${mosqueId}`);
      await fs.promises.mkdir(mosqueDir, { recursive: true });

      const filePath = path.join(mosqueDir, fileName);

      // Write audio buffer to file
      await fs.promises.writeFile(filePath, audioBuffer);

      // Create database record
      const recordingId = `rec_${sessionId}_${Date.now()}`;
      const audioRecording = new AudioRecording({
        recordingId,
        sessionId,
        mosqueId,
        fileName,
        filePath,
        fileSizeBytes: audioBuffer.length,
        format: format || 'm4a',
        durationSeconds: Math.floor((duration || 0) / 1000),
        provider: provider || 'unknown',
        status: 'completed',
        metadata: {
          deviceInfo,
          uploadedAt: new Date(),
          originalDuration: duration
        }
      });

      await audioRecording.save();

      console.log(`✅ Complete audio file saved: ${recordingId}`);
      console.log(`📁 File location: ${filePath}`);
      console.log(`📊 File size: ${audioBuffer.length} bytes`);

      return {
        recordingId,
        fileName,
        filePath,
        size: audioBuffer.length
      };

    } catch (error) {
      console.error('Error saving complete audio file:', error);
      throw error;
    }
  }
}

// Export singleton instance
const audioRecordingService = new AudioRecordingService();
module.exports = audioRecordingService;
