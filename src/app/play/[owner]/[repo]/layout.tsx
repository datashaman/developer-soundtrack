import type { Metadata } from "next";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo } = await params;
  const fullName = `${owner}/${repo}`;

  return {
    title: `${fullName} Soundtrack`,
    description: `Listen to the soundtrack of ${fullName} — each commit transformed into generative music.`,
    openGraph: {
      title: `${fullName} Soundtrack | Developer Soundtrack`,
      description: `Listen to the soundtrack of ${fullName} — each commit transformed into generative music.`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullName} Soundtrack | Developer Soundtrack`,
      description: `Listen to the soundtrack of ${fullName} — each commit transformed into generative music.`,
    },
  };
}

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
