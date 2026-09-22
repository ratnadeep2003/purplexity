import { createClient } from "@/lib/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@supabase/supabase-js";
import { ArrowUp, BookOpen, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router";

const supabase = createClient();

const suggestedPrompts = [
  "What are the most important AI developments this week?",
  "Explain quantum computing in simple terms",
  "Compare the best approaches to learning TypeScript",
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

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
      onNewSearch={() => setQuery("")}
      onSignOut={() => void signOut()}
    >
      <main className="mx-auto flex min-h-full w-full max-w-4xl flex-1 flex-col px-5 pb-8 pt-14 sm:px-10 sm:pt-24 lg:px-14">
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
            onSubmit={(event) => event.preventDefault()}
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
                disabled={!query.trim()}
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
                  onClick={() => setQuery(prompt)}
                  type="button"
                >
                  <BookOpen className="mb-3 size-4 text-primary/70 transition-transform group-hover:-rotate-6" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Purplexity can make mistakes. Check important information.
        </p>
      </main>
    </AppShell>
  );
}