"use client";

import { useState, useRef } from "react";
import {
  Send,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Zap,
  Volume2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppState, CostEntry, Mode } from "./types";

// Demo repository constant
const DEMO_REPO = "excalidraw";

export default function Home() {
  const [state, setState] = useState<AppState>({
    messages: [],
    sessionStats: {
      totalCost: 0,
      singleModelEquivalent: 0,
      percentSaved: 0,
      lastCacheSavings: 0,
    },
    checklistExpanded: false,
    checklistItems: [],
    microphoneActive: false,
    inputValue: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MediaRecorder state for voice input
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleInputChange = (value: string) => {
    setState((prev) => ({ ...prev, inputValue: value }));
  };

  const handleSend = async () => {
    if (!state.inputValue.trim() || isLoading) return;

    const question = state.inputValue.trim();
    setError(null);
    setState((prev) => ({ ...prev, inputValue: "" }));
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          repoName: DEMO_REPO,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get answer");
      }

      const result = await response.json();

      // Append to messages
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: result.id,
            question: result.question,
            answer: result.answer,
            mode: result.mode,
            cost: result.cost,
            cached: result.cached,
            timestamp: new Date(result.timestamp),
          },
        ],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicToggle = async () => {
    if (state.microphoneActive) {
      // Stop recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      setState((prev) => ({ ...prev, microphoneActive: false }));
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          // Stop all tracks to release microphone
          stream.getTracks().forEach((track) => track.stop());

          // Send to STT API
          try {
            const formData = new FormData();
            formData.append("audio", audioBlob);

            const response = await fetch("/api/stt", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const result = await response.json();
              // Only populate input if we got text (silent failure for empty)
              if (result.text && result.text.trim()) {
                setState((prev) => ({
                  ...prev,
                  inputValue: result.text.trim(),
                }));
              }
            }
            // Silent failure - no error message for STT failures
          } catch (err) {
            // Silent failure - no error message
            console.error("STT error:", err);
          }
        };

        mediaRecorder.start();
        setState((prev) => ({ ...prev, microphoneActive: true }));
      } catch (err) {
        // Silent failure for permission denial - don't toggle mic button
        console.error("Microphone permission denied:", err);
      }
    }
  };

  const handleSpeakAnswer = async (text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Clean up URL after playback
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };

        audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
      // Silent failure - no error message for TTS failures
    }
  };

  const handleChecklistToggle = () => {
    setState((prev) => ({
      ...prev,
      checklistExpanded: !prev.checklistExpanded,
    }));
  };

  const handleEndSession = async () => {
    if (state.messages.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Extract questions and modes
      const questionsAsked = state.messages.map((m) => m.question);
      const modeCount = state.messages.reduce(
        (acc, m) => {
          acc[m.mode] = (acc[m.mode] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topModes = Object.entries(modeCount)
        .sort((a, b) => b[1] - a[1])
        .map(([mode]) => mode as "Ask" | "Code" | "Plan")
        .slice(0, 3);

      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: DEMO_REPO,
          questionsAsked,
          topModes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate checklist");
      }

      const result = await response.json();

      setState((prev) => ({
        ...prev,
        checklistItems: result.items,
        checklistExpanded: true, // Auto-expand on generation
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate checklist",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dynamic cost calculations
  const totalCost = state.messages.reduce((sum, msg) => sum + msg.cost, 0);
  const singleModelEquivalent = state.messages.length * 0.3;
  const percentSaved =
    singleModelEquivalent > 0
      ? Math.round(
          ((singleModelEquivalent - totalCost) / singleModelEquivalent) * 100,
        )
      : 0;
  const lastCacheSavings =
    state.messages.length > 0 &&
    state.messages[state.messages.length - 1].cached
      ? 0.3
      : 0;

  // Derive cost entries from messages
  const costEntries: CostEntry[] = state.messages.map((msg, idx) => ({
    questionNumber: idx + 1,
    questionPreview:
      msg.question.slice(0, 40) + (msg.question.length > 40 ? "..." : ""),
    mode: msg.mode,
    cost: msg.cost,
    cached: msg.cached,
  }));

  const getModeBadgeColor = (mode: Mode): string => {
    switch (mode) {
      case "Ask":
        return "bg-[var(--gray-70)]";
      case "Code":
        return "bg-[var(--blue-60)]";
      case "Plan":
        return "bg-[var(--purple-60)]";
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
            <p className="text-sm text-[var(--gray-60)] mt-1">
              Analyzing: excalidraw
            </p>
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
                  {/* Badges Row with Speaker Icon */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`${getModeBadgeColor(answer.mode)} text-white text-xs px-2 py-1 rounded-sm font-medium`}
                      >
                        {answer.mode}
                      </span>
                      {answer.cached && (
                        <span className="bg-[var(--green-40)] text-[var(--gray-100)] text-xs px-2 py-1 rounded-sm font-semibold flex items-center gap-1">
                          <Zap size={12} />
                          Cached — 0.00 Bc
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSpeakAnswer(answer.answer)}
                      className="text-[var(--gray-60)] hover:text-white transition-colors p-1"
                      aria-label="Speak answer"
                      title="Speak answer"
                    >
                      <Volume2 size={16} />
                    </button>
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
                            <code className="font-mono text-sm">
                              {children}
                            </code>
                          );
                        },
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

            {/* Loading State */}
            {isLoading && (
              <div className="bg-[var(--gray-90)] border border-[var(--gray-70)] rounded-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-[var(--blue-60)] border-t-transparent rounded-full" />
                  <span className="text-sm text-[var(--gray-60)]">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-[var(--red-90)] border border-[var(--red-60)] rounded-sm p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[var(--red-40)] font-semibold text-sm">
                    Error
                  </span>
                  <div className="flex-1">
                    <span className="text-sm text-[var(--gray-10)]">
                      {error}
                    </span>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-[var(--red-40)] hover:underline block"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    ? "bg-[var(--green-40)] text-[var(--gray-100)]"
                    : "bg-[var(--gray-90)] border border-[var(--gray-70)] text-white hover:bg-[var(--gray-80)]"
                }`}
                aria-label="Toggle microphone"
              >
                {state.microphoneActive ? (
                  <Mic size={20} />
                ) : (
                  <MicOff size={20} />
                )}
              </button>
              <button
                onClick={handleSend}
                disabled={!state.inputValue.trim() || isLoading}
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
                {totalCost.toFixed(2)} Bc
              </div>
              <div className="text-xs text-[var(--gray-60)] mt-1">
                Session cost
              </div>
            </div>
            <div className="text-sm text-[var(--gray-60)]">
              Single-model equivalent:{" "}
              <span className="font-mono">
                {singleModelEquivalent.toFixed(2)} Bc
              </span>
            </div>
            <div className="text-2xl font-semibold text-[var(--green-40)]">
              Saved: {percentSaved}%
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
                  <tr
                    key={entry.questionNumber}
                    className="border-b border-[var(--gray-70)] hover:bg-[var(--gray-90)]"
                  >
                    <td className="px-3 py-3 font-mono text-[var(--gray-60)]">
                      {entry.questionNumber}
                    </td>
                    <td className="px-3 py-3 text-[var(--gray-10)]">
                      {entry.questionPreview}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`${getModeBadgeColor(entry.mode)} text-white text-xs px-2 py-0.5 rounded-sm`}
                      >
                        {entry.mode}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--gray-10)]">
                      {entry.cost.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {entry.cached && (
                        <Zap
                          size={16}
                          className="inline text-[var(--green-40)]"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Last Cache Savings */}
          <div className="px-6 py-3 border-t border-[var(--gray-70)] text-xs text-[var(--gray-60)]">
            Last cache hit saved{" "}
            <span className="font-mono text-[var(--green-40)]">
              {lastCacheSavings.toFixed(2)} Bc
            </span>
          </div>
        </div>
      </div>

      {/* Checklist Drawer - Bottom */}
      <div className="border-t border-[var(--gray-70)] bg-[var(--gray-90)] transition-all duration-300 ease-in-out">
        {/* Drawer Header */}
        <div className="w-full px-6 py-3 flex items-center justify-between hover:bg-[var(--gray-80)] transition-colors">
          <span className="text-sm font-medium">
            Onboarding checklist (generated at session end)
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEndSession}
              disabled={
                state.messages.length === 0 ||
                state.checklistItems.length > 0 ||
                isLoading
              }
              className="px-3 py-1 text-xs bg-[var(--blue-60)] hover:bg-[var(--blue-70)] disabled:bg-[var(--gray-80)] disabled:cursor-not-allowed rounded-sm transition-colors"
            >
              End Session
            </button>
            <button onClick={handleChecklistToggle}>
              {state.checklistExpanded ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronUp size={20} />
              )}
            </button>
          </div>
        </div>

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
                      setState((prev) => ({
                        ...prev,
                        checklistItems: prev.checklistItems.map((i) =>
                          i.id === item.id
                            ? { ...i, completed: !i.completed }
                            : i,
                        ),
                      }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded-sm border-[var(--gray-70)] bg-[var(--gray-80)] checked:bg-[var(--blue-60)] focus:ring-2 focus:ring-[var(--blue-60)] focus:ring-offset-0"
                  />
                  <span
                    className={
                      item.completed
                        ? "line-through text-[var(--gray-60)]"
                        : "text-[var(--gray-10)]"
                    }
                  >
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
