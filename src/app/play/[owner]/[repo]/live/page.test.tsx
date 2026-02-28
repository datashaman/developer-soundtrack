// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, act, waitFor } from "@testing-library/react";
import type { Commit } from "@/types";

// Mock next/navigation
const mockParams = { owner: "octocat", repo: "hello-world" };
vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));

// Mock hooks
const mockUseLiveCommits = vi.fn<() => { latestCommit: Commit | null; isConnected: boolean; error: string | null }>();
vi.mock("@/hooks/useLiveCommits", () => ({
  useLiveCommits: (...args: unknown[]) => mockUseLiveCommits(...(args as [])),
}));

const mockPlay = vi.fn<(commits: Commit[], startIndex?: number) => Promise<void>>().mockResolvedValue(undefined);
const mockSetVolume = vi.fn();
const mockGetWaveformData = vi.fn(() => new Float32Array(0));

const mockUseMusicEngine = vi.fn(() => ({
  isPlaying: false,
  currentCommit: null,
  currentIndex: 0,
  progress: 0,
  play: mockPlay,
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  seekTo: vi.fn(),
  setTempo: vi.fn(),
  setVolume: mockSetVolume,
  getWaveformData: mockGetWaveformData,
  getFFTData: vi.fn(() => new Float32Array(0)),
}));
vi.mock("@/hooks/useMusicEngine", () => ({
  useMusicEngine: () => mockUseMusicEngine(),
}));

// Mock child components to avoid rendering complexity
vi.mock("@/components/player/WaveformVisualizer", () => ({
  WaveformVisualizer: () => <div data-testid="waveform-visualizer" />,
}));
vi.mock("@/components/player/NowPlaying", () => ({
  NowPlaying: ({ currentCommit, compact }: { currentCommit: Commit | null; compact?: boolean }) => (
    <div data-testid={compact ? "now-playing-compact" : "now-playing"}>
      {currentCommit?.message ?? "No commit"}
    </div>
  ),
}));
vi.mock("@/components/player/Timeline", () => ({
  Timeline: ({ commits, onSeek }: { commits: Commit[]; onSeek: (i: number) => void }) => (
    <div data-testid="timeline" data-count={commits.length}>
      <button onClick={() => onSeek(0)}>seek-0</button>
    </div>
  ),
}));
vi.mock("@/components/player/MobileCommitList", () => ({
  MobileCommitList: ({ commits }: { commits: Commit[] }) => (
    <div data-testid="mobile-commit-list" data-count={commits.length} />
  ),
}));
vi.mock("@/components/player/InstrumentLegend", () => ({
  InstrumentLegend: ({ activeLanguages }: { activeLanguages: string[] }) => (
    <div data-testid="instrument-legend" data-languages={activeLanguages.join(",")} />
  ),
}));

import LivePlayerPage from "./page";

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "octocat/hello-world",
    timestamp: "2025-03-10T14:30:00Z",
    author: "alice",
    message: "Add new feature",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 50 },
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LivePlayerPage", () => {
  beforeEach(() => {
    mockUseLiveCommits.mockReturnValue({
      latestCommit: null,
      isConnected: true,
      error: null,
    });
  });

  it("renders the page with repo name and LIVE indicator", () => {
    const { getAllByText, getByText, getByTestId } = render(<LivePlayerPage />);
    expect(getAllByText("octocat/hello-world").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Live")).toBeTruthy();
    expect(getByTestId("live-indicator")).toBeTruthy();
  });

  it("shows 'Waiting for commits...' when connected with no commits", () => {
    const { getByTestId, getByText } = render(<LivePlayerPage />);
    expect(getByTestId("waiting-state")).toBeTruthy();
    expect(getByText("Waiting for commits...")).toBeTruthy();
  });

  it("shows connecting state when not yet connected", () => {
    mockUseLiveCommits.mockReturnValue({
      latestCommit: null,
      isConnected: false,
      error: null,
    });
    const { getByText } = render(<LivePlayerPage />);
    expect(getByText("Connecting to live stream...")).toBeTruthy();
  });

  it("shows error message when connection error occurs", () => {
    mockUseLiveCommits.mockReturnValue({
      latestCommit: null,
      isConnected: false,
      error: "Connection lost. Reconnecting...",
    });
    const { getByText } = render(<LivePlayerPage />);
    expect(getByText("Connection lost. Reconnecting...")).toBeTruthy();
  });

  it("renders waveform visualizer always", () => {
    const { getByTestId } = render(<LivePlayerPage />);
    expect(getByTestId("waveform-visualizer")).toBeTruthy();
  });

  it("plays a commit immediately when received", async () => {
    const commit = makeCommit();
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    render(<LivePlayerPage />);

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledWith([commit], 0);
    });
  });

  it("shows timeline and now-playing when commits arrive", async () => {
    const commit = makeCommit();
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    const { getByTestId } = render(<LivePlayerPage />);

    await waitFor(() => {
      const timeline = getByTestId("timeline");
      expect(timeline.getAttribute("data-count")).toBe("1");
    });
  });

  it("accumulates multiple commits in timeline", async () => {
    const commit1 = makeCommit({ id: "commit-1", message: "First commit" });
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit1,
      isConnected: true,
      error: null,
    });

    const { getByTestId, rerender } = render(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("timeline").getAttribute("data-count")).toBe("1");
    });

    // Simulate a second commit arriving
    const commit2 = makeCommit({ id: "commit-2", message: "Second commit", primaryLanguage: "Python" });
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit2,
      isConnected: true,
      error: null,
    });

    rerender(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("timeline").getAttribute("data-count")).toBe("2");
    });
  });

  it("does not duplicate commits with same id", async () => {
    const commit = makeCommit({ id: "same-id" });
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    const { getByTestId, rerender } = render(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("timeline").getAttribute("data-count")).toBe("1");
    });

    // Re-render with same commit (same id)
    rerender(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("timeline").getAttribute("data-count")).toBe("1");
    });
  });

  it("shows instrument legend with active languages", async () => {
    const commit = makeCommit({ primaryLanguage: "TypeScript" });
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    const { getByTestId } = render(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("instrument-legend").getAttribute("data-languages")).toBe("TypeScript");
    });
  });

  it("shows commit count in header", async () => {
    const commit = makeCommit();
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    const { getByText } = render(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByText("1 commits received")).toBeTruthy();
    });
  });

  it("shows reconnecting text in header when disconnected with error", () => {
    mockUseLiveCommits.mockReturnValue({
      latestCommit: null,
      isConnected: false,
      error: "Connection lost. Reconnecting...",
    });

    const { getAllByText } = render(<LivePlayerPage />);
    // Error text may appear in both the error banner and header
    expect(getAllByText(/Reconnecting\.\.\./).length).toBeGreaterThanOrEqual(1);
  });

  it("passes repo to useLiveCommits", () => {
    render(<LivePlayerPage />);
    expect(mockUseLiveCommits).toHaveBeenCalledWith("octocat/hello-world");
  });

  it("has a back link to the normal player page", () => {
    const { getByLabelText } = render(<LivePlayerPage />);
    const backLink = getByLabelText("Back to player");
    expect(backLink.getAttribute("href")).toBe("/play/octocat/hello-world");
  });

  it("has a settings link", () => {
    const { getByLabelText } = render(<LivePlayerPage />);
    const settingsLink = getByLabelText("Settings");
    expect(settingsLink.getAttribute("href")).toBe("/settings");
  });

  it("renders volume control", () => {
    const { getByLabelText } = render(<LivePlayerPage />);
    const volumeSlider = getByLabelText("Volume");
    expect(volumeSlider).toBeTruthy();

    // Change volume
    act(() => {
      volumeSlider.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
    });
  });

  it("renders compact now-playing bar on mobile when commits exist", async () => {
    const commit = makeCommit();
    mockUseLiveCommits.mockReturnValue({
      latestCommit: commit,
      isConnected: true,
      error: null,
    });

    const { getByTestId } = render(<LivePlayerPage />);

    await waitFor(() => {
      expect(getByTestId("now-playing-compact")).toBeTruthy();
    });
  });
});
