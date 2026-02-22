// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { TransportControls } from "./TransportControls";

const defaultProps = {
  isPlaying: false,
  currentIndex: 0,
  totalCommits: 10,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onStop: vi.fn(),
  onSeek: vi.fn(),
  onTempoChange: vi.fn(),
  onVolumeChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("TransportControls", () => {
  it("renders all control buttons", () => {
    const { getByLabelText } = render(<TransportControls {...defaultProps} />);
    expect(getByLabelText("Play")).toBeTruthy();
    expect(getByLabelText("Stop")).toBeTruthy();
    expect(getByLabelText("Skip backward")).toBeTruthy();
    expect(getByLabelText("Skip forward")).toBeTruthy();
    expect(getByLabelText("Mute")).toBeTruthy();
  });

  it("shows Play button when not playing", () => {
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} isPlaying={false} />
    );
    expect(getByLabelText("Play")).toBeTruthy();
  });

  it("shows Pause button when playing", () => {
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} isPlaying={true} />
    );
    expect(getByLabelText("Pause")).toBeTruthy();
  });

  it("calls onPlay when play button is clicked", () => {
    const onPlay = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onPlay={onPlay} isPlaying={false} />
    );
    fireEvent.click(getByLabelText("Play"));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("calls onPause when pause button is clicked", () => {
    const onPause = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onPause={onPause} isPlaying={true} />
    );
    fireEvent.click(getByLabelText("Pause"));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("calls onStop when stop button is clicked", () => {
    const onStop = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onStop={onStop} />
    );
    fireEvent.click(getByLabelText("Stop"));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("calls onSeek with previous index on skip backward", () => {
    const onSeek = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onSeek={onSeek} currentIndex={5} />
    );
    fireEvent.click(getByLabelText("Skip backward"));
    expect(onSeek).toHaveBeenCalledWith(4);
  });

  it("calls onSeek with next index on skip forward", () => {
    const onSeek = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onSeek={onSeek} currentIndex={5} />
    );
    fireEvent.click(getByLabelText("Skip forward"));
    expect(onSeek).toHaveBeenCalledWith(6);
  });

  it("disables skip backward when at first commit", () => {
    const onSeek = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onSeek={onSeek} currentIndex={0} />
    );
    const button = getByLabelText("Skip backward");
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("disables skip forward when at last commit", () => {
    const onSeek = vi.fn();
    const { getByLabelText } = render(
      <TransportControls
        {...defaultProps}
        onSeek={onSeek}
        currentIndex={9}
        totalCommits={10}
      />
    );
    const button = getByLabelText("Skip forward");
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it("shows commit counter", () => {
    const { container } = render(
      <TransportControls {...defaultProps} currentIndex={3} totalCommits={10} />
    );
    expect(container.textContent).toContain("4 / 10");
  });

  it("shows 0 / 0 when no commits", () => {
    const { container } = render(
      <TransportControls {...defaultProps} currentIndex={0} totalCommits={0} />
    );
    expect(container.textContent).toContain("0 / 0");
  });

  it("renders tempo slider with default value", () => {
    const { getByLabelText } = render(<TransportControls {...defaultProps} />);
    const slider = getByLabelText("Tempo") as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe("1");
  });

  it("calls onTempoChange when tempo slider changes", () => {
    const onTempoChange = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onTempoChange={onTempoChange} />
    );
    const slider = getByLabelText("Tempo");
    fireEvent.change(slider, { target: { value: "2.5" } });
    expect(onTempoChange).toHaveBeenCalledWith(2.5);
  });

  it("displays tempo value with one decimal", () => {
    const { container, getByLabelText } = render(
      <TransportControls {...defaultProps} initialTempo={1.5} />
    );
    expect(container.textContent).toContain("1.5s");

    const slider = getByLabelText("Tempo");
    fireEvent.change(slider, { target: { value: "3.0" } });
    expect(container.textContent).toContain("3.0s");
  });

  it("renders volume slider with default value", () => {
    const { getByLabelText } = render(<TransportControls {...defaultProps} />);
    const slider = getByLabelText("Volume") as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe("0.8");
  });

  it("calls onVolumeChange when volume slider changes", () => {
    const onVolumeChange = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onVolumeChange={onVolumeChange} />
    );
    const slider = getByLabelText("Volume");
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect(onVolumeChange).toHaveBeenCalledWith(0.5);
  });

  it("displays volume as percentage", () => {
    const { container } = render(
      <TransportControls {...defaultProps} initialVolume={0.8} />
    );
    expect(container.textContent).toContain("80%");
  });

  it("mutes volume on mute button click", () => {
    const onVolumeChange = vi.fn();
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} onVolumeChange={onVolumeChange} />
    );
    fireEvent.click(getByLabelText("Mute"));
    expect(onVolumeChange).toHaveBeenCalledWith(0);
  });

  it("unmutes volume on unmute button click", () => {
    const onVolumeChange = vi.fn();
    const { getByLabelText } = render(
      <TransportControls
        {...defaultProps}
        onVolumeChange={onVolumeChange}
        initialVolume={0.8}
      />
    );
    // Mute
    fireEvent.click(getByLabelText("Mute"));
    expect(onVolumeChange).toHaveBeenCalledWith(0);

    // Unmute — should restore to previous value
    fireEvent.click(getByLabelText("Unmute"));
    expect(onVolumeChange).toHaveBeenCalledWith(0.8);
  });

  it("renders progress bar", () => {
    const { getByRole } = render(
      <TransportControls {...defaultProps} currentIndex={3} totalCommits={10} />
    );
    const progressBar = getByRole("progressbar");
    expect(progressBar).toBeTruthy();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("3");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("9");
  });

  it("seeks on progress bar click", () => {
    const onSeek = vi.fn();
    const { getByRole } = render(
      <TransportControls {...defaultProps} onSeek={onSeek} totalCommits={10} />
    );
    const progressBar = getByRole("progressbar");

    // Mock getBoundingClientRect for the progress bar
    vi.spyOn(progressBar, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 200,
      width: 200,
      top: 0,
      bottom: 8,
      height: 8,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Click at 50% (clientX = 100 out of 200 width)
    fireEvent.click(progressBar, { clientX: 100 });
    // 50% of 9 (totalCommits - 1) = 4.5, rounded = 5
    expect(onSeek).toHaveBeenCalledWith(5);
  });

  it("accepts custom initial tempo", () => {
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} initialTempo={2.0} />
    );
    const slider = getByLabelText("Tempo") as HTMLInputElement;
    expect(slider.value).toBe("2");
  });

  it("accepts custom initial volume", () => {
    const { getByLabelText } = render(
      <TransportControls {...defaultProps} initialVolume={0.5} />
    );
    const slider = getByLabelText("Volume") as HTMLInputElement;
    expect(slider.value).toBe("0.5");
  });
});
