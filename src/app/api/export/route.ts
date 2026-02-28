import { NextRequest, NextResponse } from "next/server";
import { getCommitsByIds } from "@/lib/db/commits";

/**
 * POST /api/export
 *
 * Accepts commit IDs and returns the full commit objects.
 * Used when the client has IDs (e.g. from a shared link) but needs
 * full commit data for rendering. The actual WAV export happens
 * client-side via Tone.Offline() since Web Audio API is browser-only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commitIds } = body as { commitIds?: string[] };

    if (!Array.isArray(commitIds) || commitIds.length === 0) {
      return NextResponse.json(
        { error: "commitIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    const commits = await getCommitsByIds(commitIds);
    return NextResponse.json({ commits });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch commits for export";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
