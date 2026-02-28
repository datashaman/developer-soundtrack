// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { NowPlaying } from "./NowPlaying";
import type { Commit } from "@/types";

afterEach(() => {
  cleanup();
});

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "test/repo",
    timestamp: "2025-03-10T14:30:00Z",
    author: "alice",
    message: "Add new feature for user profiles",
    stats: { additions: 142, deletions: 23, filesChanged: 5 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 120, CSS: 22 },
    ciStatus: "pass",
    musicalParams: {
      instrument: "FMSynth",
      note: "E4",
      duration: 1.1,
      velocity: 0.5,
      octave: 4,
      scale: "major",
      pan: -0.3,
      effects: { reverb: 0.2, delay: 0 },
    },
    ...overrides,
  };
}

describe("NowPlaying", () => {
  it("renders empty state when no commit is playing", () => {
    const { getByText } = render(<NowPlaying currentCommit={null} />);
    expect(getByText("Press play to start the soundtrack")).toBeTruthy();
  });

  it("displays author initial and login", () => {
    const commit = makeCommit({ author: "alice" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("A")).toBeTruthy();
    expect(getByText("alice")).toBeTruthy();
  });

  it("displays commit message", () => {
    const commit = makeCommit({ message: "Fix critical bug in auth flow" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Fix critical bug in auth flow")).toBeTruthy();
  });

  it("displays language name", () => {
    const commit = makeCommit({ primaryLanguage: "Python" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Python")).toBeTruthy();
  });

  it("displays diff stats with additions and deletions", () => {
    const commit = makeCommit({
      stats: { additions: 142, deletions: 23, filesChanged: 5 },
    });
    const { container } = render(<NowPlaying currentCommit={commit} />);
    const html = container.innerHTML;
    expect(html).toContain("+142");
    expect(html).toContain("23");
    expect(html).toContain("text-green-400");
    expect(html).toContain("text-red-400");
  });

  it("displays CI status badge for pass", () => {
    const commit = makeCommit({ ciStatus: "pass" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Passed")).toBeTruthy();
  });

  it("displays CI status badge for fail", () => {
    const commit = makeCommit({ ciStatus: "fail" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Failed")).toBeTruthy();
  });

  it("displays CI status badge for pending", () => {
    const commit = makeCommit({ ciStatus: "pending" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Pending")).toBeTruthy();
  });

  it("displays CI status badge for unknown", () => {
    const commit = makeCommit({ ciStatus: "unknown" });
    const { getByText } = render(<NowPlaying currentCommit={commit} />);
    expect(getByText("Unknown")).toBeTruthy();
  });

  it("displays musical info line", () => {
    const commit = makeCommit({
      musicalParams: {
        instrument: "AMSynth",
        note: "C4",
        duration: 0.8,
        velocity: 0.6,
        octave: 4,
        scale: "major",
        pan: -0.3,
        effects: { reverb: 0.2, delay: 0 },
      },
    });
    const { container } = render(<NowPlaying currentCommit={commit} />);
    const html = container.innerHTML;
    expect(html).toContain("AMSynth");
    expect(html).toContain("C4");
    expect(html).toContain("major");
    expect(html).toContain("0.80s");
    expect(html).toContain("pan:");
    expect(html).toContain("-0.3");
  });

  it("applies entrance animation on commit change", () => {
    const commit1 = makeCommit({ id: "commit-1" });
    const commit2 = makeCommit({ id: "commit-2", author: "bob" });

    const { container, rerender } = render(<NowPlaying currentCommit={commit1} />);

    // The animate class should be present
    const firstAnimDiv = container.querySelector("[class*='animate-']");
    expect(firstAnimDiv).toBeTruthy();

    // Rerender with a different commit
    rerender(<NowPlaying currentCommit={commit2} />);
    const secondAnimDiv = container.querySelector("[class*='animate-']");
    expect(secondAnimDiv).toBeTruthy();
  });

  it("uses line-clamp-2 for message truncation", () => {
    const commit = makeCommit({
      message:
        "This is a very long commit message that should be truncated to two lines when displayed in the now playing card component because we want to keep things compact",
    });
    const { container } = render(<NowPlaying currentCommit={commit} />);
    const msgEl = container.querySelector(".line-clamp-2");
    expect(msgEl).toBeTruthy();
    expect(msgEl?.textContent).toContain("This is a very long commit message");
  });

  it("renders language color dot", () => {
    const commit = makeCommit({ primaryLanguage: "TypeScript" });
    const { container } = render(<NowPlaying currentCommit={commit} />);
    const dots = container.querySelectorAll(".rounded-full");
    // Should have language dot (among other round elements like avatar)
    const langDot = Array.from(dots).find(
      (el) => (el as HTMLElement).style.backgroundColor === "rgb(49, 120, 198)" // #3178c6
    );
    expect(langDot).toBeTruthy();
  });

  it("handles unknown language with fallback color", () => {
    const commit = makeCommit({ primaryLanguage: "Haskell" });
    const { container } = render(<NowPlaying currentCommit={commit} />);
    const dots = container.querySelectorAll(".rounded-full");
    const langDot = Array.from(dots).find(
      (el) => (el as HTMLElement).style.backgroundColor === "rgb(0, 255, 200)" // #00ffc8
    );
    expect(langDot).toBeTruthy();
  });
});
