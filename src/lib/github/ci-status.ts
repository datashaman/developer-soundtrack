import type { Octokit } from "octokit";
import type { CIStatus } from "@/types";

/**
 * Fetch CI status for a commit by checking GitHub Check Runs.
 * Maps check run conclusions to a CIStatus:
 * - any failure → "fail"
 * - all success → "pass"
 * - any still running/queued → "pending"
 * - no checks → "unknown"
 */
export async function fetchCIStatus(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<CIStatus> {
  const response = await octokit.rest.checks.listForRef({
    owner,
    repo,
    ref: sha,
  });

  const checkRuns = response.data.check_runs;

  if (checkRuns.length === 0) {
    return "unknown";
  }

  for (const run of checkRuns) {
    if (
      run.conclusion === "failure" ||
      run.conclusion === "timed_out" ||
      run.conclusion === "cancelled"
    ) {
      return "fail";
    }
  }

  for (const run of checkRuns) {
    if (
      run.status === "queued" ||
      run.status === "in_progress" ||
      run.status === "pending"
    ) {
      return "pending";
    }
  }

  return "pass";
}
