import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDistinctAuthors } from "@/lib/db/commits";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authors = await getDistinctAuthors();
    return NextResponse.json({ authors });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch authors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
