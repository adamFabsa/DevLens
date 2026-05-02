/**
 * Test script for watsonx Orchestrate wrapper.
 * 
 * Usage: npx tsx backend/test-orchestrate.ts
 */

import { initOrchestrate, generateChecklist, ChecklistInput } from './orchestrate';

const testInput: ChecklistInput = {
  repoName: 'excalidraw',
  questionsAsked: [
    'How does the canvas rendering work?',
    'Where is the collaboration logic?',
    'What testing framework is used?',
    'How are elements stored and managed?',
    'What is the export functionality architecture?'
  ],
  topModes: ['Code', 'Ask', 'Code']
};

async function test() {
  console.log('=== DevLens Orchestrate Test ===\n');
  
  try {
    console.log('Initializing Orchestrate...');
    await initOrchestrate();
    
    console.log('\nGenerating checklist for:', testInput.repoName);
    console.log('Questions asked:', testInput.questionsAsked.length);
    console.log('Top modes:', testInput.topModes.join(', '));
    
    console.log('\nℹ️  Running mock. See orchestrate.ts header for upgrade path.\n');
    
    const startTime = Date.now();
    const result = await generateChecklist(testInput);
    const elapsed = Date.now() - startTime;
    
    console.log(`\n✅ Checklist generated in ${elapsed}ms\n`);
    console.log('=== RESULT ===\n');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== RAW TEXT VERSION ===\n');
    console.log(result.rawText);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();

// Made with Bob
