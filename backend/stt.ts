/**
 * Speech-to-Text wrapper for DevLens voice input.
 *
 * This module provides audio transcription using IBM Watson Speech-to-Text.
 * Accepts audio buffers from the browser (WebM/WAV) and returns transcribed text.
 */

import "dotenv/config";
import SpeechToTextV1 from "ibm-watson/speech-to-text/v1";
import { IamAuthenticator } from "ibm-watson/auth";

// Module-level state
let sttClient: SpeechToTextV1 | null = null;

/**
 * Ensures STT client is initialized. Idempotent - safe to call multiple times.
 *
 * @throws {Error} If STT_APIKEY or STT_URL are missing from environment
 */
function ensureClient(): void {
  if (sttClient) return; // Already initialized

  const apikey = process.env.STT_APIKEY;
  const url = process.env.STT_URL;

  if (!apikey || !url) {
    throw new Error("Missing STT_APIKEY or STT_URL in environment");
  }

  const authenticator = new IamAuthenticator({ apikey });
  sttClient = new SpeechToTextV1({
    authenticator,
    serviceUrl: url,
  });
}

/**
 * Detects audio format from buffer header.
 *
 * @param buffer - Audio buffer to inspect
 * @returns Content type string for Watson STT
 */
function detectAudioFormat(buffer: Buffer): string {
  // Check for WAV header (RIFF)
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "RIFF") {
    return "audio/wav";
  }

  // Check for WebM header (0x1A 0x45 0xDF 0xA3)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "audio/webm";
  }

  // Default to WebM (browser MediaRecorder default)
  return "audio/webm";
}

/**
 * Transcribes audio to text using IBM Watson Speech-to-Text.
 *
 * Accepts audio buffers in WebM or WAV format from browser MediaRecorder.
 * Uses the US English broadband model optimized for general audio.
 *
 * @param audioBuffer - Audio data as Buffer (WebM or WAV format)
 * @returns Transcribed text, or empty string if no speech detected
 * @throws {Error} If STT credentials are missing
 * @throws {Error} If STT API call fails (with context for 401/403 errors)
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  ensureClient(); // Lazy initialization

  // Auto-detect audio format
  const contentType = detectAudioFormat(audioBuffer);

  try {
    const response = await sttClient!.recognize({
      audio: audioBuffer,
      contentType,
      model: "en-US_BroadbandModel",
    });

    // Extract transcript from response
    const results = response.result.results;

    if (!results || results.length === 0) {
      // No speech detected (silence or noise)
      return "";
    }

    // Get the best alternative from the first result
    const transcript = results[0]?.alternatives?.[0]?.transcript || "";

    return transcript.trim();
  } catch (error: any) {
    // Provide helpful context for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `STT authentication failed: Check STT_APIKEY in .env (${error.message})`,
      );
    }

    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

// Made with Bob
