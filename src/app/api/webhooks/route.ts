import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOctokitClient } from "@/lib/github/client";
import {
  registerWebhook,
  removeWebhook,
  getWebhookStatus,
  WebhookAlreadyExistsError,
  InsufficientPermissionsError,
} from "@/lib/github/webhooks";

/**
 * GET /api/webhooks?repo=owner/repo
 * Check webhook registration status for a repository.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repoParam = request.nextUrl.searchParams.get("repo");
  if (!repoParam || !repoParam.includes("/")) {
    return NextResponse.json(
      { error: "Missing or invalid 'repo' query parameter (format: owner/repo)" },
      { status: 400 },
    );
  }

  const [owner, repo] = repoParam.split("/");

  try {
    const status = await getWebhookStatus(owner, repo);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to check webhook status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/webhooks
 * Register a webhook for live mode on a repository.
 * Body: { repo: "owner/repo" }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoParam = body.repo;
  if (!repoParam || !repoParam.includes("/")) {
    return NextResponse.json(
      { error: "Missing or invalid 'repo' field (format: owner/repo)" },
      { status: 400 },
    );
  }

  const [owner, repo] = repoParam.split("/");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/webhook`;

  try {
    const octokit = createOctokitClient(session.accessToken);
    const result = await registerWebhook(octokit, owner, repo, callbackUrl);
    return NextResponse.json({
      registered: true,
      webhookId: result.webhookId,
      repoFullName: result.repoFullName,
    });
  } catch (error: unknown) {
    if (error instanceof WebhookAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InsufficientPermissionsError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to register webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks?repo=owner/repo
 * Remove webhook for a repository, disabling live mode.
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repoParam = request.nextUrl.searchParams.get("repo");
  if (!repoParam || !repoParam.includes("/")) {
    return NextResponse.json(
      { error: "Missing or invalid 'repo' query parameter (format: owner/repo)" },
      { status: 400 },
    );
  }

  const [owner, repo] = repoParam.split("/");

  try {
    const octokit = createOctokitClient(session.accessToken);
    await removeWebhook(octokit, owner, repo);
    return NextResponse.json({ registered: false, repoFullName: repoParam });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to remove webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
