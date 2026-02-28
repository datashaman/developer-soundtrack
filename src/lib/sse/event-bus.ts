import type { Commit } from "@/types";

/**
 * A callback function that receives new commits for a subscribed repo.
 * Returns false if the client has disconnected and should be removed.
 */
type SSEClientCallback = (commits: Commit[]) => boolean;

interface SSEClient {
  id: string;
  callback: SSEClientCallback;
}

/**
 * In-memory event bus for Server-Sent Events.
 * Routes new commits from webhook events to connected SSE clients
 * subscribed to the corresponding repository.
 */
class SSEEventBus {
  /** Map of repo full name → connected clients */
  private clients: Map<string, SSEClient[]> = new Map();
  private nextId = 0;

  /**
   * Subscribe a client to receive commits for a specific repository.
   * Returns a client ID that can be used to unsubscribe.
   */
  subscribe(repo: string, callback: SSEClientCallback): string {
    const id = String(++this.nextId);
    const clients = this.clients.get(repo) ?? [];
    clients.push({ id, callback });
    this.clients.set(repo, clients);
    return id;
  }

  /**
   * Unsubscribe a client by ID from a specific repository.
   */
  unsubscribe(repo: string, clientId: string): void {
    const clients = this.clients.get(repo);
    if (!clients) return;

    const filtered = clients.filter((c) => c.id !== clientId);
    if (filtered.length === 0) {
      this.clients.delete(repo);
    } else {
      this.clients.set(repo, filtered);
    }
  }

  /**
   * Broadcast new commits to all clients subscribed to a repository.
   * Automatically removes clients that return false (disconnected).
   */
  broadcast(repo: string, commits: Commit[]): void {
    const clients = this.clients.get(repo);
    if (!clients || clients.length === 0) return;

    const active: SSEClient[] = [];
    for (const client of clients) {
      const stillConnected = client.callback(commits);
      if (stillConnected) {
        active.push(client);
      }
    }

    if (active.length === 0) {
      this.clients.delete(repo);
    } else {
      this.clients.set(repo, active);
    }
  }

  /**
   * Get the number of connected clients for a repository.
   */
  getClientCount(repo: string): number {
    return this.clients.get(repo)?.length ?? 0;
  }

  /**
   * Get total number of connected clients across all repos.
   */
  getTotalClientCount(): number {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.length;
    }
    return total;
  }
}

/**
 * Singleton SSE event bus instance shared across the application.
 * Used by the webhook receiver to broadcast and by the SSE endpoint to subscribe.
 */
export const sseEventBus = new SSEEventBus();
