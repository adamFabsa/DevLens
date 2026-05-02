/**
 * Test script for Cloudant cache wrapper.
 * Validates connection, CRUD operations, and error handling.
 * 
 * Usage: npx tsx backend/test-cache.ts
 */

import { initCache, checkCache, storeCache, deleteCacheEntry, type CachedAnswer } from './cache';

async function runTests() {
  console.log('🧪 Testing Cloudant cache wrapper...\n');
  
  try {
    // Test 1: Initialize
    console.log('1. Initializing cache...');
    await initCache();
    console.log('   ✅ Cache initialized\n');
    
    // Test 2: Store a test entry
    console.log('2. Storing test entry...');
    const testKey = 'test-' + Date.now();
    const testData: CachedAnswer = {
      question: 'What is DevLens?',
      intent: 'project_overview',
      answer: 'DevLens is a codebase intelligence tool.',
      mode: 'Ask',
      cost: 0.05,
      repo: 'excalidraw',
      timestamp: Date.now(),
    };
    await storeCache(testKey, testData);
    console.log('   ✅ Test entry stored\n');
    
    // Test 3: Retrieve the entry
    console.log('3. Retrieving test entry...');
    const retrieved = await checkCache(testKey);
    if (!retrieved) {
      throw new Error('Failed to retrieve test entry');
    }
    if (retrieved.question !== testData.question) {
      throw new Error('Retrieved data does not match stored data');
    }
    console.log('   ✅ Test entry retrieved and verified\n');
    
    // Test 4: Cache miss
    console.log('4. Testing cache miss...');
    const missing = await checkCache('nonexistent-key-12345');
    if (missing !== null) {
      throw new Error('Expected null for cache miss');
    }
    console.log('   ✅ Cache miss handled correctly\n');
    
    // Test 5: Update existing entry
    console.log('5. Updating test entry...');
    testData.hitCount = 1;
    await storeCache(testKey, testData);
    const updated = await checkCache(testKey);
    if (!updated || updated.hitCount !== 1) {
      throw new Error('Failed to update entry');
    }
    console.log('   ✅ Entry updated successfully\n');
    
    // Test 6: Delete test entry and verify
    console.log('6. Cleaning up test entry...');
    await deleteCacheEntry(testKey);
    const deleted = await checkCache(testKey);
    if (deleted !== null) {
      throw new Error('Entry was not deleted');
    }
    console.log('   ✅ Test cleanup verified\n');
    
    console.log('✅ All tests passed! Cloudant connection works.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();

// Made with Bob
