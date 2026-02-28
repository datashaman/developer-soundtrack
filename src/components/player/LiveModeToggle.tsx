"use client";

import { useCallback, useEffect, useState } from "react";

interface LiveModeToggleProps {
  owner: string;
  repo: string;
}

interface WebhookStatus {
  registered: boolean;
  webhookId: string | null;
}

export function LiveModeToggle({ owner, repo }: LiveModeToggleProps) {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fullName = `${owner}/${repo}`;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/webhooks?repo=${encodeURIComponent(fullName)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to check webhook status");
      }
      const data: WebhookStatus = await res.json();
      setStatus(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to check status");
    } finally {
      setIsLoading(false);
    }
  }, [fullName]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (status?.registered) {
        // Remove webhook
        const res = await fetch(
          `/api/webhooks?repo=${encodeURIComponent(fullName)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to disable live mode");
        }
        setStatus({ registered: false, webhookId: null });
      } else {
        // Register webhook
        const res = await fetch("/api/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: fullName }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to enable live mode");
        }
        const data = await res.json();
        setStatus({ registered: true, webhookId: data.webhookId });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && status === null) {
    return (
      <div className="flex items-center gap-1.5 text-text-faint text-xs font-mono">
        <div className="h-3 w-3 border border-text-faint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-9 rounded-lg text-xs font-mono transition-colors ${
          status?.registered
            ? "bg-accent/15 text-accent border border-accent/30"
            : "bg-input-bg text-text-muted border border-border-strong hover:bg-progress-bg hover:text-text-primary"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        title={
          status?.registered
            ? "Live mode is enabled — click to disable"
            : "Enable live mode to hear commits in real-time"
        }
      >
        {/* Pulsing dot for live mode */}
        {status?.registered && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
        )}
        {isLoading ? "..." : status?.registered ? "Live" : "Go Live"}
      </button>
      {error && (
        <span className="text-xs text-red-400 font-mono max-w-[200px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
