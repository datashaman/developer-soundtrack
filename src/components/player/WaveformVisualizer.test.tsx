// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { WaveformVisualizer } from "./WaveformVisualizer";

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallbacks: Array<FrameRequestCallback> = [];
let rafId = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    rafCallbacks = [];
  });
});

function flushRAF(count = 1) {
  for (let i = 0; i < count; i++) {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) {
      cb(performance.now());
    }
  }
}

// Mock canvas context
function createMockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
  };
}

// Mock HTMLCanvasElement.getContext
let mockCtx: ReturnType<typeof createMockContext>;

beforeEach(() => {
  mockCtx = createMockContext();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D
  );
  // Mock getBoundingClientRect
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 140,
    top: 0,
    left: 0,
    right: 800,
    bottom: 140,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

describe("WaveformVisualizer", () => {
  it("renders a canvas element", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));
    const { container } = render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  it("has the correct dimensions via className", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));
    const { container } = render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas?.className).toContain("h-[140px]");
    expect(canvas?.className).toContain("w-full");
  });

  it("starts requestAnimationFrame loop on mount", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));
    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("cancels animation frame on unmount", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));
    const { unmount } = render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("draws idle sine wave when not playing", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));
    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );

    act(() => {
      flushRAF(1);
    });

    // Should draw sine wave (beginPath + moveTo + lineTo + stroke for main + mirror)
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    // Should NOT call getWaveformData when idle
    expect(getWaveformData).not.toHaveBeenCalled();
  });

  it("draws real-time waveform when playing", () => {
    const waveformData = new Float32Array([0, 0.5, -0.5, 0.3, -0.3]);
    const getWaveformData = vi.fn(() => waveformData);

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
      />
    );

    act(() => {
      flushRAF(1);
    });

    expect(getWaveformData).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("draws mirror/reflection with reduced opacity when playing", () => {
    const waveformData = new Float32Array([0, 0.5, -0.5]);
    const getWaveformData = vi.fn(() => waveformData);

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
      />
    );

    act(() => {
      flushRAF(1);
    });

    // Two stroke() calls: main waveform + mirror reflection
    expect(mockCtx.stroke).toHaveBeenCalledTimes(2);
  });

  it("draws mirror/reflection with reduced opacity when idle", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );

    act(() => {
      flushRAF(1);
    });

    // Two stroke() calls: main sine wave + mirror
    expect(mockCtx.stroke).toHaveBeenCalledTimes(2);
  });

  it("handles empty waveform data when playing", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
      />
    );

    // Should not throw
    act(() => {
      flushRAF(1);
    });

    expect(getWaveformData).toHaveBeenCalled();
    // No stroke calls since waveform is empty
    expect(mockCtx.stroke).not.toHaveBeenCalled();
  });

  it("accepts currentLanguage prop for stroke color", () => {
    const getWaveformData = vi.fn(() => new Float32Array([0, 0.5]));

    const { rerender } = render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
        currentLanguage="Python"
      />
    );

    act(() => {
      flushRAF(1);
    });

    // Stroke style should be set (transitioning towards Python's blue)
    expect(mockCtx.strokeStyle).toBeTruthy();

    // Change language
    rerender(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
        currentLanguage="JavaScript"
      />
    );

    act(() => {
      flushRAF(1);
    });

    expect(mockCtx.strokeStyle).toBeTruthy();
  });

  it("uses default color when no language specified", () => {
    const getWaveformData = vi.fn(() => new Float32Array([0, 0.5]));

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={true}
      />
    );

    act(() => {
      flushRAF(1);
    });

    // Default stroke color is #00ffc8 (cyan accent) — will be set as rgb after lerp
    expect(mockCtx.strokeStyle).toBeTruthy();
  });

  it("continuously requests animation frames", () => {
    const getWaveformData = vi.fn(() => new Float32Array(0));

    render(
      <WaveformVisualizer
        getWaveformData={getWaveformData}
        isPlaying={false}
      />
    );

    const initialCallCount = (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length;

    act(() => {
      flushRAF(1);
    });

    // After one frame, should request another
    expect(
      (window.requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThan(initialCallCount);
  });
});
