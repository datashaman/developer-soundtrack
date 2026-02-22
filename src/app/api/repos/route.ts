import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOctokitClient } from "@/lib/github/client";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const octokit = createOctokitClient(session.accessToken);
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "pushed",
      direction: "desc",
      per_page: 100,
    });

    const repos = data.map((repo) => ({
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      pushedAt: repo.pushed_at,
    }));

    return NextResponse.json({ repos });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch repositories";
    const status =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
