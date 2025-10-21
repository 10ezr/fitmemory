import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import {
  User,
  Workout,
  Exercise,
  Message,
  Memory,
  GeminiResponse,
  Streak,
  AppConfig,
} from "@/models";

export async function POST() {
  try {
    await connectDatabase();

    console.log("Starting complete data wipe...");

    // Delete all records from all collections
    // Using deleteMany({}) to delete all documents in each collection
    const deletionResults = await Promise.all([
      User.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      Workout.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      Exercise.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      Message.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      Memory.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      GeminiResponse.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      Streak.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
      AppConfig.deleteMany({}).catch((err) => ({
        deletedCount: 0,
        error: err.message,
      })),
    ]);

    // Calculate total deleted records
    const totalDeleted = deletionResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );

    console.log(
      `Complete data wipe finished. Total records deleted: ${totalDeleted}`
    );

    // Log what was deleted and check for any errors
    const deletionSummary = {
      users: deletionResults[0].deletedCount,
      workouts: deletionResults[1].deletedCount,
      exercises: deletionResults[2].deletedCount,
      messages: deletionResults[3].deletedCount,
      memories: deletionResults[4].deletedCount,
      geminiResponses: deletionResults[5].deletedCount,
      streaks: deletionResults[6].deletedCount,
      appConfigs: deletionResults[7].deletedCount,
    };

    // Check for any errors in deletion
    const errors = deletionResults.filter((result) => result.error);
    if (errors.length > 0) {
      console.warn("Some collections had errors during deletion:", errors);
    }

    console.log("Deletion summary:", deletionSummary);

    return NextResponse.json({
      success: true,
      totalDeleted,
      deletionSummary,
      message:
        "All data has been permanently deleted. The app is now in a fresh state.",
    });
  } catch (error) {
    console.error("Error clearing all data:", error);
    return NextResponse.json(
      {
        error: "Failed to clear all data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
