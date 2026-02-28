import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sseEventBus } from "@/lib/sse/event-bus";
import type { Commit } from "@/types";

/**
 * GET /api/live?repo=owner/repo
 *
 * Server-Sent Events endpoint for live commit streaming.
 * Clients subscribe to a repository and receive new commits in real-time
 * as they arrive via webhook events.
 *
 * SSE event format:
 *   event: commits
 *   data: [Commit, ...]
 *
 * Also sends periodic heartbeat events to keep the connection alive:
 *   event: heartbeat
 *   data: {"time":"..."}
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const repoParam = request.nextUrl.searchParams.get("repo");
  if (!repoParam || !repoParam.includes("/")) {
    return new Response(
      JSON.stringify({
        error:
          "Missing or invalid 'repo' query parameter (format: owner/repo)",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: string, data: string): boolean {
        if (closed) return false;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
          );
          return true;
        } catch {
          closed = true;
          return false;
        }
      }

      // Send initial connected event
      send("connected", JSON.stringify({ repo: repoParam }));

      // Subscribe to commits for this repo
      const clientId = sseEventBus.subscribe(
        repoParam,
        (commits: Commit[]) => {
          return send("commits", JSON.stringify(commits));
        },
      );

      // Heartbeat to keep connection alive (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        const alive = send(
          "heartbeat",
          JSON.stringify({ time: new Date().toISOString() }),
        );
        if (!alive) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Handle client disconnect via AbortSignal
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeatInterval);
        sseEventBus.unsubscribe(repoParam, clientId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
