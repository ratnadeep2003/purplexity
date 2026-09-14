import React, { useState, useRef, useEffect } from "react";
import {
  Globe,
  GraduationCap,
  Code2,
  PenTool,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Compass,
} from "lucide-react";

interface SearchHeroProps {
  onSearch: (query: string, focusMode: string) => void;
  isLoading: boolean;
}

const FOCUS_MODES = [
  { id: "web", label: "Web Search", icon: Globe },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "code", label: "Code", icon: Code2 },
  { id: "writing", label: "Writing", icon: PenTool },
];

const SUGGESTIONS = [
  {
    query: "Compare Rust vs Go for backend microservices in 2026",
    category: "Code",
  },
  {
    query: "Explain how quantum computers actually solve impossible problems",
    category: "Science",
  },
  {
    query: "Latest developments in agentic AI and reasoning frameworks",
    category: "AI",
  },
  {
    query: "How does Postgres indexing work under the hood?",
    category: "Database",
  },
];

export const SearchHero: React.FC<SearchHeroProps> = ({
  onSearch,
  isLoading,
}) => {
  const [query, setQuery] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("web");
  const [isPro, setIsPro] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), selectedFocus);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full py-12 min-h-screen">
      {/* Hero Headline */}
      <div className="text-center space-y-3 mb-8 select-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13ADC7]/10 border border-[#13ADC7]/30 text-[#20B2AA] text-xs font-medium mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-time web search powered by AI</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-serif sm:font-sans">
          Where knowledge begins
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Ask anything. Purplexity searches the web, verifies sources, and synthesizes answers.
        </p>
      </div>

      {/* Main Search Input Card */}
      <div className="w-full bg-[#202222] border border-[#2F3232] rounded-2xl p-3 shadow-2xl hover:border-[#3D4040] focus-within:border-[#20B2AA]/50 focus-within:ring-2 focus-within:ring-[#20B2AA]/20 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything or search the web..."
          rows={2}
          disabled={isLoading}
          className="w-full bg-transparent border-0 resize-none text-base text-white placeholder-zinc-500 focus:outline-none focus:ring-0 px-2 py-1 leading-relaxed font-sans"
        />

        {/* Input Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2A2C2C] mt-2 px-1">
          {/* Focus Modes Selector */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {FOCUS_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedFocus === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedFocus(mode.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-[#2A3A39] text-[#20B2AA] border border-[#20B2AA]/40"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#282A2A]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right controls: Pro switch & Submit button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPro(!isPro)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                isPro
                  ? "bg-gradient-to-r from-[#13ADC7] to-[#20B2AA] text-white shadow-sm"
                  : "bg-[#282A2A] text-zinc-400 hover:text-zinc-200"
              }`}
              title="Toggle advanced model reasoning"
            >
              <span>Pro</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isLoading}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                query.trim() && !isLoading
                  ? "bg-[#20B2AA] hover:bg-[#1BA199] text-white shadow-md shadow-[#20B2AA]/30 cursor-pointer hover:scale-105"
                  : "bg-[#2A2C2C] text-zinc-500 cursor-not-allowed"
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Queries */}
      <div className="w-full mt-8">
        <div className="flex items-center gap-2 mb-3 text-xs font-medium text-zinc-400 px-1">
          <Compass className="w-3.5 h-3.5" />
          <span>Try exploring:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(item.query);
                if (textareaRef.current) textareaRef.current.focus();
              }}
              className="text-left p-3 rounded-xl bg-[#1A1C1C] hover:bg-[#222424] border border-[#272929] hover:border-[#383A3A] transition-all group flex items-start justify-between"
            >
              <div className="space-y-1 pr-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#20B2AA]">
                  {item.category}
                </span>
                <p className="text-xs text-zinc-300 group-hover:text-white font-medium line-clamp-2">
                  {item.query}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#20B2AA] group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
