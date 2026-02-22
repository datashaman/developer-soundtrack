import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { TestPlayer } from "@/components/player/TestPlayer";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <LandingPage />;
  }

  // Authenticated: show player (will become dashboard in US-026)
  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#00ffc8] font-mono">
          Developer Soundtrack
        </h1>
        <p className="mb-8 text-sm text-white/50">
          Audio engine test — hardcoded sample commits
        </p>
        <TestPlayer />
      </main>
    </div>
  );
}
