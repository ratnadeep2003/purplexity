import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/client";
import type { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { Sidebar, type ConversationSummary } from "@/components/Sidebar";
import { SearchHero } from "@/components/SearchHero";
import {
  ThreadView,
  type ThreadMessage,
  parsePurplexityResponse,
} from "@/components/ThreadView";

const supabase = createClient();

export default function Dashboard() {
  const navigate = useNavigate();

  // User & Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbSynced, setDbSynced] = useState(false);

  // Layout & Navigation state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Active Thread / Search state
  const [currentQuery, setCurrentQuery] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * Synchronize authenticated user with backend and fetch conversation history
   */
  const syncWithBackend = useCallback(async (jwt: string) => {
    try {
      // 1. Verify and upsert user in Prisma User table
      const authRes = await axios.get(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (authRes.data?.synced) {
        setDbSynced(true);
      }

      // 2. Fetch user's conversation threads
      const convRes = await axios.get(`${BACKEND_URL}/conversations`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (Array.isArray(convRes.data)) {
        setConversations(convRes.data);
      }
    } catch (err) {
      console.error("Backend sync error:", err);
    }
  }, []);

  /**
   * Monitor auth state
   */
  useEffect(() => {
    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await syncWithBackend(session.access_token);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession?.user) {
        setUser(newSession.user);
        setSession(newSession);
        await syncWithBackend(newSession.access_token);
      } else {
        setUser(null);
        setSession(null);
        setDbSynced(false);
        setConversations([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncWithBackend]);

  /**
   * Keyboard shortcut: Ctrl+K / Cmd+K for new thread
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewThread();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * Reset to new search
   */
  const handleNewThread = () => {
    setActiveConversationId(null);
    setCurrentQuery("");
    setMessages([]);
    setIsStreaming(false);
  };

  /**
   * Load an existing conversation thread
   */
  const handleSelectConversation = async (id: string) => {
    if (!session?.access_token) return;

    try {
      const res = await axios.get(`${BACKEND_URL}/conversation/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const conv = res.data;
      if (!conv) return;

      setActiveConversationId(conv.id);
      setCurrentQuery(conv.title || "Thread");

      const loadedMessages: ThreadMessage[] = (conv.messages || []).map(
        (m: any) => ({
          id: m.id,
          role: m.role as "User" | "Assistant",
          content: m.content,
        })
      );

      setMessages(loadedMessages);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  /**
   * Execute new Purplexity search query
   */
  const handleSearch = async (query: string, focusMode: string) => {
    if (!session?.access_token) {
      navigate("/auth");
      return;
    }

    setCurrentQuery(query);
    setActiveConversationId(null);
    setIsStreaming(true);

    // Initial message setup: User question + placeholder assistant streaming reply
    const initialUserMsg: ThreadMessage = { role: "User", content: query };
    const initialAssistantMsg: ThreadMessage = {
      role: "Assistant",
      content: "",
      isStreaming: true,
    };
    setMessages([initialUserMsg, initialAssistantMsg]);

    try {
      const response = await fetch(`${BACKEND_URL}/purplexity_ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const decoder = new TextDecoder();
      let rawAccumulated = "";
      let newConvId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawAccumulated += chunk;

        // Check for <CONVERSATION_ID> tag
        const convMatch = rawAccumulated.match(
          /<CONVERSATION_ID>([\s\S]*?)<\/CONVERSATION_ID>/
        );
        if (convMatch && convMatch[1] && !newConvId) {
          newConvId = convMatch[1].trim();
          setActiveConversationId(newConvId);
        }

        // Live update assistant message
        setMessages([
          initialUserMsg,
          {
            role: "Assistant",
            content: rawAccumulated,
            isStreaming: true,
          },
        ]);
      }

      // Final parsed update
      const { sources, followUps } = parsePurplexityResponse(rawAccumulated);
      setMessages([
        initialUserMsg,
        {
          role: "Assistant",
          content: rawAccumulated,
          sources,
          followUps,
          isStreaming: false,
        },
      ]);

      // Refresh conversations list in sidebar
      if (session.access_token) {
        syncWithBackend(session.access_token);
      }
    } catch (err: any) {
      console.error("Search streaming error:", err);
      setMessages([
        initialUserMsg,
        {
          role: "Assistant",
          content: `<ANSWER>Sorry, an error occurred while searching: ${err.message}. Please try again.</ANSWER>`,
          isStreaming: false,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Execute follow-up query in existing conversation thread
   */
  const handleFollowUp = async (question: string) => {
    if (!session?.access_token) {
      navigate("/auth");
      return;
    }
    if (!activeConversationId) return;

    setIsStreaming(true);

    // Append follow-up user query and placeholder assistant message
    const userFollowUp: ThreadMessage = {
      role: "User",
      content: question,
    };
    const assistantFollowUp: ThreadMessage = {
      role: "Assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userFollowUp, assistantFollowUp]);

    try {
      const response = await fetch(`${BACKEND_URL}/purplexity_ask/follow_up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: question,
          conversationId: activeConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      const decoder = new TextDecoder();
      let rawAccumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawAccumulated += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "Assistant",
            content: rawAccumulated,
            isStreaming: true,
          };
          return updated;
        });
      }

      const { sources, followUps } = parsePurplexityResponse(rawAccumulated);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "Assistant",
          content: rawAccumulated,
          sources,
          followUps,
          isStreaming: false,
        };
        return updated;
      });

      // Refresh conversation list
      syncWithBackend(session.access_token);
    } catch (err: any) {
      console.error("Follow-up error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "Assistant",
          content: `<ANSWER>Failed to process follow-up: ${err.message}</ANSWER>`,
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDbSynced(false);
    handleNewThread();
  };

  return (
    <div className="flex h-screen w-full bg-[#131515] text-[#ECECEC] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        user={user}
        dbSynced={dbSynced}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewThread={handleNewThread}
        onSignOut={handleSignOut}
        onSignIn={() => navigate("/auth")}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content View */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {messages.length === 0 ? (
          <SearchHero onSearch={handleSearch} isLoading={isStreaming} />
        ) : (
          <ThreadView
            query={currentQuery}
            messages={messages}
            isStreaming={isStreaming}
            onFollowUp={handleFollowUp}
          />
        )}
      </main>
    </div>
  );
}