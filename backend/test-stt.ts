/**
 * Test script for Speech-to-Text wrapper.
 *
 * Generates 1 second of silence as a WAV file and tests the transcribeAudio function.
 * Expected result: empty string or whitespace (no speech detected in silence).
 */

import "dotenv/config";
import { transcribeAudio } from "./stt";

async function testSTT() {
  console.log("Testing Speech-to-Text wrapper...\n");

  // Generate 1 second of silence (WAV format)
  // WAV header (44 bytes) + 1 second of 16-bit mono at 16kHz = 32000 bytes
  const wavHeader = Buffer.from([
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    0x24,
    0x7d,
    0x00,
    0x00, // File size - 8
    0x57,
    0x41,
    0x56,
    0x45, // "WAVE"
    0x66,
    0x6d,
    0x74,
    0x20, // "fmt "
    0x10,
    0x00,
    0x00,
    0x00, // Subchunk1Size (16)
    0x01,
    0x00, // AudioFormat (1 = PCM)
    0x01,
    0x00, // NumChannels (1 = mono)
    0x80,
    0x3e,
    0x00,
    0x00, // SampleRate (16000)
    0x00,
    0x7d,
    0x00,
    0x00, // ByteRate
    0x02,
    0x00, // BlockAlign
    0x10,
    0x00, // BitsPerSample (16)
    0x64,
    0x61,
    0x74,
    0x61, // "data"
    0x00,
    0x7d,
    0x00,
    0x00, // Subchunk2Size
  ]);

  const silenceData = Buffer.alloc(32000, 0); // 1 second of silence
  const audioBuffer = Buffer.concat([wavHeader, silenceData]);

  try {
    const result = await transcribeAudio(audioBuffer);
    console.log("✅ STT call succeeded");
    console.log(`Transcription result: "${result}"`);
    console.log("(Empty or whitespace is expected for silence)");
  } catch (error: any) {
    console.error("❌ STT test failed:", error.message);
    process.exit(1);
  }
}

testSTT();

// Made with Bob
