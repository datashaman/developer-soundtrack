// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MotifEditor } from "./MotifEditor";
import type { AuthorMotif } from "@/types";

// Mock Tone.js
const mockDispose = vi.fn();
const mockToDestination = vi.fn();
const mockTriggerAttackRelease = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("tone", () => {
  const makeSynth = () => ({
    dispose: mockDispose,
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: mockTriggerAttackRelease,
    connect: mockConnect.mockReturnThis(),
    disconnect: mockDisconnect.mockReturnThis(),
  });

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Synth: vi.fn().mockImplementation(function Synth() { return makeSynth(); }),
    Panner: vi.fn().mockImplementation(function Panner() {
      return { dispose: mockDispose, toDestination: vi.fn().mockReturnThis() };
    }),
    now: vi.fn().mockReturnValue(0),
  };
});

// Mock the motifs module
vi.mock("@/lib/music/motifs", () => ({
  generateAuthorMotif: vi.fn().mockImplementation((login: string) => ({
    login,
    panPosition: 0.2,
    rhythmPattern: [1, 0.5, 1],
    color: "#aabbcc",
  })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MotifEditor", () => {
  const defaultOnChange = vi.fn();
  const authors = ["alice", "bob", "carol"];

  beforeEach(() => {
    defaultOnChange.mockClear();
  });

  it("renders empty state when no authors", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={[]} onChange={defaultOnChange} />
    );
    expect(container.textContent).toContain("No authors found");
  });

  it("renders a row for each known author", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={authors} onChange={defaultOnChange} />
    );
    for (const author of authors) {
      expect(container.querySelector(`[data-testid="motif-row-${author}"]`)).not.toBeNull();
    }
  });

  it("shows author login names", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={authors} onChange={defaultOnChange} />
    );
    for (const author of authors) {
      expect(container.textContent).toContain(author);
    }
  });

  it("shows author avatar with first letter uppercase", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const avatar = container.querySelector('[aria-label="alice avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar!.textContent).toBe("A");
  });

  it("shows default motif color for uncustomized authors", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const colorInput = container.querySelector('[aria-label="Color for alice"]') as HTMLInputElement;
    expect(colorInput).not.toBeNull();
    expect(colorInput.value).toBe("#aabbcc");
  });

  it("shows customized motif color when provided", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 0.5, 1],
      color: "#ff0000",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const colorInput = container.querySelector('[aria-label="Color for alice"]') as HTMLInputElement;
    expect(colorInput.value).toBe("#ff0000");
  });

  it("calls onChange when color is changed", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const colorInput = container.querySelector('[aria-label="Color for alice"]') as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    expect(defaultOnChange).toHaveBeenCalledTimes(1);
    const newMotifs = defaultOnChange.mock.calls[0][0] as AuthorMotif[];
    expect(newMotifs.length).toBe(1);
    expect(newMotifs[0].login).toBe("alice");
    expect(newMotifs[0].color).toBe("#ff0000");
  });

  it("shows rhythm pattern beats", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    // Default motif has pattern [1, 0.5, 1]
    expect(container.querySelector('[data-testid="beat-alice-0"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="beat-alice-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="beat-alice-2"]')).not.toBeNull();
  });

  it("cycles beat duration on click (0.5 -> 1 -> 1.5 -> 0.5)", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [0.5, 1, 1.5],
      color: "#aabbcc",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    // Click first beat (0.5 -> 1)
    const beatBtn = container.querySelector('[data-testid="beat-alice-0"] button') as HTMLButtonElement;
    fireEvent.click(beatBtn);
    const newMotifs = defaultOnChange.mock.calls[0][0] as AuthorMotif[];
    expect(newMotifs[0].rhythmPattern[0]).toBe(1);
  });

  it("can add a beat to the pattern", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const addBtn = container.querySelector('[aria-label="Add beat for alice"]') as HTMLButtonElement;
    expect(addBtn).not.toBeNull();
    fireEvent.click(addBtn);
    const newMotifs = defaultOnChange.mock.calls[0][0] as AuthorMotif[];
    expect(newMotifs[0].rhythmPattern.length).toBe(4); // Default [1, 0.5, 1] + 1
  });

  it("does not show add button when pattern has 8 beats", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 1, 1, 1, 1, 1, 1, 1],
      color: "#aabbcc",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const addBtn = container.querySelector('[aria-label="Add beat for alice"]');
    expect(addBtn).toBeNull();
  });

  it("can remove a beat from the pattern", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    // Default [1, 0.5, 1] — remove beat 1
    const removeBtn = container.querySelector('[aria-label="Remove beat 2"]') as HTMLButtonElement;
    expect(removeBtn).not.toBeNull();
    fireEvent.click(removeBtn);
    const newMotifs = defaultOnChange.mock.calls[0][0] as AuthorMotif[];
    expect(newMotifs[0].rhythmPattern.length).toBe(2);
  });

  it("does not show remove buttons when pattern has 2 beats", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 0.5],
      color: "#aabbcc",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const removeBtns = container.querySelectorAll('[aria-label^="Remove beat"]');
    expect(removeBtns.length).toBe(0);
  });

  it("shows 'customized' badge for customized authors", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 0.5, 1],
      color: "#ff0000",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice", "bob"]} onChange={defaultOnChange} />
    );
    const aliceRow = container.querySelector('[data-testid="motif-row-alice"]')!;
    expect(aliceRow.textContent).toContain("customized");
    const bobRow = container.querySelector('[data-testid="motif-row-bob"]')!;
    expect(bobRow.textContent).not.toContain("customized");
  });

  it("highlights customized author name with accent color", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 0.5, 1],
      color: "#ff0000",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice", "bob"]} onChange={defaultOnChange} />
    );
    const aliceRow = container.querySelector('[data-testid="motif-row-alice"]')!;
    const aliceName = aliceRow.querySelector(".text-accent");
    expect(aliceName).not.toBeNull();
    expect(aliceName!.textContent).toBe("alice");
  });

  it("has preview button for each author", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={authors} onChange={defaultOnChange} />
    );
    for (const author of authors) {
      const btn = container.querySelector(`[aria-label="Preview ${author}"]`);
      expect(btn).not.toBeNull();
    }
  });

  it("calls Tone.start on preview click", async () => {
    const Tone = await import("tone");
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const previewBtn = container.querySelector('[aria-label="Preview alice"]') as HTMLButtonElement;
    fireEvent.click(previewBtn);
    expect(Tone.start).toHaveBeenCalled();
  });

  it("individual reset button removes that author's custom motif", () => {
    const custom: AuthorMotif = {
      login: "alice",
      panPosition: 0.2,
      rhythmPattern: [1, 0.5, 1],
      color: "#ff0000",
    };
    const { container } = render(
      <MotifEditor authorMotifs={[custom]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const resetBtn = container.querySelector('[aria-label="Reset alice to default"]') as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(false);
    fireEvent.click(resetBtn);
    expect(defaultOnChange).toHaveBeenCalledWith([]);
  });

  it("individual reset button is disabled for uncustomized authors", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    const resetBtn = container.querySelector('[aria-label="Reset alice to default"]') as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(true);
  });

  it("'Reset all to defaults' button clears all custom motifs", () => {
    const customs: AuthorMotif[] = [
      { login: "alice", panPosition: 0.2, rhythmPattern: [1, 0.5, 1], color: "#ff0000" },
      { login: "bob", panPosition: -0.3, rhythmPattern: [0.5, 0.5], color: "#00ff00" },
    ];
    const { container } = render(
      <MotifEditor authorMotifs={customs} knownAuthors={authors} onChange={defaultOnChange} />
    );
    const resetAllBtn = container.querySelector('[aria-label="Reset all to defaults"]') as HTMLButtonElement;
    expect(resetAllBtn.disabled).toBe(false);
    fireEvent.click(resetAllBtn);
    expect(defaultOnChange).toHaveBeenCalledWith([]);
  });

  it("'Reset all to defaults' button is disabled when no custom motifs", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={authors} onChange={defaultOnChange} />
    );
    const resetAllBtn = container.querySelector('[aria-label="Reset all to defaults"]') as HTMLButtonElement;
    expect(resetAllBtn.disabled).toBe(true);
  });

  it("shows pan position for each author", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    expect(container.textContent).toContain("Pan: 0.20");
  });

  it("preserves other authors' motifs when changing one", () => {
    const customs: AuthorMotif[] = [
      { login: "bob", panPosition: -0.3, rhythmPattern: [0.5, 0.5], color: "#00ff00" },
    ];
    const { container } = render(
      <MotifEditor authorMotifs={customs} knownAuthors={["alice", "bob"]} onChange={defaultOnChange} />
    );
    // Change alice's color
    const colorInput = container.querySelector('[aria-label="Color for alice"]') as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    const newMotifs = defaultOnChange.mock.calls[0][0] as AuthorMotif[];
    expect(newMotifs.length).toBe(2);
    expect(newMotifs.find((m: AuthorMotif) => m.login === "bob")?.color).toBe("#00ff00");
    expect(newMotifs.find((m: AuthorMotif) => m.login === "alice")?.color).toBe("#ff0000");
  });

  it("displays hex color value next to the color picker", () => {
    const { container } = render(
      <MotifEditor authorMotifs={[]} knownAuthors={["alice"]} onChange={defaultOnChange} />
    );
    expect(container.textContent).toContain("#aabbcc");
  });
});
