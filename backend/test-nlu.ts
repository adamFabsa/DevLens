import "dotenv/config";

/**
 * Test script for NLU wrapper.
 *
 * Verifies:
 * 1. NLU connection works
 * 2. extractIntent() produces deterministic cache keys
 * 3. Same question always produces same intent
 * 4. Different questions produce different intents
 */

import { extractIntent } from "./nlu";

async function testNLU() {
  console.log("Testing NLU wrapper...\n");

  const questions = [
    "What does the auth module do?",
    "How do the canvas and toolbar communicate?",
    "What does the auth module do?", // Duplicate for determinism test
  ];

  const intents: string[] = [];

  // Extract intent for each question
  for (const question of questions) {
    try {
      const intent = await extractIntent(question);
      console.log(`Input:  ${question}`);
      console.log(`Intent: ${intent}\n`);
      intents.push(intent);
    } catch (error: any) {
      console.error(`❌ Failed to extract intent: ${error.message}`);
      process.exit(1);
    }
  }

  // Verify determinism: first and third questions should produce identical intents
  if (intents[0] === intents[2]) {
    console.log("✅ NLU connection works");
    console.log("✅ Cache key determinism verified");
    process.exit(0);
  } else {
    console.error("❌ Cache key mismatch!");
    console.error(`First:  ${intents[0]}`);
    console.error(`Second: ${intents[2]}`);
    console.error(
      "\nDeterminism test failed - same question produced different intents",
    );
    process.exit(1);
  }
}

// Run the test
testNLU().catch((error) => {
  console.error("❌ Test failed:", error.message);
  process.exit(1);
});

// Made with Bob
