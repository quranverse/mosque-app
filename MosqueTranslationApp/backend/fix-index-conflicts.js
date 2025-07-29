#!/usr/bin/env node

// Script to fix MongoDB index conflicts
// This script will clean up conflicting indexes and ensure proper index setup

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const AudioRecording = require('./models/AudioRecording');

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mosque_translation_app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
}

async function listIndexes(collection, collectionName) {
  try {
    const indexes = await collection.indexes();
    console.log(`\n📋 Current indexes for ${collectionName}:`);
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    return indexes;
  } catch (error) {
    console.error(`❌ Failed to list indexes for ${collectionName}:`, error);
    return [];
  }
}

async function dropConflictingIndexes() {
  console.log('🔧 Checking for conflicting indexes...');
  
  try {
    const collection = AudioRecording.collection;
    const indexes = await listIndexes(collection, 'AudioRecording');
    
    // Look for problematic indexes
    const problematicIndexes = indexes.filter(index => {
      // Find indexes that might conflict with our migration
      return (
        index.name === 'sessionId_1' || // Single sessionId index
        index.name === 'session_idx' ||  // Our custom sessionId index
        (index.name.includes('sessionId') && index.name !== 'sessionId_1_createdAt_-1')
      );
    });
    
    if (problematicIndexes.length === 0) {
      console.log('✅ No conflicting indexes found');
      return true;
    }
    
    console.log(`\n🔍 Found ${problematicIndexes.length} potentially conflicting index(es):`);
    problematicIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop conflicting indexes
    for (const index of problematicIndexes) {
      try {
        await collection.dropIndex(index.name);
        console.log(`✅ Dropped conflicting index: ${index.name}`);
      } catch (error) {
        if (error.code === 27) { // IndexNotFound
          console.log(`ℹ️  Index already dropped: ${index.name}`);
        } else {
          console.error(`❌ Failed to drop index ${index.name}:`, error.message);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to drop conflicting indexes:', error);
    return false;
  }
}

async function recreateProperIndexes() {
  console.log('\n🔧 Recreating proper indexes...');
  
  try {
    // Let the model create its own indexes
    await AudioRecording.createIndexes();
    console.log('✅ AudioRecording model indexes created');
    
    // Create additional optimized indexes (safely)
    const collection = AudioRecording.collection;
    
    // Mosque + date index for efficient queries
    try {
      await collection.createIndex({ 
        mosqueId: 1, 
        createdAt: -1 
      }, { 
        name: 'mosque_date_idx',
        background: true 
      });
      console.log('✅ Created mosque_date_idx');
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log('ℹ️  mosque_date_idx already exists (skipping)');
      } else {
        console.error('❌ Failed to create mosque_date_idx:', error.message);
      }
    }
    
    // Status + date index (only if not already created by model)
    const indexes = await collection.indexes();
    const hasStatusDateIndex = indexes.some(index => 
      index.name === 'status_date_idx' || 
      (index.key.status === 1 && index.key.createdAt === -1)
    );
    
    if (!hasStatusDateIndex) {
      try {
        await collection.createIndex({ 
          status: 1,
          createdAt: -1 
        }, { 
          name: 'status_date_idx',
          background: true 
        });
        console.log('✅ Created status_date_idx');
      } catch (error) {
        if (error.code === 85 || error.code === 86) {
          console.log('ℹ️  status_date_idx already exists (skipping)');
        } else {
          console.error('❌ Failed to create status_date_idx:', error.message);
        }
      }
    } else {
      console.log('ℹ️  status_date_idx already exists (skipping)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to recreate indexes:', error);
    return false;
  }
}

async function verifyIndexes() {
  console.log('\n🔍 Verifying final index setup...');
  
  try {
    const collection = AudioRecording.collection;
    await listIndexes(collection, 'AudioRecording');
    
    console.log('\n✅ Index verification completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to verify indexes:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 MongoDB Index Conflict Fixer\n');
  console.log('This script will fix index conflicts in the AudioRecording collection.\n');
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    // Step 1: List current indexes
    await listIndexes(AudioRecording.collection, 'AudioRecording');
    
    // Step 2: Drop conflicting indexes
    const droppedConflicts = await dropConflictingIndexes();
    if (!droppedConflicts) {
      console.error('❌ Failed to resolve index conflicts');
      process.exit(1);
    }
    
    // Step 3: Recreate proper indexes
    const recreated = await recreateProperIndexes();
    if (!recreated) {
      console.error('❌ Failed to recreate indexes');
      process.exit(1);
    }
    
    // Step 4: Verify final setup
    await verifyIndexes();
    
    console.log('\n🎉 Index conflicts resolved successfully!');
    console.log('You can now run your migrations without conflicts.');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
