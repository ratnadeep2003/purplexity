import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  History,
  LogOut,
  Menu,
  MessageSquarePlus,
  Search,
  Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  children: ReactNode;
  onNewSearch: () => void;
  onSignOut: () => void;
  user: User;
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Search className="size-4" strokeWidth={2.4} />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.03em]">
        Purplexity
      </span>
    </div>
  );
}

export function AppShell({
  children,
  onNewSearch,
  onSignOut,
  user,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const initial = user.email?.slice(0, 1).toUpperCase() ?? "P";

  function newSearch() {
    onNewSearch();
    setIsMobileNavOpen(false);
  }

  const navigation = (
    <>
      <Button
        className="mt-7 w-full justify-start rounded-xl"
        onClick={newSearch}
        variant="secondary"
      >
        <MessageSquarePlus />
        New search
      </Button>

      <nav className="mt-6 space-y-1" aria-label="Main navigation">
        <button
          className="flex h-10 w-full items-center gap-3 rounded-xl bg-sidebar-accent px-3 text-left text-sm font-medium text-sidebar-accent-foreground"
          type="button"
        >
          <Sparkles className="size-4" />
          Discover
        </button>
        <button
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          type="button"
        >
          <History className="size-4" />
          Library
        </button>
      </nav>

      <div className="mt-8">
        <p className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Recent
        </p>
        <p className="mt-3 px-3 text-sm leading-5 text-muted-foreground">
          Your research history will appear here.
        </p>
      </div>

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <div className="flex items-center gap-2 rounded-xl px-2 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
            {user.email ?? "Signed in"}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
        <Button
          className="mt-1 w-full justify-start rounded-xl text-muted-foreground"
          onClick={onSignOut}
          variant="ghost"
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur lg:hidden">
        <Brand />
        <Button
          aria-label="Open navigation"
          size="icon"
          variant="ghost"
          className="rounded-xl"
          onClick={() => setIsMobileNavOpen(true)}
        >
          <Menu />
        </Button>
      </header>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar px-3 py-4 shadow-2xl">
            <div className="px-2">
              <Brand />
            </div>
            {navigation}
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        {navigation}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        {children}
      </div>
    </div>
  );
}