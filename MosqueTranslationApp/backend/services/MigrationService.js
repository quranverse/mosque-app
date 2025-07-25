// Migration Service for Automatic Database Updates
const fs = require('fs');
const path = require('path');

class MigrationService {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.migrationCollection = 'migrations';
  }

  // Get database connection
  getDatabase() {
    const mongoose = require('mongoose');
    return mongoose.connection.db;
  }

  // Get list of migration files
  getMigrationFiles() {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true });
        return [];
      }

      return fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort();
    } catch (error) {
      console.error('Error reading migration files:', error);
      return [];
    }
  }

  // Get applied migrations from database
  async getAppliedMigrations() {
    try {
      const db = this.getDatabase();
      const collection = db.collection(this.migrationCollection);
      
      const applied = await collection.find({}).toArray();
      return applied.map(m => m.name);
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return [];
    }
  }

  // Mark migration as applied
  async markMigrationApplied(migrationName) {
    try {
      const db = this.getDatabase();
      const collection = db.collection(this.migrationCollection);
      
      await collection.insertOne({
        name: migrationName,
        appliedAt: new Date()
      });
    } catch (error) {
      console.error('Error marking migration as applied:', error);
    }
  }

  // Run pending migrations
  async runPendingMigrations() {
    try {
      console.log('🔄 Checking for pending database migrations...');

      const migrationFiles = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();

      const pendingMigrations = migrationFiles.filter(file => 
        !appliedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations found');
        return { success: true, applied: 0 };
      }

      console.log(`📊 Found ${pendingMigrations.length} pending migrations`);

      let appliedCount = 0;
      for (const migrationFile of pendingMigrations) {
        try {
          console.log(`🔄 Running migration: ${migrationFile}`);
          
          const migrationPath = path.join(this.migrationsPath, migrationFile);
          const migration = require(migrationPath);
          
          if (typeof migration.up === 'function') {
            await migration.up();
            await this.markMigrationApplied(migrationFile);
            appliedCount++;
            console.log(`✅ Migration completed: ${migrationFile}`);
          } else {
            console.warn(`⚠️ Migration ${migrationFile} has no 'up' function`);
          }
        } catch (error) {
          console.error(`❌ Migration failed: ${migrationFile}`, error);
          throw error;
        }
      }

      console.log(`✅ Applied ${appliedCount} migrations successfully`);
      return { success: true, applied: appliedCount };

    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  // Auto-run migrations on startup
  async autoRunMigrations() {
    try {
      // Wait for database connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.log('⏳ Waiting for database connection...');
        await new Promise(resolve => {
          mongoose.connection.once('connected', resolve);
        });
      }

      await this.runPendingMigrations();
      return { success: true };

    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const migrationService = new MigrationService();
module.exports = migrationService;
