/**
 * Question pipeline orchestration for DevLens.
 *
 * Calls OpenRouter LLM with real file content from /demo-repo/src/app/ to generate
 * codebase-grounded answers. The Bobcoin cost is simulated based on mode classification
 * (the LLM call cost is real but tiny, ~$0.00003 per question).
 *
 * Pipeline: validate → extract intent → check cache → (miss: find files → read files →
 * invoke LLM + store) → return. The cache hit path is the demo's key value proposition:
 * zero-cost answers for previously-asked questions, even when phrased differently.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
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
 * Finds relevant source files based on NLU intent keywords.
 * Scans demo-repo/src/app/routes/ recursively for matching files.
 *
 * @param intent - NLU intent string (e.g., "auth:module:user")
 * @returns Array of up to 3 file paths relative to project root
 */
function findRelevantFiles(intent: string): string[] {
  // Parse intent into keywords, handling various formats
  const keywords = intent
    ? intent.toLowerCase().split(/[:_\-\s]+/).flatMap(part => {
        // Also split camelCase/PascalCase boundaries
        return part.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/);
      }).filter(k => k.length > 2)  // skip very short keywords
    : ['main', 'app'];
  
  // Recursively scan demo-repo/src/app/routes/
  const scanDir = 'demo-repo/src/app/routes';
  const allFiles: string[] = [];
  
  function scan(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          allFiles.push(fullPath);
        }
      }
    } catch (err) {
      // Silent fail on read errors
    }
  }
  
  scan(scanDir);
  
  // Score files by keyword matches in path
  const scored = allFiles.map(filepath => {
    // Extract path basename without extension (e.g. "auth.service.ts" → "auth.service")
    const basename = filepath.split('/').pop()?.replace(/\.[^/.]+$/, '').toLowerCase() || '';
    const dirname = filepath.split('/').slice(-2, -1)[0]?.toLowerCase() || '';
    
    // Get all word parts from basename and dirname
    // (split on dots, hyphens, etc — turns "auth.service" into ["auth", "service"])
    const fileWords = [
      ...basename.split(/[\.\-_]/),
      ...dirname.split(/[\.\-_]/)
    ].filter(w => w.length > 2);
    
    // Score: how many file words appear as substrings within ANY keyword
    // OR how many keywords contain ANY file word as substring
    // This handles "authmodule" matching against "auth" (filename word)
    const score = fileWords.reduce((sum, fileWord) => {
      const matches = keywords.some(kw =>
        kw.includes(fileWord) || fileWord.includes(kw)
      );
      return sum + (matches ? 1 : 0);
    }, 0);
    
    return { filepath, score };
  });
  
  // Sort by score (desc), then by path depth (asc for root files)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.filepath.split('/').length - b.filepath.split('/').length;
  });
  
  // Return top 3, or fallback to main.ts + routes.ts if no matches
  const top3 = scored.slice(0, 3).map(s => s.filepath);
  if (top3.length === 0 || scored[0].score === 0) {
    return [
      'demo-repo/src/main.ts',
      'demo-repo/src/app/routes/routes.ts'
    ].filter(p => fs.existsSync(p));
  }
  
  return top3;
}

/**
 * Reads file content with truncation for LLM context limits.
 *
 * @param filepath - Path relative to project root
 * @returns Up to 1500 characters of file content, or empty string on error
 */
function readFileContent(filepath: string): string {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return content.slice(0, 1500);
  } catch (err) {
    return '';
  }
}

/**
 * Calls OpenRouter LLM with file context to generate codebase-grounded answers.
 *
 * @param question - User's question
 * @param fileContents - Array of {path, content} objects
 * @returns {answer, mode} where mode is extracted from [Mode: X] prefix
 * @throws {Error} If OPENROUTER_API_KEY or OPENROUTER_URL missing
 */
async function callLLM(
  question: string,
  fileContents: { path: string; content: string }[]
): Promise<{ answer: string; mode: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiUrl = process.env.OPENROUTER_URL;
  
  if (!apiKey || !apiUrl) {
    throw new Error('Missing OPENROUTER_API_KEY or OPENROUTER_URL');
  }
  
  // Build system prompt
  const systemPrompt = `You are DevLens, a code analysis assistant for the Conduit codebase (a NestJS blog API). When given file content and a question, respond with:

[Mode: Ask|Code|Plan] [Reason: brief explanation]

Then provide a 2-4 sentence answer that references specific code from the files shown.

Mode rules:
- Ask: simple lookup ('what does X do?')
- Code: structural analysis ('how does X connect to Y?')
- Plan: architectural ('how should I add Z?')

Keep answers under 150 words. Always cite which file(s) informed your answer.`;
  
  // Build user prompt with file contents
  let userPrompt = `Question: ${question}\n\nRelevant files:\n`;
  for (const file of fileContents) {
    userPrompt += `\n--- ${file.path} ---\n${file.content}\n`;
  }
  userPrompt += '\nAnswer the question based on these files.';
  
  // Call OpenRouter API
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 350
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }
  
  const data = await response.json();
  const answer = data.choices[0].message.content;
  
  // Extract mode from [Mode: X] prefix
  const modeMatch = answer.match(/\[Mode:\s*(Ask|Code|Plan)\]/i);
  const mode = modeMatch ? modeMatch[1] : 'Ask';
  
  return { answer, mode };
}

/**
 * Invokes LLM with real file content to generate codebase-grounded answers.
 * Falls back to mock answers if LLM is unavailable.
 *
 * @param question - The user's question text
 * @param intent - NLU-extracted intent for file selection
 * @returns Bob response with answer, mode, and cost
 */
async function invokeBob(question: string, intent: string): Promise<BobResponse> {
  // Add realistic delay BEFORE LLM call
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  try {
    // Step 1: Find relevant files
    const filePaths = findRelevantFiles(intent);
    console.log(`📂 Files read for "${question}": ${filePaths.join(', ')}`);
    
    // Step 2: Read file contents
    const fileContents = filePaths
      .map(path => ({ path, content: readFileContent(path) }))
      .filter(f => f.content.length > 0);
    
    // Step 3: Call LLM
    const { answer, mode } = await callLLM(question, fileContents);
    
    // Step 4: Calculate simulated cost based on mode
    const baseCosts = { Ask: 0.04, Code: 0.10, Plan: 0.08 };
    const variances = { Ask: 0.02, Code: 0.05, Plan: 0.04 };
    const cost = baseCosts[mode as 'Ask' | 'Code' | 'Plan'] + Math.random() * variances[mode as 'Ask' | 'Code' | 'Plan'];
    
    return { answer, mode: mode as 'Ask' | 'Code' | 'Plan', cost };
    
  } catch (error: any) {
    // Fallback to mock answer if LLM fails
    console.warn('⚠️  LLM call failed, using fallback:', error.message);
    
    // Use keyword-based mode classification as fallback
    const lowerQuestion = question.toLowerCase();
    let mode: 'Ask' | 'Code' | 'Plan' = 'Ask';
    
    if (lowerQuestion.includes('should') || lowerQuestion.includes('structure') || lowerQuestion.includes('approach')) {
      mode = 'Plan';
    } else if (lowerQuestion.includes('how') || lowerQuestion.includes('why') || lowerQuestion.includes('connect')) {
      mode = 'Code';
    }
    
    const baseCosts = { Ask: 0.04, Code: 0.10, Plan: 0.08 };
    const variances = { Ask: 0.02, Code: 0.05, Plan: 0.04 };
    const cost = baseCosts[mode] + Math.random() * variances[mode];
    
    const answer = `[Mode: ${mode}] [Reason: Fallback answer due to LLM unavailability]\n\nUnable to analyze codebase files at this time. Please try again later.`;
    
    return { answer, mode, cost };
  }
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
  const bobResult = await invokeBob(input.question, intent);
  
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