import { Octokit } from "octokit";

/**
 * Create an authenticated Octokit client using a GitHub access token.
 */
export function createOctokitClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}
