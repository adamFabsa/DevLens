/**
 * MOCK IMPLEMENTATION
 *
 * This wrapper simulates watsonx Orchestrate's checklist generation for the hackathon demo.
 * The deployed agent in Orchestrate (agent ID 81c465b5-5e16-40a0-8d8d-cc9e4dbb8a0e, eu-gb region)
 * is the architectural integration target, with system instructions for JSON-formatted onboarding
 * checklists.
 *
 * Real runtime invocation requires either the Python ADK or skills/flows abstraction (confirmed
 * by IBM mentor). Both are out of scope for hackathon timeline. The mock satisfies the
 * architectural integration requirement: the agent is built, deployed to Live, has system
 * instructions, and is documented here as the upgrade target.
 *
 * UPGRADE PATH to real Orchestrate (post-hackathon):
 * - Option A: rewrite this module in Python using the watsonx Orchestrate ADK
 * - Option B: wrap the agent in a skill/flow exposed as an HTTP endpoint, call that endpoint
 *   from this module
 * The function signature and the agent's system instructions remain unchanged either way.
 */

import 'dotenv/config';

/**
 * Input for checklist generation.
 * Represents the context from a DevLens Q&A session.
 */
export interface ChecklistInput {
  repoName: string;            // e.g. "excalidraw"
  questionsAsked: string[];    // Full list of user questions in this session
  topModes: ('Ask' | 'Code' | 'Plan')[];  // Modes used most this session
}

/**
 * Generated onboarding checklist result.
 * Contains structured recommendations for new team members.
 */
export interface ChecklistResult {
  modulesToExplore: string[];  // 3-5 areas of the codebase to read
  peopleToContact: string[];   // 2-4 mock teammate handles
  firstWeekTasks: string[];    // 4-6 suggested onboarding tasks
  rawText: string;             // Full text version for the UI to render
}

// Module-level state
let apikey: string;
let baseUrl: string;
let agentId: string;

/**
 * Initializes the Orchestrate client and validates environment variables.
 * Safe to call multiple times (idempotent).
 * 
 * @throws {Error} If required environment variables are missing
 */
export async function initOrchestrate(): Promise<void> {
  // Validate required environment variables
  apikey = process.env.ORCHESTRATE_APIKEY || '';
  baseUrl = process.env.ORCHESTRATE_URL || '';
  agentId = process.env.ORCHESTRATE_AGENT_ID || '';
  
  if (!apikey) {
    throw new Error('Missing ORCHESTRATE_APIKEY in environment');
  }
  
  if (!baseUrl) {
    throw new Error('Missing ORCHESTRATE_URL in environment');
  }
  
  if (!agentId) {
    throw new Error('Missing ORCHESTRATE_AGENT_ID in environment');
  }
  
  console.log('✅ Orchestrate initialized (mock mode)');
}

/**
 * Extracts meaningful keywords from questions, filtering out stop words.
 */
function extractKeywords(questions: string[]): string[] {
  const stopWords = new Set([
    'what', 'the', 'how', 'is', 'do', 'does', 'where', 'when', 'why',
    'can', 'should', 'would', 'a', 'an', 'are', 'was', 'were', 'been',
    'being', 'have', 'has', 'had', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
    'my', 'your', 'his', 'her', 'its', 'our', 'for', 'to', 'in', 'on',
    'at', 'by', 'with', 'from', 'of', 'and', 'or', 'but'
  ]);
  
  const wordCounts = new Map<string, number>();
  
  // Extract and count words
  questions.forEach(q => {
    const words = q.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
    
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });
  
  // Sort by frequency and return top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 5);
}

/**
 * Generates a personalized onboarding checklist using a deterministic mock.
 * 
 * @param input - Session context (repo name, questions, modes used)
 * @returns Structured checklist with modules, contacts, and tasks
 * @throws {Error} If Orchestrate not initialized
 */
export async function generateChecklist(input: ChecklistInput): Promise<ChecklistResult> {
  if (!apikey || !baseUrl || !agentId) {
    throw new Error('Orchestrate not initialized. Call initOrchestrate() first.');
  }
  
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Extract keywords from questions
  const keywords = extractKeywords(input.questionsAsked);
  const topKeyword = keywords[0] || 'core';
  const secondKeyword = keywords[1] || 'components';
  
  // Generate modules to explore based on keywords
  const modulesToExplore: string[] = [];
  if (keywords.length > 0) {
    modulesToExplore.push(`src/${keywords[0]}/`);
  }
  if (keywords.length > 1) {
    const capitalized = keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1);
    modulesToExplore.push(`src/components/${capitalized}.tsx`);
  }
  if (keywords.length > 2) {
    modulesToExplore.push(`src/${keywords[2]}/`);
  }
  
  // Add generic modules if we don't have enough
  if (modulesToExplore.length < 3) {
    modulesToExplore.push('tests/', 'docs/architecture.md');
  }
  
  // Select people to contact based on keywords and modes
  const teamRotation = [
    '@alice-frontend',
    '@bob-platform',
    '@carol-data',
    '@dave-infra',
    '@eve-mobile'
  ];
  
  const peopleToContact: string[] = [];
  const hasCodeMode = input.topModes.includes('Code');
  const hasPlanMode = input.topModes.includes('Plan');
  
  if (hasCodeMode) {
    peopleToContact.push(teamRotation[0]); // alice-frontend
  }
  if (hasPlanMode) {
    peopleToContact.push(teamRotation[1]); // bob-platform
  }
  if (peopleToContact.length < 2) {
    peopleToContact.push(teamRotation[2]); // carol-data
  }
  
  // Generate first week tasks
  const firstWeekTasks = [
    `Set up the ${input.repoName} development environment locally`,
    `Read the ${topKeyword} module thoroughly`,
    `Pair with ${peopleToContact[0]} on ${secondKeyword}`,
    'Run the test suite and review existing coverage',
    `Read recent PRs related to ${topKeyword}`,
    `Understand the ${input.repoName} architecture overview`
  ];
  
  // Build raw text version
  const rawText = `Onboarding Checklist for ${input.repoName}

Modules to Explore:
${modulesToExplore.map(m => `- ${m}`).join('\n')}

People to Contact:
${peopleToContact.map(p => `- ${p}`).join('\n')}

First Week Tasks:
${firstWeekTasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  
  return {
    modulesToExplore,
    peopleToContact,
    firstWeekTasks,
    rawText
  };
}

// Made with Bob