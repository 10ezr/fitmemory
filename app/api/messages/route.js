import { NextResponse } from "next/server";
import connectDatabase from "../../../lib/database";
import { Message } from "../../../models";

export async function GET(request) {
  try {
    await connectDatabase();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = parseInt(searchParams.get("skip")) || 0;

    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      total: await Message.countDocuments(),
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    // Fallback: return empty list when DB is not available so UI can operate
    return NextResponse.json({ messages: [], total: 0 });
  }
}
