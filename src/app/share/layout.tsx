import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Soundtrack",
  description: "Listen to a shared Developer Soundtrack",
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
