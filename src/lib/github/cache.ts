import type { Octokit } from "octokit";
import type { Commit } from "@/types";
import { getCommitsByRepo, createCommits } from "../db/commits";
import {
  getRepoByFullName,
  createRepo,
  updateRepo,
} from "../db/repos";
import { fetchCommits } from "./commits";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const RECENT_DATA_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Determine if cached data for a repo is stale and needs refreshing.
 *
 * - If we've never fetched, it's stale.
 * - If the query includes recent data (within the last 24 hours), data is stale
 *   after 5 minutes.
 * - If the query only covers historical data (older than 24 hours), cache permanently.
 */
export function isCacheStale(
  lastFetchedAt: string | null,
  queryTo?: string,
): boolean {
  if (!lastFetchedAt) return true;

  const fetchedTime = new Date(lastFetchedAt).getTime();
  const now = Date.now();

  // If the query's "to" date is older than 24 hours, the data is historical — cache permanently
  if (queryTo) {
    const toTime = new Date(queryTo).getTime();
    if (now - toTime > RECENT_DATA_THRESHOLD_MS) {
      return false;
    }
  }

  // Recent data: stale after 5 minutes
  return now - fetchedTime > STALE_THRESHOLD_MS;
}

export interface CachedCommitsOptions {
  repo: string; // "owner/repo" format
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CachedCommitsResult {
  commits: Commit[];
  total: number;
  page: number;
  hasMore: boolean;
  fromCache: boolean;
}

/**
 * Get commits with caching. Checks SQLite first; on cache miss or stale data,
 * fetches from GitHub, stores in SQLite, then returns.
 */
export async function getCachedCommits(
  octokit: Octokit,
  options: CachedCommitsOptions,
): Promise<CachedCommitsResult> {
  const { repo, from, to, page = 1, limit = 100 } = options;
  const [owner, repoName] = repo.split("/");

  const repoRow = getRepoByFullName(repo);

  if (repoRow && !isCacheStale(repoRow.last_fetched_at, to)) {
    // Cache hit — return from SQLite
    const { commits, total } = getCommitsByRepo(repoRow.id, {
      from,
      to,
      page,
      limit,
    });
    const hasMore = page * limit < total;
    return { commits, total, page, hasMore, fromCache: true };
  }

  // Cache miss or stale — fetch from GitHub
  const allCommits: Commit[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const result = await fetchCommits(octokit, {
      owner,
      repo: repoName,
      since: from,
      until: to,
      page: currentPage,
      perPage: 100,
    });

    allCommits.push(...result.commits);
    hasMorePages = result.hasMore;
    currentPage++;
  }

  // Ensure repo exists in DB
  let repoId: string;
  if (repoRow) {
    repoId = repoRow.id;
  } else {
    const created = createRepo({
      id: repo,
      fullName: repo,
    });
    repoId = created.id;
  }

  // Store commits in SQLite
  if (allCommits.length > 0) {
    createCommits(allCommits);
  }

  // Update last_fetched_at
  updateRepo(repoId, {
    lastFetchedAt: new Date().toISOString(),
  });

  // Return the requested page from the fresh data
  const { commits, total } = getCommitsByRepo(repoId, {
    from,
    to,
    page,
    limit,
  });
  const hasMore = page * limit < total;

  return { commits, total, page, hasMore, fromCache: false };
}
