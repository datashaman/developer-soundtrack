"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Commit } from "@/types";

interface UseLiveCommitsReturn {
  /** The most recently received commit from the SSE stream */
  latestCommit: Commit | null;
  /** Whether the SSE connection is currently active */
  isConnected: boolean;
  /** Error message if connection failed */
  error: string | null;
}

const RECONNECT_DELAY_MS = 3000;

export function useLiveCommits(repo: string | null): UseLiveCommitsReturn {
  const [latestCommit, setLatestCommit] = useState<Commit | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    if (!repo) {
      cleanup();
      setIsConnected(false);
      setLatestCommit(null);
      setError(null);
      return;
    }

    function connect() {
      if (unmountedRef.current) return;

      cleanup();

      const url = `/api/live?repo=${encodeURIComponent(repo!)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        if (unmountedRef.current) return;
        setIsConnected(true);
        setError(null);
      });

      es.addEventListener("commits", (event: MessageEvent) => {
        if (unmountedRef.current) return;
        try {
          const commits: Commit[] = JSON.parse(event.data);
          if (commits.length > 0) {
            setLatestCommit(commits[commits.length - 1]);
          }
        } catch {
          // Ignore malformed data
        }
      });

      es.onerror = () => {
        if (unmountedRef.current) return;
        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
        setError("Connection lost. Reconnecting...");

        // Auto-reconnect after delay
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      cleanup();
      setIsConnected(false);
    };
  }, [repo, cleanup]);

  return { latestCommit, isConnected, error };
}
