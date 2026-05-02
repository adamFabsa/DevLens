/**
 * API route for handling user questions through the DevLens pipeline.
 * 
 * This endpoint orchestrates cache initialization and question handling,
 * returning answers with cost tracking and cache status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleQuestion, QuestionInput } from '../../../backend/questionFlow';
import { initCache } from '../../../backend/cache';

// Module-level promise to ensure cache initializes only once
let cacheInitPromise: Promise<void> | null = null;

/**
 * Ensures cache is initialized before processing questions.
 * Uses a singleton promise pattern to prevent concurrent re-initialization.
 */
async function ensureCacheInitialized(): Promise<void> {
  if (!cacheInitPromise) {
    cacheInitPromise = initCache();
  }
  await cacheInitPromise;
}

/**
 * POST /api/ask
 * 
 * Request body:
 * {
 *   question: string;
 *   repoName: string;
 * }
 * 
 * Response:
 * {
 *   id: string;
 *   question: string;
 *   answer: string;
 *   mode: 'Ask' | 'Code' | 'Plan';
 *   cost: number;
 *   cached: boolean;
 *   timestamp: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { question, repoName } = body;
    
    // Validate input
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    if (!repoName || typeof repoName !== 'string') {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }
    
    // Ensure cache is initialized
    await ensureCacheInitialized();
    
    // Process question through pipeline
    const input: QuestionInput = {
      question: question.trim(),
      repoName
    };
    
    const result = await handleQuestion(input);
    
    // Map to response format
    const response = {
      id: result.questionId,
      question: input.question,
      answer: result.answer,
      mode: result.mode,
      cost: result.cost,
      cached: result.fromCache,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in /api/ask:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process question'
      },
      { status: 500 }
    );
  }
}

// Made with Bob