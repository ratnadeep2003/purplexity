import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LoaderCircle, Search } from "lucide-react";
import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";

const supabase = createClient();

type Provider = "github" | "google";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.3 3.1-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.2 13.7a6 6 0 0 1 0-3.4V7.7H2.9a10 10 0 0 0 0 8.6l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.6 0 3 .5 4.1 1.6l3-3A10 10 0 0 0 2.9 7.7l3.3 2.6C7 7.8 9.3 6 12 6Z"
      />
    </svg>
  );
}

function GithubMark() {
  return (
    <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function login(provider: Provider) {
    setActiveProvider(provider);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setActiveProvider(null);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(209,234,229,0.65),transparent_38rem)]" />

      <section className="relative w-full max-w-[25rem] rounded-[1.5rem] border border-border/80 bg-card/90 p-7 shadow-[0_24px_80px_-40px_rgba(20,40,40,0.45)] backdrop-blur sm:p-9">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Search className="size-5" strokeWidth={2.25} />
          </div>
          <p className="text-sm font-medium tracking-tight text-primary">
            Purplexity
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
            Research, without the noise.
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Sign in to turn your questions into clear, sourced answers.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="h-11 w-full rounded-xl"
            variant="outline"
            onClick={() => void login("google")}
            disabled={activeProvider !== null}
          >
            {activeProvider === "google" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </Button>

          <Button
            className="h-11 w-full rounded-xl"
            variant="outline"
            onClick={() => void login("github")}
            disabled={activeProvider !== null}
          >
            {activeProvider === "github" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <GithubMark />
            )}
            Continue with GitHub
          </Button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="mt-7 text-center text-xs leading-5 text-muted-foreground">
          By continuing, you agree to use Purplexity responsibly.
        </p>
      </section>
    </main>
  );
}