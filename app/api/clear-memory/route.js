import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";

export async function POST(request) {
  try {
    await connectDatabase();

    const memoryService = new MemoryService();
    const deletedCount = await memoryService.clearLongTermMemory();

    return NextResponse.json({
      message: "Long-term memory cleared",
      deletedCount,
    });
  } catch (error) {
    console.error("Error clearing memory:", error);
    return NextResponse.json(
      { error: "Failed to clear memory" },
      { status: 500 }
    );
  }
}
