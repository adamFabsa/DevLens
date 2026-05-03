/**
 * Test script for the DevLens question pipeline.
 * 
 * This validates the entire cost-proof story:
 * 1. First call (cache miss) → Bob invocation with cost
 * 2. Second call (cache hit) → Zero cost from cache
 * 
 * This is the heart of the DevLens demo value proposition.
 */

import { initCache, deleteCacheEntry } from './cache';
import { extractIntent } from './nlu';
import { handleQuestion } from './questionFlow';

async function testQuestionFlow() {
  console.log('🧪 Testing question pipeline...\n');
  
  try {
    // Step 1: Initialize cache
    await initCache();
    
    const testInput = {
      question: 'What does the auth module do?',
      repoName: 'conduit'
    };
    
    // Step 2: Pre-clear any cached entry for this question
    console.log('🧹 Clearing any existing cache entry...');
    const intent = await extractIntent(testInput.question);
    const cacheKey = `${testInput.repoName}:${intent}`;
    try {
      await deleteCacheEntry(cacheKey);
      console.log(`✓ Cleared cache key: ${cacheKey}\n`);
    } catch (err) {
      // Entry doesn't exist, that's fine
      console.log(`✓ No existing cache entry to clear\n`);
    }
    
    // Step 3: First call (cache miss)
    console.log('📤 First call (expecting cache miss)...');
    const result1 = await handleQuestion(testInput);
    
    console.log(`✓ Answer received (${result1.answer.length} chars)`);
    console.log(`✓ Mode: ${result1.mode}`);
    console.log(`✓ Cost: ${result1.cost.toFixed(2)} Bobcoins`);
    console.log(`✓ From cache: ${result1.fromCache}`);
    console.log(`✓ Intent: ${result1.intent}`);
    console.log(`✓ Question ID: ${result1.questionId}`);
    
    // Validate cache miss
    if (result1.fromCache) {
      throw new Error('❌ Expected cache miss, got cache hit');
    }
    if (result1.cost === 0) {
      throw new Error('❌ Expected non-zero cost for cache miss');
    }
    
    console.log('\n📤 Second call (expecting cache hit)...');
    
    // Step 3: Second call (cache hit) - THE KEY DEMO MOMENT
    const result2 = await handleQuestion(testInput);
    
    console.log(`✓ Answer received (${result2.answer.length} chars)`);
    console.log(`✓ Mode: ${result2.mode}`);
    console.log(`✓ Cost: ${result2.cost.toFixed(2)} Bobcoins`);
    console.log(`✓ From cache: ${result2.fromCache}`);
    console.log(`✓ Question ID: ${result2.questionId}`);
    
    // Validate cache hit
    if (!result2.fromCache) {
      throw new Error('❌ Expected cache hit, got cache miss');
    }
    if (result2.cost !== 0.00) {
      throw new Error(`❌ Expected zero cost for cache hit, got ${result2.cost}`);
    }
    
    // Verify answers match
    if (result1.answer !== result2.answer) {
      throw new Error('❌ Cached answer does not match original');
    }
    
    // Verify modes match
    if (result1.mode !== result2.mode) {
      throw new Error('❌ Cached mode does not match original');
    }
    
    // Verify intents match
    if (result1.intent !== result2.intent) {
      throw new Error('❌ Cached intent does not match original');
    }
    
    // Verify question IDs are different (new ID generated each time)
    if (result1.questionId === result2.questionId) {
      throw new Error('❌ Question IDs should be unique per call');
    }
    
    // Step 4: Cleanup
    await deleteCacheEntry(cacheKey);
    console.log('\n🧹 Test entry cleaned up');
    
    console.log('\n✅ Question pipeline works, cache hit verified');
    console.log(`💰 Cost savings: ${result1.cost.toFixed(2)} Bobcoins on second call`);
    console.log(`📊 Cache efficiency: 100% cost reduction on repeat questions`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testQuestionFlow().catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});

// Made with Bob