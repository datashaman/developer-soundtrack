"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { RepoSelector } from "./RepoSelector";
import { DateRangePicker, type DatePreset } from "./DateRangePicker";
import { AuthButton } from "@/components/shared/AuthButton";

interface RecentSession {
  repo: string;
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  commitCount: number | null;
  playedAt: string;
}

const RECENT_SESSIONS_KEY = "developer-soundtrack-recent-sessions";
const MAX_RECENT = 5;

function loadRecentSessions(): RecentSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSession(session: RecentSession) {
  try {
    const existing = loadRecentSessions();
    // Remove duplicate if same repo + range
    const filtered = existing.filter(
      (s) =>
        !(s.repo === session.repo && s.preset === session.preset && s.customFrom === session.customFrom && s.customTo === session.customTo)
    );
    const updated = [session, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable
  }
}

function getDateRange(preset: DatePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "week": {
      const start = new Date(now);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = 0
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "sprint": {
      const start = new Date(now);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "custom": {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : "",
        to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : new Date().toISOString(),
      };
    }
  }
}

function formatPreset(preset: DatePreset, customFrom: string, customTo: string): string {
  switch (preset) {
    case "today": return "Today";
    case "week": return "This week";
    case "sprint": return "This sprint (2 weeks)";
    case "custom": return `${customFrom || "?"} → ${customTo || "?"}`;
  }
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Dashboard() {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [preset, setPreset] = useState<DatePreset>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [recentSessions] = useState<RecentSession[]>(loadRecentSessions);

  const handlePlay = useCallback(() => {
    if (!selectedRepo) return;

    const [owner, repo] = selectedRepo.split("/");
    const { from, to } = getDateRange(preset, customFrom, customTo);
    const params = new URLSearchParams();
    if (preset !== "custom") {
      params.set("range", preset);
    }
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    saveRecentSession({
      repo: selectedRepo,
      preset,
      customFrom,
      customTo,
      commitCount: null,
      playedAt: new Date().toISOString(),
    });

    router.push(`/play/${owner}/${repo}?${params.toString()}`);
  }, [selectedRepo, preset, customFrom, customTo, router]);

  const handleRecentClick = useCallback(
    (session: RecentSession) => {
      const [owner, repo] = session.repo.split("/");
      const { from, to } = getDateRange(session.preset, session.customFrom, session.customTo);
      const params = new URLSearchParams();
      if (session.preset !== "custom") {
        params.set("range", session.preset);
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      router.push(`/play/${owner}/${repo}?${params.toString()}`);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white">
      <header className="mx-auto max-w-3xl px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[#00ffc8] font-mono">
          Developer Soundtrack
        </h1>
        <AuthButton />
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
          <RepoSelector value={selectedRepo} onChange={setSelectedRepo} />

          <DateRangePicker
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setPreset}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          <button
            onClick={handlePlay}
            disabled={!selectedRepo}
            className="w-full rounded-lg bg-[#00ffc8] hover:bg-[#00ddb0] disabled:bg-white/10 disabled:text-white/30 text-black font-semibold py-3 text-sm transition-colors disabled:cursor-not-allowed"
          >
            {selectedRepo ? "Play Soundtrack" : "Select a repository to begin"}
          </button>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs text-white/40 uppercase tracking-widest font-mono mb-3">
              Recent Sessions
            </h2>
            <div className="space-y-2">
              {recentSessions.map((session, index) => (
                <button
                  key={`${session.repo}-${session.playedAt}-${index}`}
                  onClick={() => handleRecentClick(session)}
                  className="w-full text-left rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-white/80 group-hover:text-[#00ffc8] transition-colors">
                      {session.repo}
                    </span>
                    <span className="text-xs text-white/30 font-mono">
                      {formatTimeAgo(session.playedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 font-mono">
                    {formatPreset(session.preset, session.customFrom, session.customTo)}
                    {session.commitCount !== null && ` · ${session.commitCount} commits`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
