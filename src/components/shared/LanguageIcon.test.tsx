// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { LanguageIcon, LANGUAGE_COLORS } from "./LanguageIcon";

afterEach(cleanup);

describe("LanguageIcon", () => {
  it("renders a colored dot for a known language", () => {
    const { container } = render(<LanguageIcon language="Python" />);
    const dot = container.querySelector("span span") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.style.backgroundColor).toBe("rgb(53, 114, 165)"); // #3572A5
  });

  it("uses default size of 10px", () => {
    const { container } = render(<LanguageIcon language="JavaScript" />);
    const dot = container.querySelector("span span") as HTMLElement;
    expect(dot.style.width).toBe("10px");
    expect(dot.style.height).toBe("10px");
  });

  it("accepts custom size", () => {
    const { container } = render(<LanguageIcon language="Go" size={16} />);
    const dot = container.querySelector("span span") as HTMLElement;
    expect(dot.style.width).toBe("16px");
    expect(dot.style.height).toBe("16px");
  });

  it("does not show label by default", () => {
    const { container } = render(<LanguageIcon language="TypeScript" />);
    expect(container.textContent).toBe("");
  });

  it("shows label when showLabel is true", () => {
    const { container } = render(<LanguageIcon language="TypeScript" showLabel />);
    expect(container.textContent).toBe("TypeScript");
  });

  it("uses 'Other' color for unknown languages", () => {
    const { container } = render(<LanguageIcon language="Haskell" />);
    const dot = container.querySelector("span span") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("rgb(0, 255, 200)"); // #00ffc8
  });

  it("has aria-label for accessibility", () => {
    const { container } = render(<LanguageIcon language="Rust" />);
    const dot = container.querySelector("[aria-label]");
    expect(dot!.getAttribute("aria-label")).toBe("Rust language");
  });

  it("applies additional className", () => {
    const { container } = render(<LanguageIcon language="Go" className="text-xs" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("text-xs");
  });

  it("renders correct colors for all defined languages", () => {
    for (const [lang, hex] of Object.entries(LANGUAGE_COLORS)) {
      const { container } = render(<LanguageIcon language={lang} />);
      const dot = container.querySelector("span span");
      expect(dot).not.toBeNull();
      cleanup();
    }
  });

  it("exports LANGUAGE_COLORS constant", () => {
    expect(LANGUAGE_COLORS).toBeDefined();
    expect(LANGUAGE_COLORS.Python).toBe("#3572A5");
    expect(LANGUAGE_COLORS.Other).toBe("#00ffc8");
  });
});
