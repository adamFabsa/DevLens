// Core data types for DevLens

export type Mode = 'Ask' | 'Code' | 'Plan';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Answer {
  id: string;
  question: string;
  answer: string;
  mode: Mode;
  cost: number;
  cached: boolean;
  timestamp: Date;
}

export interface CostEntry {
  questionNumber: number;
  questionPreview: string; // truncated to 40 chars
  mode: Mode;
  cost: number;
  cached: boolean;
}

export interface SessionStats {
  totalCost: number;
  singleModelEquivalent: number;
  percentSaved: number;
  lastCacheSavings: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AppState {
  messages: Answer[];
  sessionStats: SessionStats;
  checklistExpanded: boolean;
  checklistItems: ChecklistItem[];
  microphoneActive: boolean;
  inputValue: string;
}

// Made with Bob
