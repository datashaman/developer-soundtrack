// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { DiffStats } from "./DiffStats";

afterEach(cleanup);

describe("DiffStats", () => {
  it("renders additions in green", () => {
    const { container } = render(<DiffStats additions={42} deletions={10} />);
    const green = container.querySelector(".text-green-400");
    expect(green).not.toBeNull();
    expect(green!.textContent).toBe("+42");
  });

  it("renders deletions in red", () => {
    const { container } = render(<DiffStats additions={5} deletions={23} />);
    const red = container.querySelector(".text-red-400");
    expect(red).not.toBeNull();
    expect(red!.textContent).toContain("23");
  });

  it("renders zero additions and deletions", () => {
    const { container } = render(<DiffStats additions={0} deletions={0} />);
    const green = container.querySelector(".text-green-400");
    const red = container.querySelector(".text-red-400");
    expect(green!.textContent).toBe("+0");
    expect(red!.textContent).toContain("0");
  });

  it("renders large numbers", () => {
    const { container } = render(<DiffStats additions={10000} deletions={5000} />);
    const green = container.querySelector(".text-green-400");
    expect(green!.textContent).toBe("+10000");
  });

  it("applies additional className", () => {
    const { container } = render(<DiffStats additions={1} deletions={2} className="text-xs font-mono" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("text-xs");
    expect(wrapper.className).toContain("font-mono");
  });

  it("uses minus sign entity for deletions", () => {
    const { container } = render(<DiffStats additions={1} deletions={5} />);
    const red = container.querySelector(".text-red-400");
    // &minus; renders as Unicode U+2212 (−)
    expect(red!.textContent).toContain("−");
  });
});
