import type { Metadata } from "next";

interface Props {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo } = await params;
  const fullName = `${owner}/${repo}`;

  return {
    title: `${fullName} Live`,
    description: `Listen live to ${fullName} — hear commits as they are pushed in real-time.`,
    openGraph: {
      title: `${fullName} Live Soundtrack | Developer Soundtrack`,
      description: `Listen live to ${fullName} — hear commits as they are pushed in real-time.`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullName} Live Soundtrack | Developer Soundtrack`,
      description: `Listen live to ${fullName} — hear commits as they are pushed in real-time.`,
    },
  };
}

export default function LivePlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
