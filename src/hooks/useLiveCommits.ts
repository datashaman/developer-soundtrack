"use client";

import { useEffect, useRef, useState } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import type { Channel } from "pusher-js";
import type { Commit } from "@/types";

interface UseLiveCommitsReturn {
  /** The most recently received commit from Pusher */
  latestCommit: Commit | null;
  /** Whether the Pusher connection is currently active */
  isConnected: boolean;
  /** Error message if connection failed */
  error: string | null;
}

export function useLiveCommits(repo: string | null): UseLiveCommitsReturn {
  const [latestCommit, setLatestCommit] = useState<Commit | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevRepo, setPrevRepo] = useState<string | null>(repo);

  const channelRef = useRef<Channel | null>(null);

  // Reset state during render when repo changes to null
  if (repo !== prevRepo) {
    setPrevRepo(repo);
    if (!repo) {
      setIsConnected(false);
      setLatestCommit(null);
      setError(null);
    }
  }

  useEffect(() => {
    if (!repo) {
      return;
    }

    const pusher = getPusherClient();
    const [owner, repoName] = repo.split("/");
    const channelName = `repo-${owner}-${repoName}`;

    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("commits", (commits: Commit[]) => {
      console.log(`[Pusher] Received ${commits.length} commit(s) on ${channelName}`, commits);
      if (commits.length > 0) {
        setLatestCommit(commits[commits.length - 1]);
      }
    });

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Pusher] Subscribed to ${channelName}`);
      setIsConnected(true);
      setError(null);
    });

    channel.bind("pusher:subscription_error", () => {
      console.warn(`[Pusher] Subscription error on ${channelName}`);
      setIsConnected(false);
      setError("Failed to subscribe to live updates.");
    });

    pusher.connection.bind("connected", () => {
      console.log("[Pusher] Connected");
      setIsConnected(true);
      setError(null);
    });

    pusher.connection.bind("error", () => {
      console.warn("[Pusher] Connection error");
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");
    });

    pusher.connection.bind("disconnected", () => {
      console.warn("[Pusher] Disconnected");
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      pusher.connection.unbind("connected");
      pusher.connection.unbind("error");
      pusher.connection.unbind("disconnected");
    };
  }, [repo]);

  return { latestCommit, isConnected, error };
}
