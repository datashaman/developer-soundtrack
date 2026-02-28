"use client";

import { useEffect, useState } from "react";

interface Repo {
  fullName: string;
  description: string | null;
  language: string | null;
  pushedAt: string | null;
}

interface RepoSelectorProps {
  value: string | null;
  onChange: (repo: string | null) => void;
}

export function RepoSelector({ value, onChange }: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRepos() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/repos");
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Failed to fetch repos (${response.status})`);
        }
        const data = await response.json();
        if (!cancelled) {
          setRepos(data.repos);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch repositories");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRepos();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load repositories: {error}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="repo-selector"
        className="block text-xs text-white/40 uppercase tracking-widest font-mono mb-2"
      >
        Repository
      </label>
      <select
        id="repo-selector"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading}
        className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-4 py-3 min-h-11 text-sm font-mono focus:outline-none focus:border-[#00ffc8]/50 focus:ring-1 focus:ring-[#00ffc8]/30 disabled:opacity-50 disabled:cursor-wait appearance-none"
      >
        <option value="" className="bg-[#0a0a0e]">
          {isLoading ? "Loading repositories…" : "Select a repository"}
        </option>
        {repos.map((repo) => (
          <option
            key={repo.fullName}
            value={repo.fullName}
            className="bg-[#0a0a0e]"
          >
            {repo.fullName}
            {repo.language ? ` · ${repo.language}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
