/**
 * API route for generating onboarding checklists from session data.
 * 
 * This endpoint uses watsonx Orchestrate (mock implementation) to create
 * personalized onboarding recommendations based on questions asked during
 * a DevLens session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateChecklist, ChecklistInput, initOrchestrate } from '../../../backend/orchestrate';

// Module-level promise to ensure Orchestrate initializes only once
let orchestrateInitPromise: Promise<void> | null = null;

/**
 * Ensures Orchestrate is initialized before generating checklists.
 * Uses a singleton promise pattern to prevent concurrent re-initialization.
 */
async function ensureOrchestrateInitialized(): Promise<void> {
  if (!orchestrateInitPromise) {
    orchestrateInitPromise = initOrchestrate();
  }
  await orchestrateInitPromise;
}

/**
 * POST /api/checklist
 * 
 * Request body:
 * {
 *   repoName: string;
 *   questionsAsked: string[];
 *   topModes: ('Ask' | 'Code' | 'Plan')[];
 * }
 * 
 * Response:
 * {
 *   items: Array<{
 *     id: string;
 *     text: string;
 *     completed: boolean;
 *   }>;
 *   rawText: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { repoName, questionsAsked, topModes } = body;
    
    // Validate input
    if (!repoName || typeof repoName !== 'string') {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(questionsAsked) || questionsAsked.length === 0) {
      return NextResponse.json(
        { error: 'Questions asked array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(topModes)) {
      return NextResponse.json(
        { error: 'Top modes array is required' },
        { status: 400 }
      );
    }
    
    // Ensure Orchestrate is initialized
    await ensureOrchestrateInitialized();
    
    // Generate checklist
    const input: ChecklistInput = {
      repoName,
      questionsAsked,
      topModes
    };
    
    const result = await generateChecklist(input);
    
    // Map to UI format - combine all checklist sections into single array
    const items = [
      // Modules to explore
      ...result.modulesToExplore.map((module, idx) => ({
        id: `module-${idx}`,
        text: `Read ${module} to understand the codebase structure`,
        completed: false
      })),
      // People to contact
      ...result.peopleToContact.map((person, idx) => ({
        id: `person-${idx}`,
        text: `Talk to ${person} about their area of expertise`,
        completed: false
      })),
      // First week tasks
      ...result.firstWeekTasks.map((task, idx) => ({
        id: `task-${idx}`,
        text: task,
        completed: false
      }))
    ];
    
    const response = {
      items,
      rawText: result.rawText
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in /api/checklist:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate checklist'
      },
      { status: 500 }
    );
  }
}

// Made with Bob