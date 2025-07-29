// Database Migration: Audio Storage Setup
// This migration ensures all audio-related collections and indexes are properly set up

const AudioRecording = require('../models/AudioRecording');
const AudioSession = require('../models/AudioSession');
const VoiceTranscription = require('../models/VoiceTranscription');
const TranslationResult = require('../models/TranslationResult');

// Helper function to safely create indexes (handles conflicts)
async function createIndexSafely(collection, indexSpec, options = {}) {
  try {
    await collection.createIndex(indexSpec, options);
    console.log(`✅ Index created: ${options.name || JSON.stringify(indexSpec)}`);
  } catch (error) {
    if (error.code === 85) { // IndexOptionsConflict
      console.log(`ℹ️  Index already exists (skipping): ${options.name || JSON.stringify(indexSpec)}`);
    } else if (error.code === 86) { // IndexKeySpecsConflict
      console.log(`ℹ️  Similar index already exists (skipping): ${options.name || JSON.stringify(indexSpec)}`);
    } else {
      console.error(`❌ Failed to create index ${options.name || JSON.stringify(indexSpec)}:`, error.message);
      // Don't throw - continue with other indexes
    }
  }
}

// Helper function to check if an index exists
async function indexExists(collection, indexName) {
  try {
    const indexes = await collection.indexes();
    return indexes.some(index => index.name === indexName);
  } catch (error) {
    console.error('Error checking index existence:', error);
    return false;
  }
}

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

    // Create additional indexes for audio storage optimization (with conflict handling)
    await createIndexSafely(AudioRecording.collection, {
      mosqueId: 1,
      createdAt: -1
    }, {
      name: 'mosque_date_idx',
      background: true
    });

    // Note: sessionId index is already created by the model as part of compound index
    // Skip creating separate sessionId index to avoid conflicts

    await createIndexSafely(AudioRecording.collection, {
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
    await dropIndexSafely(AudioRecording.collection, 'mosque_date_idx');
    await dropIndexSafely(AudioRecording.collection, 'status_date_idx');
    // Note: session_idx was not created in this migration, so no need to drop it

    console.log('✅ Audio storage setup migration rolled back');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration rollback failed:', error);
    throw error;
  }
}

// Helper function to safely drop indexes
async function dropIndexSafely(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
    console.log(`✅ Index dropped: ${indexName}`);
  } catch (error) {
    if (error.code === 27) { // IndexNotFound
      console.log(`ℹ️  Index not found (already dropped): ${indexName}`);
    } else {
      console.error(`❌ Failed to drop index ${indexName}:`, error.message);
    }
  }
}

module.exports = { up, down };
