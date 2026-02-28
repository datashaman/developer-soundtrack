"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeContext, useThemeProvider } from "@/hooks/useTheme";

export function Providers({ children }: { children: React.ReactNode }) {
  const themeValue = useThemeProvider();

  return (
    <SessionProvider>
      <ThemeContext value={themeValue}>
        {children}
      </ThemeContext>
    </SessionProvider>
  );
}
