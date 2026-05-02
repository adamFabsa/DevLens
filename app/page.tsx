'use client';

import { useState } from 'react';
import { Send, Mic, MicOff, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AppState, CostEntry, Mode } from './types';
import { MOCK_MESSAGES, MOCK_CHECKLIST_ITEMS } from './data/mock';

export default function Home() {
  const [state, setState] = useState<AppState>({
    messages: MOCK_MESSAGES,
    sessionStats: {
      totalCost: 0.21,
      singleModelEquivalent: 2.10,
      percentSaved: 90,
      lastCacheSavings: 0.04
    },
    checklistExpanded: false,
    checklistItems: MOCK_CHECKLIST_ITEMS,
    microphoneActive: false,
    inputValue: ''
  });

  const handleInputChange = (value: string) => {
    setState(prev => ({ ...prev, inputValue: value }));
  };

  const handleSend = () => {
    if (!state.inputValue.trim()) return;
    console.log('Send:', state.inputValue);
    setState(prev => ({ ...prev, inputValue: '' }));
  };

  const handleMicToggle = () => {
    setState(prev => ({ ...prev, microphoneActive: !prev.microphoneActive }));
  };

  const handleChecklistToggle = () => {
    setState(prev => ({ ...prev, checklistExpanded: !prev.checklistExpanded }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Derive cost entries from messages
  const costEntries: CostEntry[] = state.messages.map((msg, idx) => ({
    questionNumber: idx + 1,
    questionPreview: msg.question.slice(0, 40) + (msg.question.length > 40 ? '...' : ''),
    mode: msg.mode,
    cost: msg.cost,
    cached: msg.cached
  }));

  const getModeBadgeColor = (mode: Mode): string => {
    switch (mode) {
      case 'Ask': return 'bg-[var(--gray-70)]';
      case 'Code': return 'bg-[var(--blue-60)]';
      case 'Plan': return 'bg-[var(--purple-60)]';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--gray-100)] text-white font-sans overflow-hidden">
      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-[55%_45%] gap-0 overflow-hidden">
        {/* Chat Region - Left 55% */}
        <div className="flex flex-col border-r border-[var(--gray-70)] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--gray-70)]">
            <h1 className="text-2xl font-semibold">DevLens</h1>
            <p className="text-sm text-[var(--gray-60)] mt-1">Analyzing: excalidraw</p>
          </div>

          {/* Chat Thread - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {state.messages.map((answer, idx) => (
              <div key={answer.id} className="space-y-3">
                {/* User Question Bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-[var(--gray-80)] rounded px-4 py-3 text-sm">
                    {answer.question}
                  </div>
                </div>

                {/* Assistant Answer Card */}
                <div className="bg-[var(--gray-90)] border border-[var(--gray-70)] rounded-sm p-4 space-y-3">
                  {/* Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${getModeBadgeColor(answer.mode)} text-white text-xs px-2 py-1 rounded-sm font-medium`}>
                      {answer.mode}
                    </span>
                    {answer.cached && (
                      <span className="bg-[var(--green-40)] text-[var(--gray-100)] text-xs px-2 py-1 rounded-sm font-semibold flex items-center gap-1">
                        <Zap size={12} />
                        Cached — 0.00 Bc
                      </span>
                    )}
                  </div>

                  {/* Answer Text with Markdown */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => (
                          <pre className="bg-[var(--gray-100)] border border-[var(--gray-70)] rounded-sm p-3 overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-[var(--gray-80)] px-1.5 py-0.5 rounded text-sm font-mono">
                              {children}
                            </code>
                          ) : (
                            <code className="font-mono text-sm">{children}</code>
                          );
                        }
                      }}
                    >
                      {answer.answer}
                    </ReactMarkdown>
                  </div>

                  {/* Cost Display */}
                  <div className="text-xs text-[var(--gray-60)] font-mono pt-2 border-t border-[var(--gray-80)]">
                    Cost: {answer.cost.toFixed(2)} Bc
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="px-6 py-4 border-t border-[var(--gray-70)]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={state.inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about excalidraw..."
                className="flex-1 bg-[var(--gray-90)] border border-[var(--gray-70)] rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-[var(--blue-60)] transition-colors"
              />
              <button
                onClick={handleMicToggle}
                className={`w-12 h-12 flex items-center justify-center rounded-sm transition-colors ${
                  state.microphoneActive 
                    ? 'bg-[var(--green-40)] text-[var(--gray-100)]' 
                    : 'bg-[var(--gray-90)] border border-[var(--gray-70)] text-white hover:bg-[var(--gray-80)]'
                }`}
                aria-label="Toggle microphone"
              >
                {state.microphoneActive ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!state.inputValue.trim()}
                className="w-12 h-12 flex items-center justify-center bg-[var(--blue-60)] hover:bg-[var(--blue-70)] disabled:bg-[var(--gray-80)] disabled:cursor-not-allowed rounded-sm transition-colors"
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Cost Region - Right 45% */}
        <div className="flex flex-col overflow-hidden">
          {/* Cost Summary */}
          <div className="px-6 py-6 border-b border-[var(--gray-70)] space-y-3">
            <div>
              <div className="text-3xl font-semibold font-mono text-white">
                {state.sessionStats.totalCost.toFixed(2)} Bc
              </div>
              <div className="text-xs text-[var(--gray-60)] mt-1">Session cost</div>
            </div>
            <div className="text-sm text-[var(--gray-60)]">
              Single-model equivalent: <span className="font-mono">{state.sessionStats.singleModelEquivalent.toFixed(2)} Bc</span>
            </div>
            <div className="text-2xl font-semibold text-[var(--green-40)]">
              Saved: {state.sessionStats.percentSaved}%
            </div>
          </div>

          {/* Cost Table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--gray-80)] text-[var(--gray-10)] text-xs font-semibold">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Question</th>
                  <th className="px-3 py-2 text-left">Mode</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-center">Cache</th>
                </tr>
              </thead>
              <tbody>
                {costEntries.map((entry) => (
                  <tr key={entry.questionNumber} className="border-b border-[var(--gray-70)] hover:bg-[var(--gray-90)]">
                    <td className="px-3 py-3 font-mono text-[var(--gray-60)]">{entry.questionNumber}</td>
                    <td className="px-3 py-3 text-[var(--gray-10)]">{entry.questionPreview}</td>
                    <td className="px-3 py-3">
                      <span className={`${getModeBadgeColor(entry.mode)} text-white text-xs px-2 py-0.5 rounded-sm`}>
                        {entry.mode}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--gray-10)]">
                      {entry.cost.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {entry.cached && (
                        <Zap size={16} className="inline text-[var(--green-40)]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Last Cache Savings */}
          <div className="px-6 py-3 border-t border-[var(--gray-70)] text-xs text-[var(--gray-60)]">
            Last cache hit saved <span className="font-mono text-[var(--green-40)]">{state.sessionStats.lastCacheSavings.toFixed(2)} Bc</span>
          </div>
        </div>
      </div>

      {/* Checklist Drawer - Bottom */}
      <div className="border-t border-[var(--gray-70)] bg-[var(--gray-90)] transition-all duration-300 ease-in-out">
        {/* Drawer Header */}
        <button
          onClick={handleChecklistToggle}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-[var(--gray-80)] transition-colors"
        >
          <span className="text-sm font-medium">
            Onboarding checklist (generated at session end)
          </span>
          {state.checklistExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>

        {/* Drawer Content */}
        {state.checklistExpanded && (
          <div className="px-6 py-4 border-t border-[var(--gray-70)] max-h-64 overflow-y-auto">
            <ul className="space-y-2">
              {state.checklistItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {
                      setState(prev => ({
                        ...prev,
                        checklistItems: prev.checklistItems.map(i =>
                          i.id === item.id ? { ...i, completed: !i.completed } : i
                        )
                      }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded-sm border-[var(--gray-70)] bg-[var(--gray-80)] checked:bg-[var(--blue-60)] focus:ring-2 focus:ring-[var(--blue-60)] focus:ring-offset-0"
                  />
                  <span className={item.completed ? 'line-through text-[var(--gray-60)]' : 'text-[var(--gray-10)]'}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
