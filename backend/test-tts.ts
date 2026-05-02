/**
 * Test script for Text-to-Speech wrapper.
 *
 * Synthesizes a test phrase and saves the audio to /tmp/test-tts.mp3.
 * Verifies that the TTS wrapper correctly generates audio output.
 */

import "dotenv/config";
import { synthesizeSpeech } from "./tts";
import { writeFileSync } from "fs";

async function testTTS() {
  console.log("Testing Text-to-Speech wrapper...\n");

  const testText = "Hello from DevLens";

  try {
    const audioBuffer = await synthesizeSpeech(testText);

    const outputPath = "/tmp/test-tts.mp3";
    writeFileSync(outputPath, audioBuffer);

    console.log("✅ TTS call succeeded");
    console.log(`✅ Wrote test file: ${outputPath}`);
    console.log(`   Size: ${audioBuffer.length} bytes`);
    console.log("\nPlay with: afplay /tmp/test-tts.mp3 (macOS)");
  } catch (error: any) {
    console.error("❌ TTS test failed:", error.message);
    process.exit(1);
  }
}

testTTS();

// Made with Bob
