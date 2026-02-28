import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getRepoByFullName } from "@/lib/db/repos";
import { createCommits } from "@/lib/db/commits";
import {
  getPrimaryLanguage,
  computeLanguageCounts,
  type FileChange,
} from "@/lib/github/languages";
import { commitToMusicalParams } from "@/lib/music/mapping";
import { getPusher } from "@/lib/pusher/server";
import type { Commit, CIStatus } from "@/types";

/**
 * Verify the X-Hub-Signature-256 header against the stored webhook secret.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected =
    "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

interface PushEventCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

interface PushEventPayload {
  ref: string;
  repository: {
    id: number;
    full_name: string;
  };
  commits: PushEventCommit[];
}

/**
 * Process a push event payload into Commit objects.
 */
function processPushCommits(
  payload: PushEventPayload,
): Commit[] {
  const repoFullName = payload.repository.full_name;

  return payload.commits.map((c) => {
    const allFiles = [...c.added, ...c.modified, ...c.removed];
    const files: FileChange[] = allFiles.map((f) => ({
      filename: f,
      changes: 1,
    }));

    const languages = computeLanguageCounts(files);
    const primaryLanguage = getPrimaryLanguage(files);

    const stats = {
      additions: c.added.length + c.modified.length,
      deletions: c.removed.length,
      filesChanged: allFiles.length,
    };

    const ciStatus: CIStatus = "unknown";

    const commit: Commit = {
      id: c.id,
      repoId: repoFullName,
      timestamp: c.timestamp,
      author: c.author.username ?? c.author.name,
      message: c.message,
      stats,
      primaryLanguage,
      languages,
      ciStatus,
      musicalParams: {
        instrument: "",
        note: "",
        duration: 0,
        velocity: 0,
        octave: 0,
        scale: "major",
        pan: 0,
        effects: { reverb: 0, delay: 0 },
      },
    };

    commit.musicalParams = commitToMusicalParams(commit);
    return commit;
  });
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 },
    );
  }

  if (!rawBody) {
    return NextResponse.json(
      { error: "Empty request body" },
      { status: 400 },
    );
  }

  // Parse payload
  let payload: PushEventPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  // Validate payload structure
  if (!payload.repository?.full_name) {
    return NextResponse.json(
      { error: "Malformed payload: missing repository information" },
      { status: 400 },
    );
  }

  // Look up the repo and its webhook secret
  const repo = await getRepoByFullName(payload.repository.full_name);
  if (!repo?.webhook_secret) {
    return NextResponse.json(
      { error: "No webhook registered for this repository" },
      { status: 401 },
    );
  }

  // Validate signature
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Hub-Signature-256 header" },
      { status: 401 },
    );
  }

  if (!verifySignature(rawBody, signature, repo.webhook_secret)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  // Check event type — only process push events
  const event = request.headers.get("x-github-event");
  if (event === "ping") {
    return NextResponse.json({ message: "pong" });
  }

  if (event !== "push") {
    return NextResponse.json(
      { message: `Event type '${event}' ignored` },
      { status: 200 },
    );
  }

  // Process commits from push event
  if (!Array.isArray(payload.commits) || payload.commits.length === 0) {
    return NextResponse.json({
      message: "No commits in push event",
      processed: 0,
    });
  }

  const commits = processPushCommits(payload);

  // Store in SQLite
  await createCommits(commits);

  // Broadcast to Pusher channel for this repo (lowercase for consistent matching)
  const [repoOwner, repoName] = payload.repository.full_name.toLowerCase().split("/");
  const channel = `repo-${repoOwner}-${repoName}`;
  await getPusher().trigger(channel, "commits", commits);

  return NextResponse.json({
    message: "Webhook processed successfully",
    processed: commits.length,
  });
}
