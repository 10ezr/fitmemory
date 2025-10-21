#!/usr/bin/env node

require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const DatabaseService = require("@/services/database");
const {
  User,
  Workout,
  Message,
  Memory,
  GeminiResponse,
  AppConfig,
} = require("@/models");

async function createBackup() {
  try {
    console.log("🔄 Starting backup process...");

    // Connect to database
    await DatabaseService.connect();
    console.log("✅ Connected to database");

    // Fetch all data
    console.log("📊 Fetching data...");
    const [users, workouts, messages, memories, geminiResponses, appConfig] =
      await Promise.all([
        User.find({}).lean(),
        Workout.find({}).lean(),
        Message.find({}).lean(),
        Memory.find({}).lean(),
        GeminiResponse.find({}).lean(),
        AppConfig.find({}).lean(),
      ]);

    const totalRecords =
      users.length +
      workouts.length +
      messages.length +
      memories.length +
      geminiResponses.length +
      appConfig.length;
    console.log(`📋 Found ${totalRecords} total records`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Workouts: ${workouts.length}`);
    console.log(`   - Messages: ${messages.length}`);
    console.log(`   - Memories: ${memories.length}`);
    console.log(`   - Gemini Responses: ${geminiResponses.length}`);
    console.log(`   - App Config: ${appConfig.length}`);

    // Create backup data structure
    const backupData = {
      meta: {
        backedUpAt: new Date().toISOString(),
        version: "1.0.0",
        totalRecords,
        environment: process.env.NODE_ENV || "development",
      },
      users,
      workouts,
      messages,
      memories,
      geminiResponses,
      appConfig,
    };

    // Create backups directory
    const backupDir = path.join(__dirname, "@/backups");
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
      console.log("📁 Created backups directory");
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      backupDir,
      `fitmemory-backup-${timestamp}.json`
    );

    // Write backup file
    console.log("💾 Writing backup file...");
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    // Update last backup time in app config
    await AppConfig.findByIdAndUpdate(
      "singleton",
      { $set: { lastBackup: new Date() } },
      { upsert: true }
    );

    // Get file size for reporting
    const stats = await fs.stat(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log("✅ Backup completed successfully!");
    console.log(`📁 File: ${backupPath}`);
    console.log(`📏 Size: ${fileSizeMB} MB`);
    console.log(`📊 Records: ${totalRecords}`);
    console.log(`🕐 Timestamp: ${timestamp}`);

    // Clean up old backups (keep last 10)
    await cleanupOldBackups(backupDir, 10);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  } finally {
    await DatabaseService.disconnect();
    console.log("👋 Disconnected from database");
  }
}

async function cleanupOldBackups(backupDir, keepCount = 10) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(
        (file) => file.startsWith("fitmemory-backup-") && file.endsWith(".json")
      )
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
      }));

    if (backupFiles.length <= keepCount) {
      return; // No cleanup needed
    }

    // Sort by filename (which includes timestamp) and keep newest
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));
    const filesToDelete = backupFiles.slice(keepCount);

    if (filesToDelete.length > 0) {
      console.log(
        `🗑️  Cleaning up ${filesToDelete.length} old backup files...`
      );

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`   Deleted: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn("⚠️  Warning: Failed to cleanup old backups:", error.message);
  }
}

// Handle command line execution
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const showHelp = args.includes("--help") || args.includes("-h");

  if (showHelp) {
    console.log(`
FitMemory Backup Script

Usage: node scripts/backup.js [options]

Options:
  -h, --help    Show this help message

Environment Variables:
  MONGODB_URI   MongoDB connection string (required)
  NODE_ENV      Environment name (optional)

Examples:
  node scripts/backup.js
  npm run backup
  
The script will:
1. Connect to MongoDB
2. Export all collections to a timestamped JSON file
3. Save the file to the ./backups directory
4. Clean up old backup files (keeps last 10)
5. Update the lastBackup timestamp in app config
    `);
    process.exit(0);
  }

  // Run the backup
  createBackup();
}

module.exports = { createBackup, cleanupOldBackups };
