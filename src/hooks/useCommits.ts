"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Commit } from "@/types";

interface UseCommitsParams {
  repo: string | null;
  from?: string;
  to?: string;
  limit?: number;
}

interface UseCommitsReturn {
  commits: Commit[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number | null;
  rateLimitRemaining: number | null;
  loadMore: () => void;
  retry: () => void;
}

export function useCommits({
  repo,
  from,
  to,
  limit = 100,
}: UseCommitsParams): UseCommitsReturn {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!repo) return;

      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ repo, page: String(pageNum), limit: String(limit) });
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const response = await fetch(`/api/commits?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setCommits((prev) => (append ? [...prev, ...data.commits] : data.commits));
          setHasMore(data.hasMore);
          setTotal(data.total ?? null);
          setPage(pageNum);
          if (data.rateLimitRemaining != null) {
            setRateLimitRemaining(data.rateLimitRemaining);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Failed to fetch commits";
        if (!controller.signal.aborted) {
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [repo, from, to, limit],
  );

  // Fetch first page when params change
  useEffect(() => {
    if (!repo) {
      setCommits([]);
      setHasMore(false);
      setTotal(null);
      setError(null);
      return;
    }

    fetchPage(1, false);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPage, repo]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPage(page + 1, true);
    }
  }, [isLoading, hasMore, page, fetchPage]);

  const retry = useCallback(() => {
    if (repo) {
      fetchPage(1, false);
    }
  }, [repo, fetchPage]);

  return { commits, isLoading, error, hasMore, total, rateLimitRemaining, loadMore, retry };
}
