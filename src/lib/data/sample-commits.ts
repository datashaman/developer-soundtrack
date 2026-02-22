import type { Commit } from "@/types";
import { commitToMusicalParams } from "@/lib/music/mapping";

/**
 * Raw commit data without musicalParams — we compute those dynamically
 * to keep the sample data consistent with the mapping logic.
 */
const rawCommits: Omit<Commit, "musicalParams">[] = [
  {
    id: "a1b2c3d",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T09:15:00Z",
    author: "alice",
    message: "feat: add user authentication flow",
    stats: { additions: 142, deletions: 23, filesChanged: 6 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 120, CSS: 22 },
    ciStatus: "pass",
  },
  {
    id: "b2c3d4e",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T10:30:00Z",
    author: "bob",
    message: "fix: resolve race condition in WebSocket handler",
    stats: { additions: 28, deletions: 12, filesChanged: 2 },
    primaryLanguage: "Python",
    languages: { Python: 28 },
    ciStatus: "pass",
  },
  {
    id: "c3d4e5f",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T11:00:00Z",
    author: "carol",
    message: "Merge pull request #42 from feature/dashboard",
    stats: { additions: 350, deletions: 80, filesChanged: 12 },
    primaryLanguage: "JavaScript",
    languages: { JavaScript: 250, CSS: 60, HTML: 40 },
    ciStatus: "pass",
  },
  {
    id: "d4e5f6a",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T14:22:00Z",
    author: "dave",
    message: "refactor: optimize database query performance",
    stats: { additions: 65, deletions: 90, filesChanged: 4 },
    primaryLanguage: "Rust",
    languages: { Rust: 65 },
    ciStatus: "fail",
  },
  {
    id: "e5f6a7b",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T15:45:00Z",
    author: "alice",
    message: "docs: update API documentation",
    stats: { additions: 200, deletions: 30, filesChanged: 3 },
    primaryLanguage: "Markdown",
    languages: { Markdown: 200 },
    ciStatus: "pass",
  },
  {
    id: "f6a7b8c",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T16:10:00Z",
    author: "eve",
    message: "feat: implement CLI build script",
    stats: { additions: 45, deletions: 5, filesChanged: 1 },
    primaryLanguage: "Shell",
    languages: { Shell: 45 },
    ciStatus: "unknown",
  },
  {
    id: "a7b8c9d",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-10T17:30:00Z",
    author: "bob",
    message: "Revert \"feat: add experimental caching layer\"",
    stats: { additions: 10, deletions: 120, filesChanged: 5 },
    primaryLanguage: "Go",
    languages: { Go: 10 },
    ciStatus: "pass",
  },
  {
    id: "b8c9d0e",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-11T08:00:00Z",
    author: "carol",
    message: "feat: add responsive navigation component",
    stats: { additions: 180, deletions: 15, filesChanged: 7 },
    primaryLanguage: "Java",
    languages: { Java: 140, CSS: 40 },
    ciStatus: "pass",
  },
  {
    id: "c9d0e1f",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-11T09:15:00Z",
    author: "dave",
    message: "fix: correct memory leak in event listener",
    stats: { additions: 8, deletions: 3, filesChanged: 1 },
    primaryLanguage: "C++",
    languages: { "C++": 8 },
    ciStatus: "fail",
  },
  {
    id: "d0e1f2a",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-11T10:45:00Z",
    author: "eve",
    message: "style: redesign landing page hero section",
    stats: { additions: 95, deletions: 42, filesChanged: 3 },
    primaryLanguage: "CSS",
    languages: { CSS: 55, HTML: 40 },
    ciStatus: "pass",
  },
  {
    id: "e1f2a3b",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-11T11:30:00Z",
    author: "alice",
    message: "feat: add Ruby gem integration for analytics",
    stats: { additions: 112, deletions: 8, filesChanged: 4 },
    primaryLanguage: "Ruby",
    languages: { Ruby: 112 },
    ciStatus: "pending",
  },
  {
    id: "f2a3b4c",
    repoId: "demo/developer-soundtrack",
    timestamp: "2025-03-11T23:50:00Z",
    author: "bob",
    message: "chore: late night hotfix for production error",
    stats: { additions: 15, deletions: 5, filesChanged: 2 },
    primaryLanguage: "Python",
    languages: { Python: 15 },
    ciStatus: "pass",
  },
];

/**
 * Hardcoded sample commits with musical parameters computed from the mapping logic.
 * Includes merge commits, a revert commit, first-of-day commits, CI failures,
 * multiple languages, and multiple authors for comprehensive testing.
 */
export const SAMPLE_COMMITS: Commit[] = rawCommits.map((raw) => {
  const commit = { ...raw, musicalParams: {} as Commit["musicalParams"] };
  commit.musicalParams = commitToMusicalParams(commit as Commit);
  return commit as Commit;
});
