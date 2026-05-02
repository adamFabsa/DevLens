import { Answer, ChecklistItem } from '../types';

export const MOCK_MESSAGES: Answer[] = [
  {
    id: '1',
    question: 'What does the auth module do?',
    answer: `[Mode: Ask] [Reason: Simple lookup of function definition]

The auth module handles user authentication and session management in Excalidraw. It provides OAuth integration with Google and GitHub, manages JWT tokens for API requests, and maintains user session state across page reloads.

Key functions:
- \`authenticateUser()\` - Validates credentials
- \`refreshToken()\` - Renews expired sessions
- \`logout()\` - Clears session data`,
    mode: 'Ask',
    cost: 0.04,
    cached: false,
    timestamp: new Date('2026-05-01T14:30:00')
  },
  {
    id: '2',
    question: 'How do the canvas and toolbar communicate?',
    answer: `[Mode: Code] [Reason: Requires tracing dependencies across multiple files]

The canvas and toolbar communicate through a shared Redux store and event emitters:

1. **State Management**: Both subscribe to \`appState\` in the Redux store
2. **Event Flow**: Toolbar dispatches actions → Reducer updates state → Canvas re-renders
3. **Direct Refs**: Toolbar holds a ref to canvas for immediate operations like zoom

Key files:
- \`src/components/App.tsx\` - Connects both components
- \`src/actions/actionCanvas.ts\` - Canvas-specific actions
- \`src/store.ts\` - Central state management`,
    mode: 'Code',
    cost: 0.12,
    cached: false,
    timestamp: new Date('2026-05-01T14:32:00')
  },
  {
    id: '3',
    question: 'Where is the main drawing logic?',
    answer: `[Mode: Ask] [Reason: Simple lookup of function definition]

The main drawing logic is located in \`src/renderer/renderScene.ts\`. This file contains the \`renderScene()\` function which:

- Iterates through all elements in the scene
- Applies transformations (zoom, pan, rotation)
- Renders each element type (rectangle, ellipse, arrow, text)
- Handles selection highlights and bounding boxes

The rendering pipeline uses Canvas 2D API with optimizations for large scenes.`,
    mode: 'Ask',
    cost: 0.05,
    cached: false,
    timestamp: new Date('2026-05-01T14:35:00')
  },
  {
    id: '4',
    question: 'What does the auth module do?',
    answer: `[Mode: Ask] [Reason: Duplicate question]

See answer in message #1.`,
    mode: 'Ask',
    cost: 0.00,
    cached: true,
    timestamp: new Date('2026-05-01T14:37:00')
  }
];

export const MOCK_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: '1',
    text: 'Read src/components/App.tsx to understand component hierarchy',
    completed: false
  },
  {
    id: '2',
    text: 'Review src/renderer/renderScene.ts for drawing implementation',
    completed: false
  },
  {
    id: '3',
    text: 'Talk to @alice about state management patterns',
    completed: false
  },
  {
    id: '4',
    text: 'Check src/actions/ directory for available Redux actions',
    completed: false
  },
  {
    id: '5',
    text: 'Explore src/element/ for element type definitions',
    completed: false
  },
  {
    id: '6',
    text: 'Review authentication flow in src/auth/ module',
    completed: false
  },
  {
    id: '7',
    text: 'Test canvas interactions in development environment',
    completed: false
  }
];

// Made with Bob
