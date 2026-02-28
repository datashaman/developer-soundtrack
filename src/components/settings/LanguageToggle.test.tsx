// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { LanguageToggle } from "./LanguageToggle";
import { LANGUAGE_SYNTH_MAP } from "@/lib/music/synths";

const LANGUAGES = Object.keys(LANGUAGE_SYNTH_MAP);

afterEach(() => {
  cleanup();
});

describe("LanguageToggle", () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    defaultOnChange.mockClear();
  });

  it("renders a toggle for each supported language", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(LANGUAGES.length);
  });

  it("shows all language names", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    for (const lang of LANGUAGES) {
      expect(container.textContent).toContain(lang);
    }
  });

  it("all toggles are checked when enabledLanguages is empty (all enabled)", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      expect((cb as HTMLInputElement).checked).toBe(true);
    });
  });

  it("shows only specified languages as enabled", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python", "TypeScript"]}
        onChange={defaultOnChange}
      />
    );
    const pythonCheckbox = container.querySelector(
      'input[aria-label="Toggle Python"]'
    ) as HTMLInputElement;
    const tsCheckbox = container.querySelector(
      'input[aria-label="Toggle TypeScript"]'
    ) as HTMLInputElement;
    const goCheckbox = container.querySelector(
      'input[aria-label="Toggle Go"]'
    ) as HTMLInputElement;
    expect(pythonCheckbox.checked).toBe(true);
    expect(tsCheckbox.checked).toBe(true);
    expect(goCheckbox.checked).toBe(false);
  });

  it("disabling a language from all-enabled creates explicit list excluding it", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    const pythonCheckbox = container.querySelector(
      'input[aria-label="Toggle Python"]'
    ) as HTMLInputElement;
    fireEvent.click(pythonCheckbox);
    expect(defaultOnChange).toHaveBeenCalledWith(
      LANGUAGES.filter((l) => l !== "Python")
    );
  });

  it("disabling a language from explicit list removes it", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python", "TypeScript", "Go"]}
        onChange={defaultOnChange}
      />
    );
    const tsCheckbox = container.querySelector(
      'input[aria-label="Toggle TypeScript"]'
    ) as HTMLInputElement;
    fireEvent.click(tsCheckbox);
    expect(defaultOnChange).toHaveBeenCalledWith(["Python", "Go"]);
  });

  it("enabling a language adds it to the list", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python", "TypeScript"]}
        onChange={defaultOnChange}
      />
    );
    const goCheckbox = container.querySelector(
      'input[aria-label="Toggle Go"]'
    ) as HTMLInputElement;
    fireEvent.click(goCheckbox);
    expect(defaultOnChange).toHaveBeenCalledWith(
      expect.arrayContaining(["Python", "TypeScript", "Go"])
    );
  });

  it("enabling all languages resets to empty array", () => {
    // All languages except Python
    const enabledLangs = LANGUAGES.filter((l) => l !== "Python");
    const { container } = render(
      <LanguageToggle
        enabledLanguages={enabledLangs}
        onChange={defaultOnChange}
      />
    );
    const pythonCheckbox = container.querySelector(
      'input[aria-label="Toggle Python"]'
    ) as HTMLInputElement;
    fireEvent.click(pythonCheckbox);
    // All are now enabled — should reset to []
    expect(defaultOnChange).toHaveBeenCalledWith([]);
  });

  it("prevents disabling the last enabled language", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python"]}
        onChange={defaultOnChange}
      />
    );
    const pythonCheckbox = container.querySelector(
      'input[aria-label="Toggle Python"]'
    ) as HTMLInputElement;
    fireEvent.click(pythonCheckbox);
    // Should not have been called — can't disable the last language
    expect(defaultOnChange).not.toHaveBeenCalled();
  });

  it("Enable all button resets to empty array", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python", "TypeScript"]}
        onChange={defaultOnChange}
      />
    );
    const enableAllBtn = container.querySelector(
      'button[aria-label="Enable all languages"]'
    ) as HTMLButtonElement;
    fireEvent.click(enableAllBtn);
    expect(defaultOnChange).toHaveBeenCalledWith([]);
  });

  it("Enable all button is disabled when all are already enabled", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    const enableAllBtn = container.querySelector(
      'button[aria-label="Enable all languages"]'
    ) as HTMLButtonElement;
    expect(enableAllBtn.disabled).toBe(true);
  });

  it("Enable all button is enabled when some are disabled", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python"]}
        onChange={defaultOnChange}
      />
    );
    const enableAllBtn = container.querySelector(
      'button[aria-label="Enable all languages"]'
    ) as HTMLButtonElement;
    expect(enableAllBtn.disabled).toBe(false);
  });

  it("shows muted count when languages are disabled", () => {
    // Only 2 enabled out of all
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python", "TypeScript"]}
        onChange={defaultOnChange}
      />
    );
    const expectedMuted = LANGUAGES.length - 2;
    expect(container.textContent).toContain(`${expectedMuted} languages muted`);
  });

  it("does not show muted count when all are enabled", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    expect(container.textContent).not.toContain("muted");
  });

  it("shows language color dots", () => {
    const { container } = render(
      <LanguageToggle enabledLanguages={[]} onChange={defaultOnChange} />
    );
    const dots = container.querySelectorAll(".rounded-full");
    // Each language has a color dot plus each toggle switch has rounded-full elements
    // Check that we have at least as many dots as languages
    expect(dots.length).toBeGreaterThanOrEqual(LANGUAGES.length);
  });

  it("disabled language labels have reduced opacity", () => {
    const { container } = render(
      <LanguageToggle
        enabledLanguages={["Python"]}
        onChange={defaultOnChange}
      />
    );
    const labels = container.querySelectorAll("label");
    // Find Go label (not enabled)
    const goLabel = Array.from(labels).find((l) =>
      l.textContent?.includes("Go")
    );
    expect(goLabel?.className).toContain("opacity-50");
    // Find Python label (enabled)
    const pythonLabel = Array.from(labels).find((l) =>
      l.textContent?.includes("Python")
    );
    expect(pythonLabel?.className).not.toContain("opacity-50");
  });

  it("uses singular 'language' for count of 1 muted", () => {
    // All enabled except one
    const enabledLangs = LANGUAGES.filter((l) => l !== "Python");
    const { container } = render(
      <LanguageToggle
        enabledLanguages={enabledLangs}
        onChange={defaultOnChange}
      />
    );
    expect(container.textContent).toContain("1 language muted");
    expect(container.textContent).not.toContain("1 languages muted");
  });
});
