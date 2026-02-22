"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-500 text-sm"
      >
        Loading…
      </button>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-300">
          {session.user?.name ?? session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("github")}
      className="px-4 py-2 rounded-md bg-[#00ffc8] hover:bg-[#00ddb0] text-black font-medium text-sm transition-colors"
    >
      Sign in with GitHub
    </button>
  );
}
