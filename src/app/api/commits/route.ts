import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOctokitClient } from "@/lib/github/client";
import { getCachedCommits } from "@/lib/github/cache";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json(
      { error: "Missing required parameter: repo" },
      { status: 400 },
    );
  }

  if (!repo.includes("/")) {
    return NextResponse.json(
      { error: "Invalid repo format. Expected: owner/repo" },
      { status: 400 },
    );
  }

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  if (isNaN(page) || page < 1) {
    return NextResponse.json(
      { error: "Invalid page parameter" },
      { status: 400 },
    );
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Invalid limit parameter. Must be between 1 and 100" },
      { status: 400 },
    );
  }

  try {
    const octokit = createOctokitClient(session.accessToken);
    const result = await getCachedCommits(octokit, {
      repo,
      from,
      to,
      page,
      limit,
    });

    return NextResponse.json({
      commits: result.commits,
      total: result.total,
      page: result.page,
      hasMore: result.hasMore,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch commits";
    const status =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
