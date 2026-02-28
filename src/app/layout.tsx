import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Developer Soundtrack — Listen to Your Code",
    template: "%s | Developer Soundtrack",
  },
  description:
    "Transform your GitHub commit history into generative, listenable music. Each commit becomes a musical event — languages set instruments, diffs control pitch, and CI status sets the key.",
  metadataBase: new URL(
    process.env.NEXTAUTH_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "Developer Soundtrack — Listen to Your Code",
    description:
      "Transform your GitHub commit history into generative, listenable music. Each commit becomes a musical event.",
    url: "/",
    siteName: "Developer Soundtrack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Soundtrack — Listen to Your Code",
    description:
      "Transform your GitHub commit history into generative, listenable music. Each commit becomes a musical event.",
  },
};

// Inline script to prevent flash of wrong theme on load
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('developer-soundtrack-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
