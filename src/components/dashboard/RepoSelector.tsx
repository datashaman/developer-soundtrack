"use client";

import { useCallback, useEffect, useState } from "react";

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

  const fetchRepos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/repos");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch repos (${response.status})`);
      }
      const data = await response.json();
      setRepos(data.repos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-red-400 text-sm font-mono">
          Failed to load repositories: {error}
        </p>
        <button
          onClick={fetchRepos}
          className="mt-2 text-sm text-accent hover:text-accent-hover font-mono underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isLoading && repos.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface p-4 text-center">
        <p className="text-sm text-text-faint font-mono">
          No repositories found. Connect a repository to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="repo-selector"
        className="block text-xs text-text-faint uppercase tracking-widest font-mono mb-2"
      >
        Repository
      </label>
      <select
        id="repo-selector"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={isLoading}
        className="w-full rounded-lg bg-input-bg border border-border-strong text-foreground px-4 py-3 min-h-11 text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-wait appearance-none"
      >
        <option value="" className="bg-option-bg">
          {isLoading ? "Loading repositories…" : "Select a repository"}
        </option>
        {repos.map((repo) => (
          <option
            key={repo.fullName}
            value={repo.fullName}
            className="bg-option-bg"
          >
            {repo.fullName}
            {repo.language ? ` · ${repo.language}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
