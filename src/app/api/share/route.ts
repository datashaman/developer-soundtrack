import { NextRequest, NextResponse } from "next/server";
import { getRepoByFullName } from "@/lib/db/repos";
import { getCommitsByRepo } from "@/lib/db/commits";

/**
 * GET /api/share?repo=owner/repo&from=ISO&to=ISO
 *
 * Returns cached commits for a public share link. No authentication required.
 * Only returns data that has been previously cached (from an authenticated user's play).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");

  if (!repo || !repo.includes("/")) {
    return NextResponse.json(
      { error: "Missing or invalid repo parameter (expected owner/repo)" },
      { status: 400 }
    );
  }

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const repoRow = await getRepoByFullName(repo);
    if (!repoRow) {
      return NextResponse.json(
        { error: "This soundtrack is not available. The owner may need to load it first." },
        { status: 404 }
      );
    }

    const { commits, total } = await getCommitsByRepo(repoRow.id, {
      from,
      to,
      limit: 500, // reasonable limit for shared links
      page: 1,
    });

    if (commits.length === 0) {
      return NextResponse.json(
        { error: "No commits found for this date range." },
        { status: 404 }
      );
    }

    return NextResponse.json({ commits, total });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load shared soundtrack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
