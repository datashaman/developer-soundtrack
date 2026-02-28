// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CIBadge } from "./CIBadge";

afterEach(cleanup);

describe("CIBadge", () => {
  it("renders pass status with green checkmark", () => {
    const { container } = render(<CIBadge status="pass" />);
    expect(container.textContent).toContain("Passed");
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const path = svg!.querySelector("path");
    expect(path!.getAttribute("stroke")).toBe("#22c55e");
  });

  it("renders fail status with red X", () => {
    const { container } = render(<CIBadge status="fail" />);
    expect(container.textContent).toContain("Failed");
    const path = container.querySelector("svg path");
    expect(path!.getAttribute("stroke")).toBe("#ef4444");
  });

  it("renders pending status with yellow clock", () => {
    const { container } = render(<CIBadge status="pending" />);
    expect(container.textContent).toContain("Pending");
    const circle = container.querySelector("svg circle");
    expect(circle!.getAttribute("stroke")).toBe("#eab308");
  });

  it("renders unknown status with gray question mark", () => {
    const { container } = render(<CIBadge status="unknown" />);
    expect(container.textContent).toContain("Unknown");
    const circle = container.querySelector("svg circle");
    expect(circle!.getAttribute("stroke")).toBe("#6b7280");
  });

  it("hides label when showLabel is false", () => {
    const { container } = render(<CIBadge status="pass" showLabel={false} />);
    expect(container.textContent).toBe("");
    // SVG icon should still render
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("applies additional className", () => {
    const { container } = render(<CIBadge status="fail" className="text-xs" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("text-xs");
  });

  it("renders correct label colors", () => {
    const cases: Array<{ status: "pass" | "fail" | "pending" | "unknown"; color: string }> = [
      { status: "pass", color: "rgb(34, 197, 94)" },
      { status: "fail", color: "rgb(239, 68, 68)" },
      { status: "pending", color: "rgb(234, 179, 8)" },
      { status: "unknown", color: "rgb(107, 114, 128)" },
    ];

    for (const { status, color } of cases) {
      const { container } = render(<CIBadge status={status} />);
      const label = container.querySelector("span span:last-child") as HTMLElement;
      expect(label.style.color).toBe(color);
      cleanup();
    }
  });
});
