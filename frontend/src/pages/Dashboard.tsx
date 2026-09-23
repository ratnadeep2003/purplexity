import { createClient } from "@/lib/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@supabase/supabase-js";
import { ArrowUp, BookOpen, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

const supabase = createClient();
const API_BASE = process.env.BUN_PUBLIC_API_URL ?? "http://localhost:3001";

const suggestedPrompts = [
  "What are the most important AI developments this week?",
  "Explain quantum computing in simple terms",
  "Compare the best approaches to learning TypeScript",
];

type Source = { title: string; url: string; snippet: string | null };
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  followUps?: string[];
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const conversationIdRef = useRef<string | undefined>(conversationId);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function parseSSEChunk(chunk: string) {
    // Each SSE message is separated by a blank line; may contain
    // "event: <name>\ndata: <json>"
    return chunk
      .split("\n\n")
      .filter(Boolean)
      .map((block) => {
        const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        return {
          event: eventLine?.slice(6).trim() ?? "message",
          data: dataLine ? JSON.parse(dataLine.slice(5).trim()) : null,
        };
      });
  }

  async function ask(question: string) {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth", { replace: true });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: question,
          conversationId: conversationIdRef.current,
        }),
      });

      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const [event] = parseSSEChunk(part + "\n\n");
          if (!event) continue;

          if (event.event === "conversation") {
            conversationIdRef.current = event.data.id;
            navigate(`/c/${event.data.id}`, { replace: true });
          }

          if (event.event === "delta") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (!last) return prev;
              last.content += event.data.text;
              return next;
            });
          }

          if (event.event === "complete") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (!last) return prev;
              next[next.length - 1] = {
                role: "assistant",
                content: event.data.message.content,
                sources: event.data.message.sources,
                followUps: event.data.message.followUps,
              };
              return next;
            });
          }

          if (event.event === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (!last) return prev;
              last.content = `Error: ${event.data.message}`;
              return next;
            });
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (!last) return prev;
        last.content = `Error: ${String(error)}`;
        return next;
      });
    } finally {
      setIsAsking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading Purplexity" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppShell
      user={user}
      onNewSearch={() => {
        setQuery("");
        setMessages([]);
        conversationIdRef.current = undefined;
        navigate("/");
      }}
      onSignOut={() => void signOut()}
    >
      <main className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col px-5 pb-8 pt-14 sm:px-10 sm:pt-24 lg:px-14">
        {messages.length === 0 ? (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center pb-24">
            <div className="mb-10 text-center">
              <div className="mx-auto mb-5 grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                <Sparkles className="size-5" />
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                What would you like to know?
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Ask anything. Purplexity searches the web and brings the useful
                parts together.
              </p>
            </div>

            <form
              className="rounded-2xl border border-border bg-card p-2 shadow-[0_12px_35px_-24px_rgba(20,40,40,0.45)]"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(query);
              }}
            >
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask a question..."
                className="min-h-28 resize-none border-0 bg-transparent px-3 pt-3 text-base shadow-none focus-visible:ring-0"
                aria-label="Research question"
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Search className="size-3.5" />
                  <span>Search the web</span>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 rounded-xl"
                  disabled={!query.trim() || isAsking}
                  aria-label="Send question"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <p className="mb-3 px-1 text-xs font-medium uppercase tracking-[0.13em] text-muted-foreground">
                Explore a topic
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {suggestedPrompts.map((prompt) => (
                  <button
                    className="group rounded-xl border border-border bg-card p-3 text-left text-sm leading-5 text-muted-foreground transition-colors hover:border-primary/25 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={prompt}
                    onClick={() => void ask(prompt)}
                    type="button"
                  >
                    <BookOpen className="mb-3 size-4 text-primary/70 transition-transform group-hover:-rotate-6" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 pb-32">
            {messages.map((message, i) => (
              <div
                key={i}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-secondary px-4 py-2.5 text-sm leading-6"
                      : "max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm leading-6"
                  }
                >
                  {message.role === "assistant" && !message.content && isAsking ? (
                    <TypingDots />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {message.sources.map((s) => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            <form
              className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-2 shadow-[0_12px_35px_-24px_rgba(20,40,40,0.45)] lg:left-64"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(query);
              }}
            >
              <Textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask a follow-up..."
                className="min-h-14 resize-none border-0 bg-transparent px-3 pt-3 text-base shadow-none focus-visible:ring-0"
                aria-label="Follow-up question"
              />
              <div className="flex items-center justify-end px-1 pb-1">
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 rounded-xl"
                  disabled={!query.trim() || isAsking}
                  aria-label="Send question"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </form>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Purplexity can make mistakes. Check important information.
        </p>
      </main>
    </AppShell>
  );
}