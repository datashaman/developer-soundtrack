// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { InstrumentMapper } from "./InstrumentMapper";
import { LANGUAGE_SYNTH_MAP } from "@/lib/music/synths";

// Mock Tone.js
const mockDispose = vi.fn();
const mockToDestination = vi.fn();
const mockTriggerAttackRelease = vi.fn();

vi.mock("tone", () => {
  const makeSynth = () => ({
    dispose: mockDispose,
    toDestination: mockToDestination,
    triggerAttackRelease: mockTriggerAttackRelease,
  });

  return {
    start: vi.fn().mockResolvedValue(undefined),
    AMSynth: vi.fn().mockImplementation(function AMSynth() { return makeSynth(); }),
    FMSynth: vi.fn().mockImplementation(function FMSynth() { return makeSynth(); }),
    MonoSynth: vi.fn().mockImplementation(function MonoSynth() { return makeSynth(); }),
    MetalSynth: vi.fn().mockImplementation(function MetalSynth() { return makeSynth(); }),
    NoiseSynth: vi.fn().mockImplementation(function NoiseSynth() { return makeSynth(); }),
    PluckSynth: vi.fn().mockImplementation(function PluckSynth() { return makeSynth(); }),
    Synth: vi.fn().mockImplementation(function Synth() { return makeSynth(); }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InstrumentMapper", () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    defaultOnChange.mockClear();
  });

  it("renders a row for each language in LANGUAGE_SYNTH_MAP", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const rows = container.querySelectorAll("tbody tr");
    const languageCount = Object.keys(LANGUAGE_SYNTH_MAP).length;
    expect(rows.length).toBe(languageCount);
  });

  it("shows language names in each row", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const languages = Object.keys(LANGUAGE_SYNTH_MAP);
    for (const lang of languages) {
      expect(container.textContent).toContain(lang);
    }
  });

  it("shows default synth type selected for each language", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const selects = container.querySelectorAll("select");
    const languages = Object.keys(LANGUAGE_SYNTH_MAP);
    expect(selects.length).toBe(languages.length);
    languages.forEach((lang, i) => {
      expect(selects[i].value).toBe(LANGUAGE_SYNTH_MAP[lang].type);
    });
  });

  it("shows override synth type when provided", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const selects = container.querySelectorAll("select");
    // Python is the first language
    const pythonSelect = Array.from(selects).find(
      (s) => s.getAttribute("aria-label") === "Instrument for Python"
    );
    expect(pythonSelect!.value).toBe("FMSynth");
  });

  it("calls onChange when instrument is changed to non-default", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const pythonSelect = container.querySelector(
      'select[aria-label="Instrument for Python"]'
    ) as HTMLSelectElement;
    fireEvent.change(pythonSelect, { target: { value: "FMSynth" } });
    expect(defaultOnChange).toHaveBeenCalledWith({ Python: "FMSynth" });
  });

  it("removes override when set back to default", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const pythonSelect = container.querySelector(
      'select[aria-label="Instrument for Python"]'
    ) as HTMLSelectElement;
    // Python default is AMSynth
    fireEvent.change(pythonSelect, { target: { value: "AMSynth" } });
    expect(defaultOnChange).toHaveBeenCalledWith({});
  });

  it("preserves other overrides when changing one language", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth", Go: "AMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const goSelect = container.querySelector(
      'select[aria-label="Instrument for Go"]'
    ) as HTMLSelectElement;
    fireEvent.change(goSelect, { target: { value: "Synth" } });
    // Go default is Synth, so the override should be removed
    expect(defaultOnChange).toHaveBeenCalledWith({ Python: "FMSynth" });
  });

  it("has a preview button for each language", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const previewButtons = container.querySelectorAll(
      'button[aria-label^="Preview"]'
    );
    expect(previewButtons.length).toBe(Object.keys(LANGUAGE_SYNTH_MAP).length);
  });

  it("calls Tone.start and creates synth on preview click", async () => {
    const Tone = await import("tone");
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const previewBtn = container.querySelector(
      'button[aria-label="Preview Python"]'
    ) as HTMLButtonElement;
    fireEvent.click(previewBtn);
    expect(Tone.start).toHaveBeenCalled();
  });

  it("reset button is disabled when no overrides", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const resetBtn = container.querySelector(
      'button[aria-label="Reset to defaults"]'
    ) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(true);
  });

  it("reset button is enabled when overrides exist", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const resetBtn = container.querySelector(
      'button[aria-label="Reset to defaults"]'
    ) as HTMLButtonElement;
    expect(resetBtn.disabled).toBe(false);
  });

  it("reset button clears all overrides", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth", Go: "AMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const resetBtn = container.querySelector(
      'button[aria-label="Reset to defaults"]'
    ) as HTMLButtonElement;
    fireEvent.click(resetBtn);
    expect(defaultOnChange).toHaveBeenCalledWith({});
  });

  it("shows (default) suffix in dropdown for default synth type", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const pythonSelect = container.querySelector(
      'select[aria-label="Instrument for Python"]'
    ) as HTMLSelectElement;
    const options = Array.from(pythonSelect.options);
    const amSynthOption = options.find((o) => o.value === "AMSynth");
    expect(amSynthOption!.textContent).toBe("AMSynth (default)");
    const fmSynthOption = options.find((o) => o.value === "FMSynth");
    expect(fmSynthOption!.textContent).toBe("FMSynth");
  });

  it("highlights overridden language names with accent color", () => {
    const { container } = render(
      <InstrumentMapper
        overrides={{ Python: "FMSynth" }}
        onChange={defaultOnChange}
      />
    );
    const rows = container.querySelectorAll("tbody tr");
    // Python is first row
    const pythonLabel = rows[0].querySelector(".font-mono") as HTMLElement;
    expect(pythonLabel.className).toContain("text-accent");
    // JavaScript is second row (no override)
    const jsLabel = rows[1].querySelector(".font-mono") as HTMLElement;
    expect(jsLabel.className).toContain("text-text-primary");
  });

  it("has dropdown options for all synth types", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const pythonSelect = container.querySelector(
      'select[aria-label="Instrument for Python"]'
    ) as HTMLSelectElement;
    const optionValues = Array.from(pythonSelect.options).map((o) => o.value);
    expect(optionValues).toContain("AMSynth");
    expect(optionValues).toContain("FMSynth");
    expect(optionValues).toContain("MonoSynth");
    expect(optionValues).toContain("MetalSynth");
    expect(optionValues).toContain("NoiseSynth");
    expect(optionValues).toContain("PluckSynth");
    expect(optionValues).toContain("Synth");
    expect(optionValues.length).toBe(7);
  });

  it("shows language color dots", () => {
    const { container } = render(
      <InstrumentMapper overrides={{}} onChange={defaultOnChange} />
    );
    const dots = container.querySelectorAll("td .rounded-full");
    expect(dots.length).toBe(Object.keys(LANGUAGE_SYNTH_MAP).length);
    // Check Python has its color
    const firstDot = dots[0] as HTMLElement;
    expect(firstDot.style.backgroundColor).toBe("rgb(53, 114, 165)"); // #3572A5
  });
});
