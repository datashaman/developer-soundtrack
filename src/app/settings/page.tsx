"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-4 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-accent font-mono">
            Settings
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Theme Section */}
        <div className="rounded-xl border border-border-strong bg-surface p-6">
          <h2 className="text-sm font-mono font-semibold text-text-muted uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-text-primary">Theme</p>
              <p className="text-xs text-text-faint mt-0.5">
                Choose between dark and light mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 min-h-11 rounded-lg text-sm font-mono transition-colors ${
                  theme === "dark"
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-input-bg text-text-muted border border-border-strong hover:bg-progress-bg hover:text-text-primary"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 min-h-11 rounded-lg text-sm font-mono transition-colors ${
                  theme === "light"
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-input-bg text-text-muted border border-border-strong hover:bg-progress-bg hover:text-text-primary"
                }`}
              >
                Light
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
