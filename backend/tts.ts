/**
 * Text-to-Speech wrapper for DevLens voice output.
 *
 * This module provides audio synthesis using IBM Watson Text-to-Speech.
 * Accepts text (with markdown formatting) and returns audio buffers for playback.
 */

import "dotenv/config";
import TextToSpeechV1 from "ibm-watson/text-to-speech/v1";
import { IamAuthenticator } from "ibm-watson/auth";

// Module-level state
let ttsClient: TextToSpeechV1 | null = null;

/**
 * Ensures TTS client is initialized. Idempotent - safe to call multiple times.
 *
 * @throws {Error} If TTS_APIKEY or TTS_URL are missing from environment
 */
function ensureClient(): void {
  if (ttsClient) return; // Already initialized

  const apikey = process.env.TTS_APIKEY;
  const url = process.env.TTS_URL;

  if (!apikey || !url) {
    throw new Error("Missing TTS_APIKEY or TTS_URL in environment");
  }

  const authenticator = new IamAuthenticator({ apikey });
  ttsClient = new TextToSpeechV1({
    authenticator,
    serviceUrl: url,
  });
}

/**
 * Strips markdown formatting from text for natural speech synthesis.
 *
 * Removes code blocks, inline code, bold, italic, links, headers, and list markers
 * while preserving the actual text content.
 *
 * @param text - Text with markdown formatting
 * @returns Plain text suitable for speech synthesis
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .trim();
}

/**
 * Synthesizes text to speech using IBM Watson Text-to-Speech.
 *
 * Accepts text with markdown formatting, strips the markdown, and returns
 * an MP3 audio buffer ready for playback in the browser.
 *
 * @param text - Text to synthesize (markdown will be stripped)
 * @returns Audio buffer in MP3 format
 * @throws {Error} If TTS credentials are missing
 * @throws {Error} If TTS API call fails (with context for 401/403 errors)
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  ensureClient(); // Lazy initialization

  // Strip markdown formatting before synthesis
  const cleanText = stripMarkdown(text);

  try {
    const response = await ttsClient!.synthesize({
      text: cleanText,
      accept: "audio/mp3",
      voice: "en-US_AllisonV3Voice",
    });

    // Convert ReadableStream to Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.result) {
      chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    // Provide helpful context for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `TTS authentication failed: Check TTS_APIKEY in .env (${error.message})`,
      );
    }

    throw new Error(`Failed to synthesize speech: ${error.message}`);
  }
}

// Made with Bob
