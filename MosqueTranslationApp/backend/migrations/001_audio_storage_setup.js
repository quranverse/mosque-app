// Database Migration: Audio Storage Setup
// This migration ensures all audio-related collections and indexes are properly set up

const AudioRecording = require('../models/AudioRecording');
const AudioSession = require('../models/AudioSession');
const VoiceTranscription = require('../models/VoiceTranscription');
const TranslationResult = require('../models/TranslationResult');

async function up() {
  console.log('🔄 Running audio storage setup migration...');

  try {
    // Ensure AudioRecording collection and indexes
    await AudioRecording.createIndexes();
    console.log('✅ AudioRecording indexes created');

    // Ensure AudioSession collection and indexes
    await AudioSession.createIndexes();
    console.log('✅ AudioSession indexes created');

    // Ensure VoiceTranscription collection and indexes
    await VoiceTranscription.createIndexes();
    console.log('✅ VoiceTranscription indexes created');

    // Ensure TranslationResult collection and indexes
    await TranslationResult.createIndexes();
    console.log('✅ TranslationResult indexes created');

    // Create additional indexes for audio storage optimization
    await AudioRecording.collection.createIndex({ 
      mosqueId: 1, 
      createdAt: -1 
    }, { 
      name: 'mosque_date_idx',
      background: true 
    });

    await AudioRecording.collection.createIndex({ 
      sessionId: 1 
    }, { 
      name: 'session_idx',
      background: true 
    });

    await AudioRecording.collection.createIndex({ 
      status: 1,
      createdAt: -1 
    }, { 
      name: 'status_date_idx',
      background: true 
    });

    console.log('✅ Additional audio storage indexes created');

    // Ensure audio storage directory exists
    const fs = require('fs');
    const path = require('path');
    const audioDir = path.join(__dirname, '../audio-recordings');
    
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
      console.log('✅ Audio storage directory created');
    }

    console.log('✅ Audio storage setup migration completed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Audio storage setup migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back audio storage setup migration...');
  
  try {
    // Remove custom indexes (keep default ones)
    await AudioRecording.collection.dropIndex('mosque_date_idx').catch(() => {});
    await AudioRecording.collection.dropIndex('session_idx').catch(() => {});
    await AudioRecording.collection.dropIndex('status_date_idx').catch(() => {});
    
    console.log('✅ Audio storage setup migration rolled back');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
