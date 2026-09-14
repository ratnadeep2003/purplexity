import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowRight,
  RefreshCw,
  Globe,
  Share2,
  ChevronDown,
  Layers,
} from "lucide-react";

export interface SourceItem {
  title?: string;
  url: string;
  content?: string;
}

export interface ThreadMessage {
  id?: string | number;
  role: "User" | "Assistant";
  content: string;
  sources?: SourceItem[];
  followUps?: string[];
  isStreaming?: boolean;
}

interface ThreadViewProps {
  query: string;
  messages: ThreadMessage[];
  isStreaming: boolean;
  onFollowUp: (question: string) => void;
  onRetry?: () => void;
}

/**
 * Parses raw text containing tags like <ANSWER>, <FOLLOW-UPS>, <SOURCES>, <CONVERSATION_ID>
 */
export function parsePurplexityResponse(rawText: string): {
  answer: string;
  sources: SourceItem[];
  followUps: string[];
} {
  let answer = "";
  let sources: SourceItem[] = [];
  let followUps: string[] = [];

  // Extract <SOURCES>
  const sourcesMatch = rawText.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/);
  if (sourcesMatch && sourcesMatch[1]) {
    try {
      sources = JSON.parse(sourcesMatch[1].trim());
    } catch {
      sources = [];
    }
  }

  // Extract <FOLLOW-UPS> or <FOLLOW_UPS>
  const followUpsMatch = rawText.match(
    /<FOLLOW[-_]UPS>([\s\S]*?)<\/FOLLOW[-_]UPS>/i
  );
  if (followUpsMatch && followUpsMatch[1]) {
    const questionMatches = followUpsMatch[1].match(
      /<question>([\s\S]*?)<\/question>/gi
    );
    if (questionMatches) {
      followUps = questionMatches
        .map((q) => q.replace(/<\/?question>/gi, "").trim())
        .filter(Boolean);
    }
  }

  // Extract <ANSWER>
  const answerMatch = rawText.match(/<ANSWER>([\s\S]*?)(?:<\/ANSWER>|$)/i);
  if (answerMatch && answerMatch[1]) {
    answer = answerMatch[1].trim();
  } else {
    // Fallback: strip tags from rawText
    answer = rawText
      .replace(/<CONVERSATION_ID>[\s\S]*?<\/CONVERSATION_ID>/gi, "")
      .replace(/<SOURCES>[\s\S]*?<\/SOURCES>/gi, "")
      .replace(/<FOLLOW[-_]UPS>[\s\S]*?<\/FOLLOW[-_]UPS>/gi, "")
      .replace(/<\/?ANSWER>/gi, "")
      .trim();
  }

  return { answer, sources, followUps };
}

/**
 * Lightweight markdown renderer supporting headers, bold, bullet points, code blocks
 */
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 rounded-lg overflow-hidden border border-zinc-700/60 bg-[#181A1A]"
          >
            {codeBlockLang && (
              <div className="px-3 py-1 text-[11px] font-mono text-zinc-400 bg-[#222424] border-b border-zinc-800">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-3 text-xs font-mono text-zinc-200 overflow-x-auto">
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "");
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={index}
          className="text-base font-semibold text-white mt-4 mb-2"
        >
          {formatInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={index}
          className="text-lg font-bold text-white mt-5 mb-2.5 pb-1 border-b border-zinc-800"
        >
          {formatInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={index}
          className="text-xl font-bold text-white mt-6 mb-3"
        >
          {formatInline(line.slice(2))}
        </h1>
      );
    }
    // Bullet lists
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <li
          key={index}
          className="ml-4 list-disc text-sm text-zinc-300 leading-relaxed my-1"
        >
          {formatInline(line.trim().slice(2))}
        </li>
      );
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <li
            key={index}
            className="ml-4 list-decimal text-sm text-zinc-300 leading-relaxed my-1"
          >
            {formatInline(match[2])}
          </li>
        );
      }
    }
    // Empty line
    else if (line.trim() === "") {
      elements.push(<div key={index} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={index} className="text-sm text-zinc-300 leading-relaxed my-1.5">
          {formatInline(line)}
        </p>
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

function formatInline(text: string): React.ReactNode {
  // Regex to split on bold **text** or inline `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-[#242626] text-[#20B2AA] font-mono text-xs border border-zinc-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  query,
  messages,
  isStreaming,
  onFollowUp,
  onRetry,
}) => {
  const [followUpInput, setFollowUpInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || isStreaming) return;
    onFollowUp(followUpInput.trim());
    setFollowUpInput("");
  };

  // Helper to extract domain from URL
  const getDomain = (urlStr: string) => {
    try {
      const u = new URL(urlStr);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#131515]">
      {/* Scrollable Conversation Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Main Original Query Header */}
        <div className="space-y-2 border-b border-[#252828] pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-snug">
            {query}
          </h1>
        </div>

        {/* Message Pairs (Turns) */}
        {messages.map((msg, idx) => {
          if (msg.role === "User") {
            // Render user follow-up questions
            if (idx > 0) {
              return (
                <div key={idx} className="pt-4 border-t border-[#232525]">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {msg.content}
                  </h2>
                </div>
              );
            }
            return null; // First user query is already at the top header
          }

          // Assistant Response
          const parsed = parsePurplexityResponse(msg.content);
          const sources = msg.sources && msg.sources.length > 0 ? msg.sources : parsed.sources;
          const followUps =
            msg.followUps && msg.followUps.length > 0
              ? msg.followUps
              : parsed.followUps;
          const answer = parsed.answer || (msg.isStreaming ? msg.content : "");

          return (
            <div key={idx} className="space-y-6">
              {/* Sources Section */}
              {sources.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>Sources ({sources.length})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {sources.map((src, sIdx) => {
                      const domain = getDomain(src.url);
                      return (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col justify-between p-2.5 rounded-xl bg-[#1C1E1E] hover:bg-[#242727] border border-[#2A2D2D] hover:border-[#3B3E3E] transition-all group shadow-sm text-left"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                alt=""
                                className="w-3.5 h-3.5 rounded-sm shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <span className="truncate font-medium">
                                {domain}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 font-medium line-clamp-2 leading-snug group-hover:text-[#20B2AA] transition-colors">
                              {src.title || domain}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/40 text-[10px] text-zinc-500">
                            <span>#{sIdx + 1}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Answer Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#20B2AA]" />
                    <span>Answer</span>
                  </div>

                  {/* Actions: Copy & Share */}
                  {answer && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(answer, idx)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-[#202222] transition-colors"
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative p-5 rounded-2xl bg-[#1A1C1C] border border-[#272929] shadow-sm">
                  <SimpleMarkdown content={answer} />

                  {/* Streaming indicator */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[#20B2AA] animate-pulse align-middle" />
                  )}
                </div>
              </div>

              {/* Follow-up Suggestions (Perplexity Related section) */}
              {followUps.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Related
                  </div>
                  <div className="space-y-2">
                    {followUps.map((q, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => onFollowUp(q)}
                        disabled={isStreaming}
                        className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-[#1A1C1C] hover:bg-[#222424] border border-[#272929] hover:border-[#383B3B] text-xs text-zinc-300 hover:text-white transition-all group"
                      >
                        <span className="font-medium pr-2">{q}</span>
                        <div className="w-6 h-6 rounded-full bg-[#252828] group-hover:bg-[#20B2AA] flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} className="h-20" />
      </div>

      {/* Sticky Bottom Follow-up Input Bar */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#131515] via-[#131515]/95 to-transparent px-4 pb-6 pt-4">
        <form
          onSubmit={handleFollowUpSubmit}
          className="max-w-4xl mx-auto flex items-center gap-2 bg-[#202222] border border-[#2E3131] hover:border-[#3E4242] focus-within:border-[#20B2AA]/50 focus-within:ring-2 focus-within:ring-[#20B2AA]/20 rounded-2xl p-2 shadow-xl transition-all"
        >
          <input
            type="text"
            value={followUpInput}
            onChange={(e) => setFollowUpInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            disabled={isStreaming}
            className="flex-1 bg-transparent border-0 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-0 px-3 py-1 font-sans"
          />
          <button
            type="submit"
            disabled={!followUpInput.trim() || isStreaming}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              followUpInput.trim() && !isStreaming
                ? "bg-[#20B2AA] hover:bg-[#1BA199] text-white shadow-md shadow-[#20B2AA]/30 cursor-pointer hover:scale-105"
                : "bg-[#2A2C2C] text-zinc-500 cursor-not-allowed"
            }`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
