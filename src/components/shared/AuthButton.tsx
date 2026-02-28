"use client";

import { useSession, signIn, signOut } from "next-auth/react";

interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className }: AuthButtonProps = {}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-md bg-btn-secondary-bg text-text-muted text-sm"
      >
        Loading…
      </button>
    );
  }

  if (session) {
    return (
      <div className={`flex items-center gap-3 ${className ?? ""}`}>
        <span className="text-sm text-text-secondary">
          {session.user?.name ?? session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-md bg-btn-secondary-bg hover:bg-btn-secondary-hover text-btn-secondary-text text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className={`px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-background font-medium text-sm transition-colors ${className ?? ""}`}
    >
      Sign in with GitHub
    </button>
  );
}
