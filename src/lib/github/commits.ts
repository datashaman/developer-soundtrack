import type { Octokit } from "octokit";
import type { Commit, CIStatus } from "@/types";
import {
  getPrimaryLanguage,
  computeLanguageCounts,
  type FileChange,
} from "./languages";
import { commitToMusicalParams } from "../music/mapping";

export interface FetchCommitsOptions {
  owner: string;
  repo: string;
  since?: string;
  until?: string;
  page?: number;
  perPage?: number;
}

export interface FetchCommitsResult {
  commits: Commit[];
  hasMore: boolean;
  rateLimitRemaining: number | null;
}

/**
 * Fetch commits from a GitHub repository with pagination support.
 * Returns processed commits with language detection and musical parameters.
 */
export async function fetchCommits(
  octokit: Octokit,
  options: FetchCommitsOptions,
): Promise<FetchCommitsResult> {
  const {
    owner,
    repo,
    since,
    until,
    page = 1,
    perPage = 100,
  } = options;

  const response = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since,
    until,
    page,
    per_page: perPage,
  });

  const rateLimitRemaining = parseRateLimitHeader(
    response.headers["x-ratelimit-remaining"],
  );

  const commits: Commit[] = [];

  for (const item of response.data) {
    const detail = await fetchCommitDetail(octokit, owner, repo, item.sha);

    const files: FileChange[] = (detail.files ?? []).map((f) => ({
      filename: f.filename,
      changes: f.changes,
    }));

    const languages = computeLanguageCounts(files);
    const primaryLanguage = getPrimaryLanguage(files);

    const stats = {
      additions: detail.stats?.additions ?? 0,
      deletions: detail.stats?.deletions ?? 0,
      filesChanged: (detail.files ?? []).length,
    };

    const partialCommit: Commit = {
      id: item.sha,
      repoId: `${owner}/${repo}`,
      timestamp: item.commit.author?.date ?? new Date().toISOString(),
      author: item.author?.login ?? item.commit.author?.name ?? "unknown",
      message: item.commit.message,
      stats,
      primaryLanguage,
      languages,
      ciStatus: "unknown" as CIStatus,
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

    partialCommit.musicalParams = commitToMusicalParams(partialCommit);
    commits.push(partialCommit);
  }

  const hasMore = response.data.length === perPage;

  return { commits, hasMore, rateLimitRemaining };
}

/**
 * Fetch full commit details including diff stats and files.
 */
async function fetchCommitDetail(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
) {
  const response = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  });
  return response.data;
}

/**
 * Parse the X-RateLimit-Remaining header value.
 */
function parseRateLimitHeader(
  value: string | undefined,
): number | null {
  if (value === undefined) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}
