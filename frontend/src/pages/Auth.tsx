import React, { useState } from "react";
import { createClient } from "@/lib/client";
import { Sparkles, ArrowLeft, ShieldCheck, Zap, Layers } from "lucide-react";
import { useNavigate } from "react-router";

const supabase = createClient();

export default function Auth() {
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function login(provider: "github" | "google") {
    try {
      setLoadingProvider(provider);
      setErrorMsg(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Failed to initiate login");
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#131515] px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#13ADC7]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-[#20B2AA]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Back to Home Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#202222] transition-colors border border-transparent hover:border-[#2F3232]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to search</span>
      </button>

      {/* Main Auth Box */}
      <div className="w-full max-w-md bg-[#1C1E1E] border border-[#2D3030] rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#13ADC7] to-[#20B2AA] flex items-center justify-center text-white shadow-xl shadow-[#13ADC7]/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            Welcome to Purplexity
          </h2>
          <p className="text-xs text-zinc-400">
            Sign in to save your threads, access history, and sync across devices.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 pt-2">
          {/* Google Login */}
          <button
            onClick={() => login("google")}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#252828] hover:bg-[#2D3030] text-white text-sm font-semibold border border-[#343737] hover:border-zinc-500 transition-all shadow-sm group cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>
              {loadingProvider === "google"
                ? "Connecting..."
                : "Continue with Google"}
            </span>
          </button>

          {/* GitHub Login */}
          <button
            onClick={() => login("github")}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#252828] hover:bg-[#2D3030] text-white text-sm font-semibold border border-[#343737] hover:border-zinc-500 transition-all shadow-sm group cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>
              {loadingProvider === "github"
                ? "Connecting..."
                : "Continue with GitHub"}
            </span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="pt-4 border-t border-[#272929] grid grid-cols-3 gap-2 text-center select-none">
          <div className="space-y-1">
            <Zap className="w-4 h-4 mx-auto text-[#20B2AA]" />
            <p className="text-[10px] text-zinc-400">Fast Synthesis</p>
          </div>
          <div className="space-y-1">
            <Layers className="w-4 h-4 mx-auto text-[#13ADC7]" />
            <p className="text-[10px] text-zinc-400">Live Sources</p>
          </div>
          <div className="space-y-1">
            <ShieldCheck className="w-4 h-4 mx-auto text-emerald-400" />
            <p className="text-[10px] text-zinc-400">DB Synced</p>
          </div>
        </div>
      </div>
    </div>
  );
}