import React from "react";
import logo from "@/purplexity-logo.svg";
import {
  Sparkles,
  Plus,
  MessageSquare,
  Compass,
  Library,
  Settings,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  Github,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

export interface ConversationSummary {
  id: string;
  title: string | null;
  slug: string;
  createdAt?: string;
  messages?: Array<{
    id: number;
    content: string;
    role: "User" | "Assistant";
  }>;
}

interface SidebarProps {
  user: User | null;
  dbSynced: boolean;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewThread: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  dbSynced,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewThread,
  onSignOut,
  onSignIn,
  isCollapsed,
  onToggleCollapse,
}) => {
  const provider =
    user?.app_metadata?.provider ||
    (user?.app_metadata?.providers && user.app_metadata.providers[0]) ||
    "Google";

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#191A1A] border-r border-[#272929] transition-all duration-300 z-30 select-none ${
        isCollapsed ? "w-[68px]" : "w-[260px]"
      }`}
    >
      {/* Header & Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#272929]/60">
        {!isCollapsed ? (
          <div
            onClick={onNewThread}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img src={logo} alt="Purplexity" className="size-7 rounded-lg" />
            <span className="font-bold text-lg tracking-tight text-white">
              Purplexity
            </span>
          </div>
        ) : (
          <div
            onClick={onNewThread}
            className="w-9 h-9 mx-auto rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            title="Purplexity"
          >
            <img src={logo} alt="Purplexity" className="size-full object-cover" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-[#2A2B2B] text-zinc-400 hover:text-white transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Thread Button */}
      <div className="p-3">
        <button
          onClick={onNewThread}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#303333] hover:border-[#13ADC7]/50 bg-[#202222] hover:bg-[#252828] text-white text-sm font-medium transition-all shadow-sm group ${
            isCollapsed ? "justify-center px-0" : "justify-between"
          }`}
          title="New Search (Ctrl+K)"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-[#20B2AA] group-hover:rotate-90 transition-transform duration-200" />
            {!isCollapsed && <span>New Thread</span>}
          </div>
          {!isCollapsed && (
            <kbd className="text-[10px] font-mono text-zinc-400 bg-[#2A2D2D] px-1.5 py-0.5 rounded border border-zinc-700/50">
              Ctrl K
            </kbd>
          )}
        </button>
      </div>

      {/* Navigation & History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Navigation Items */}
        <div className="space-y-1">
          <button
            onClick={onNewThread}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-[#222424] transition-colors ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            title="Discover"
          >
            <Compass className="w-4 h-4 text-zinc-400" />
            {!isCollapsed && <span>Discover</span>}
          </button>
          <button
            onClick={() => {}}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-[#222424] transition-colors ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            title="Library"
          >
            <Library className="w-4 h-4 text-zinc-400" />
            {!isCollapsed && <span>Library</span>}
          </button>
        </div>

        {/* Threads Section */}
        {!isCollapsed && (
          <div>
            <div className="px-3 pb-2 pt-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
              <span>Recent Threads</span>
              {conversations.length > 0 && (
                <span className="text-[10px] text-zinc-400">
                  {conversations.length}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {conversations.length === 0 ? (
                <p className="px-3 py-3 text-xs text-zinc-400 italic">
                  No previous searches yet. Ask something to get started!
                </p>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all group ${
                        isActive
                          ? "bg-[#252828] text-[#20B2AA] font-medium border border-[#20B2AA]/20"
                          : "text-zinc-300 hover:text-white hover:bg-[#202222]"
                      }`}
                      title={conv.title || "Thread"}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      <span className="truncate flex-1">
                        {conv.title || "Untitled search"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* User / Auth Footer */}
      <div className="p-3 border-t border-[#272929] bg-[#161717]">
        {user ? (
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2.5 p-2 rounded-xl bg-[#202222] border border-[#2B2E2E] ${
                isCollapsed ? "justify-center p-1.5" : ""
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full ring-1 ring-[#13ADC7]/40 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#13ADC7] to-[#20B2AA] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}

              {!isCollapsed && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-[#2c2d2d] rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#20B2AA] hover:bg-[#1BA199] text-white text-xs font-semibold shadow-md shadow-[#20B2AA]/20 transition-all ${
              isCollapsed ? "justify-center px-0" : "justify-center"
            }`}
          >
            <LogIn className="w-4 h-4" />
            {!isCollapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};