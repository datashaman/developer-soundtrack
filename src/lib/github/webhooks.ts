import type { Octokit } from "octokit";
import { randomBytes } from "crypto";
import { getRepoByFullName, updateRepo, createRepo } from "@/lib/db/repos";

export interface WebhookRegistrationResult {
  webhookId: string;
  webhookSecret: string;
  repoFullName: string;
}

/**
 * Generate a cryptographically secure webhook secret.
 */
function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Register a GitHub webhook for push and check_run events on a repository.
 * Generates a unique webhook secret, creates the webhook via the GitHub API,
 * and stores the webhook ID and secret in the repos table.
 */
export async function registerWebhook(
  octokit: Octokit,
  owner: string,
  repo: string,
  callbackUrl: string,
): Promise<WebhookRegistrationResult> {
  const fullName = `${owner}/${repo}`;
  const secret = generateWebhookSecret();

  // Check if repo already has a webhook registered
  const existingRepo = await getRepoByFullName(fullName);
  if (existingRepo?.webhook_id) {
    throw new WebhookAlreadyExistsError(
      `Webhook already registered for ${fullName} (ID: ${existingRepo.webhook_id})`,
    );
  }

  try {
    const response = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      config: {
        url: callbackUrl,
        content_type: "json",
        secret,
        insecure_ssl: "0",
      },
      events: ["push", "check_run"],
      active: true,
    });

    const webhookId = String(response.data.id);

    // Ensure repo exists in the database, then update with webhook info
    if (!existingRepo) {
      // Fetch repo info to get the numeric ID
      const repoInfo = await octokit.rest.repos.get({ owner, repo });
      await createRepo({
        id: String(repoInfo.data.id),
        fullName,
        description: repoInfo.data.description,
        defaultBranch: repoInfo.data.default_branch,
        language: repoInfo.data.language,
      });
      await updateRepo(String(repoInfo.data.id), {
        webhookId,
        webhookSecret: secret,
      });
    } else {
      await updateRepo(existingRepo.id, {
        webhookId,
        webhookSecret: secret,
      });
    }

    return { webhookId, webhookSecret: secret, repoFullName: fullName };
  } catch (error: unknown) {
    if (isGitHubApiError(error)) {
      if (error.status === 404 || error.status === 403) {
        throw new InsufficientPermissionsError(
          `Insufficient permissions to create webhook for ${fullName}. You need admin access to the repository.`,
        );
      }
      if (error.status === 422) {
        // GitHub returns 422 if webhook with same URL already exists
        throw new WebhookAlreadyExistsError(
          `A webhook with this URL already exists for ${fullName}.`,
        );
      }
    }
    throw error;
  }
}

/**
 * Remove a previously registered webhook from a repository.
 */
export async function removeWebhook(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  const fullName = `${owner}/${repo}`;
  const existingRepo = await getRepoByFullName(fullName);

  if (!existingRepo?.webhook_id) {
    throw new Error(`No webhook registered for ${fullName}`);
  }

  try {
    await octokit.rest.repos.deleteWebhook({
      owner,
      repo,
      hook_id: Number(existingRepo.webhook_id),
    });
  } catch (error: unknown) {
    // 404 means it was already deleted on GitHub's side — still clean up locally
    if (!isGitHubApiError(error) || error.status !== 404) {
      throw error;
    }
  }

  await updateRepo(existingRepo.id, {
    webhookId: null,
    webhookSecret: null,
  });
}

/**
 * Check whether a repository has an active webhook registered.
 */
export async function getWebhookStatus(
  owner: string,
  repo: string,
): Promise<{ registered: boolean; webhookId: string | null }> {
  const fullName = `${owner}/${repo}`;
  const existingRepo = await getRepoByFullName(fullName);
  return {
    registered: !!existingRepo?.webhook_id,
    webhookId: existingRepo?.webhook_id ?? null,
  };
}

// Custom error classes for webhook operations

export class WebhookAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookAlreadyExistsError";
  }
}

export class InsufficientPermissionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientPermissionsError";
  }
}

function isGitHubApiError(
  error: unknown,
): error is { status: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}
