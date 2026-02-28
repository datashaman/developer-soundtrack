// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { DemoPlayer } from "./DemoPlayer";

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock useMusicEngine
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();
const mockStop = vi.fn();
const mockSeekTo = vi.fn();
const mockSetTempo = vi.fn();
const mockSetVolume = vi.fn();
const mockGetWaveformData = vi.fn(() => new Float32Array(0));

vi.mock("@/hooks/useMusicEngine", () => ({
  useMusicEngine: () => ({
    isPlaying: false,
    currentCommit: null,
    currentIndex: 0,
    play: mockPlay,
    pause: mockPause,
    resume: mockResume,
    stop: mockStop,
    seekTo: mockSeekTo,
    setTempo: mockSetTempo,
    setVolume: mockSetVolume,
    getWaveformData: mockGetWaveformData,
    getFFTData: vi.fn(() => new Float32Array(0)),
  }),
}));

// Mock child components to simplify testing
vi.mock("./WaveformVisualizer", () => ({
  WaveformVisualizer: () => <div data-testid="waveform-visualizer" />,
}));

vi.mock("./TransportControls", () => ({
  TransportControls: (props: Record<string, unknown>) => (
    <div data-testid="transport-controls" data-total={props.totalCommits} />
  ),
}));

vi.mock("./NowPlaying", () => ({
  NowPlaying: (props: Record<string, unknown>) => (
    <div
      data-testid="now-playing"
      data-has-commit={props.currentCommit ? "true" : "false"}
    />
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DemoPlayer", () => {
  it("renders waveform visualizer", () => {
    const { getByTestId } = render(<DemoPlayer />);
    expect(getByTestId("waveform-visualizer")).toBeTruthy();
  });

  it("renders transport controls", () => {
    const { getByTestId } = render(<DemoPlayer />);
    expect(getByTestId("transport-controls")).toBeTruthy();
  });

  it("renders now playing card", () => {
    const { getByTestId } = render(<DemoPlayer />);
    expect(getByTestId("now-playing")).toBeTruthy();
  });

  it("passes sample commits count to transport controls", () => {
    const { getByTestId } = render(<DemoPlayer />);
    expect(getByTestId("transport-controls").dataset.total).toBe("12");
  });

  it("does not render timeline", () => {
    const { container } = render(<DemoPlayer />);
    // Timeline would have an SVG with commit nodes — none should be present
    expect(container.querySelector("[data-testid='timeline']")).toBeNull();
  });

  it("does not render commit list", () => {
    const { queryByText } = render(<DemoPlayer />);
    // TestPlayer has "Sample Commits" header — DemoPlayer should not
    expect(queryByText("Sample Commits")).toBeNull();
  });

  it("displays sign in CTA text", () => {
    const { getByText } = render(<DemoPlayer />);
    expect(getByText("Sign in to play your own repos")).toBeTruthy();
  });

  it("displays Connect with GitHub button", () => {
    const { getByText } = render(<DemoPlayer />);
    expect(getByText("Connect with GitHub")).toBeTruthy();
  });

  it("calls signIn with github when CTA button is clicked", () => {
    const { getByText } = render(<DemoPlayer />);
    fireEvent.click(getByText("Connect with GitHub"));
    expect(mockSignIn).toHaveBeenCalledWith("github");
  });

  it("does not render settings or repo selector", () => {
    const { queryByText, container } = render(<DemoPlayer />);
    expect(queryByText("Settings")).toBeNull();
    expect(container.querySelector("select")).toBeNull();
  });
});
