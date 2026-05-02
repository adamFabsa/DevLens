/**
 * Text-to-Speech API endpoint for DevLens voice output.
 *
 * Accepts text (with markdown), strips formatting, and returns
 * MP3 audio stream using IBM Watson TTS.
 */

import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/backend/tts";

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body containing text
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 },
      );
    }

    // Synthesize speech using Watson TTS
    const audioBuffer = await synthesizeSpeech(text);

    // Return audio stream with proper content type
    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/mp3",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize speech" },
      { status: 500 },
    );
  }
}

// Made with Bob
