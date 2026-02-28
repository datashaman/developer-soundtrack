import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/db/settings";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user?.email;
  if (!userId) {
    return NextResponse.json(
      { error: "Unable to identify user" },
      { status: 400 },
    );
  }

  try {
    const settings = await getSettings(userId);
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user?.email;
  if (!userId) {
    return NextResponse.json(
      { error: "Unable to identify user" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }

  try {
    const current = await getSettings(userId);
    const merged = { ...current, ...(body as Record<string, unknown>), userId };
    const settings = await saveSettings(merged as Parameters<typeof saveSettings>[0]);
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
