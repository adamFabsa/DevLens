/**
 * Speech-to-Text API endpoint for DevLens voice input.
 *
 * Accepts audio Blob from browser MediaRecorder, converts to Buffer,
 * and returns transcribed text using IBM Watson STT.
 */

import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/backend/stt";

export async function POST(request: NextRequest) {
  try {
    // Parse FormData containing audio Blob
    const formData = await request.formData();
    const audioBlob = formData.get("audio");

    if (!audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing or invalid audio data" },
        { status: 400 },
      );
    }

    // Convert Blob to Buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe using Watson STT
    const text = await transcribeAudio(buffer);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("STT API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 },
    );
  }
}

// Made with Bob
