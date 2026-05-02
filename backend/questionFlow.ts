/**
 * Question pipeline orchestration for DevLens.
 * 
 * This is the heart of DevLens — the function that orchestrates cache + NLU + Bob
 * invocation + Cloudant storage to produce an answer with cost data. Every question
 * flows through: validate → extract intent → check cache → (miss: invoke Bob + store) → return.
 * 
 * The cache hit path is the demo's key value proposition: zero-cost answers for
 * previously-asked questions, even when phrased differently (semantic intent matching).
 */

import 'dotenv/config';
import { checkCache, storeCache, CachedAnswer } from './cache';
import { extractIntent } from './nlu';

/**
 * Input for question handling.
 * Represents a user's question about a specific repository.
 */
export interface QuestionInput {
  question: string;       // Raw user question text
  repoName: string;       // Demo repo name, e.g. "excalidraw"
}

/**
 * Result of question handling with cost tracking.
 * Aligns with UI Answer type for seamless integration.
 */
export interface QuestionResult {
  answer: string;         // The answer text
  mode: 'Ask' | 'Code' | 'Plan';  // Which Bob mode was used
  cost: number;           // Bobcoins cost (0 for cache hit)
  fromCache: boolean;     // True if this was a cache hit
  intent: string;         // The NLU-extracted intent (cache key basis)
  questionId: string;     // Unique ID for this Q&A pair
}

/**
 * Internal response structure from Bob invocation.
 */
interface BobResponse {
  answer: string;
  mode: 'Ask' | 'Code' | 'Plan';
  cost: number;
}

/**
 * MOCK IMPLEMENTATION
 * 
 * This function simulates Bob IDE invocation for the hackathon demo.
 * Real Bob calls happen in the IDE during development; bob_sessions exports
 * prove real usage. The mock enables end-to-end pipeline testing without
 * requiring a Bob server.
 * 
 * UPGRADE PATH (post-hackathon):
 * - Option A: Bob Shell CLI subprocess (if Bob exposes CLI interface)
 * - Option B: Parse Bob session history files in real-time
 * - Option C: Bob HTTP API (if/when available)
 * 
 * @param question - The user's question text
 * @returns Mock Bob response with answer, mode, and cost
 */
async function invokeBob(question: string): Promise<BobResponse> {
  // Simulate Bob processing time
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const lowerQuestion = question.toLowerCase();
  
  // Mode classification based on .bob/rules/cost-aware-answering.md
  // Check Plan keywords FIRST (most specific), then Code, then Ask
  let mode: 'Ask' | 'Code' | 'Plan';
  let baseCost: number;
  
  // Plan mode: architectural questions
  if (
    lowerQuestion.includes('should') ||
    lowerQuestion.includes('structure') ||
    lowerQuestion.includes('approach') ||
    lowerQuestion.includes('design') ||
    lowerQuestion.includes('best way') ||
    lowerQuestion.includes('pattern')
  ) {
    mode = 'Plan';
    baseCost = 0.08;
  }
  // Code mode: structural analysis
  else if (
    lowerQuestion.includes('how') ||
    lowerQuestion.includes('why') ||
    lowerQuestion.includes('trace') ||
    lowerQuestion.includes('connect') ||
    lowerQuestion.includes('communicate') ||
    lowerQuestion.includes('flow') ||
    lowerQuestion.includes('dependency') ||
    lowerQuestion.includes('call') ||
    lowerQuestion.includes('import')
  ) {
    mode = 'Code';
    baseCost = 0.10;
  }
  // Ask mode: simple lookups (default)
  else {
    mode = 'Ask';
    baseCost = 0.04;
  }
  
  // Add realistic cost variance
  const costVariance = mode === 'Ask' ? 0.02 : mode === 'Code' ? 0.05 : 0.04;
  const cost = baseCost + Math.random() * costVariance;
  
  // Extract keywords for answer generation
  const stopWords = new Set([
    'what', 'the', 'how', 'is', 'do', 'does', 'where', 'when', 'why',
    'can', 'should', 'would', 'a', 'an', 'are', 'was', 'were', 'been',
    'being', 'have', 'has', 'had', 'this', 'that', 'these', 'those'
  ]);
  
  const keywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 3);
  
  const keyword1 = keywords[0] || 'component';
  const keyword2 = keywords[1] || 'module';
  const keyword3 = keywords[2] || 'system';
  
  // Generate mode-appropriate answer
  let answerText: string;
  
  if (mode === 'Ask') {
    answerText = `The \`${keyword1}\` module handles ${keyword2} functionality in the codebase. It provides core ${keyword3} operations and is used throughout the application for ${keyword1}-related tasks. Key exports include initialization functions and utility helpers.`;
  } else if (mode === 'Code') {
    answerText = `The data flow from ${keyword1} to ${keyword2} works through several layers. First, ${keyword1} components communicate with ${keyword2} services via event handlers. The ${keyword3} layer then processes these interactions, maintaining state consistency. Dependencies are managed through the central ${keyword1} registry.`;
  } else {
    answerText = `For structuring ${keyword1} functionality, consider using the ${keyword2} pattern. This approach provides clear separation of concerns and makes ${keyword3} management more maintainable. Key architectural decisions should prioritize ${keyword1} scalability and ${keyword2} testability.`;
  }
  
  // Format with mode declaration prefix (matching cost-aware-answering.md format)
  const modeReasons = {
    Ask: 'Simple lookup of module definition',
    Code: 'Requires tracing dependencies across components',
    Plan: 'Architectural decision needs design discussion'
  };
  
  const answer = `[Mode: ${mode}] [Reason: ${modeReasons[mode]}]\n\n${answerText}`;
  
  return { answer, mode, cost };
}

/**
 * Generates a unique question ID.
 * Format: q_{timestamp}_{random} for uniqueness at hackathon scale.
 * 
 * @returns Unique question identifier
 */
function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles a user question through the complete DevLens pipeline.
 * 
 * Pipeline steps:
 * 1. Validate input
 * 2. Extract semantic intent via NLU
 * 3. Check cache with repo:intent key
 * 4. On cache hit: return immediately with zero cost
 * 5. On cache miss: invoke Bob, store result, return with actual cost
 * 
 * @param input - Question and repository context
 * @returns Question result with answer, mode, cost, and cache status
 * @throws {Error} If question is empty
 * @throws {Error} If NLU extraction fails (propagated)
 * @throws {Error} If cache operations fail (propagated)
 */
export async function handleQuestion(input: QuestionInput): Promise<QuestionResult> {
  // Step 1: Validate input
  if (!input.question || input.question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }
  
  // Step 2: Extract semantic intent
  const intent = await extractIntent(input.question);
  
  // Step 3: Compute cache key
  const cacheKey = `${input.repoName}:${intent}`;
  
  // Step 4: Check cache
  const cached = await checkCache(cacheKey);
  
  // Step 5a: Cache hit path (zero cost)
  if (cached) {
    return {
      answer: cached.answer,
      mode: cached.mode,
      cost: 0.00,
      fromCache: true,
      intent,
      questionId: generateQuestionId()
    };
  }
  
  // Step 5b: Cache miss path (invoke Bob and store)
  const bobResult = await invokeBob(input.question);
  
  // Store in cache for future hits
  const cacheData: CachedAnswer = {
    question: input.question,
    intent,
    answer: bobResult.answer,
    mode: bobResult.mode,
    cost: bobResult.cost,
    repo: input.repoName,
    timestamp: Date.now()
  };
  
  await storeCache(cacheKey, cacheData);
  
  // Return result with actual cost
  return {
    answer: bobResult.answer,
    mode: bobResult.mode,
    cost: bobResult.cost,
    fromCache: false,
    intent,
    questionId: generateQuestionId()
  };
}

// Made with Bob