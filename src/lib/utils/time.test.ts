import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDateRange } from "./time";

describe("getDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("today preset", () => {
    it("returns midnight today to now", () => {
      // Wednesday, 2026-03-04 at 14:30:00 local
      vi.setSystemTime(new Date(2026, 2, 4, 14, 30, 0));
      const result = getDateRange("today");

      const from = new Date(result.from);
      const to = new Date(result.to);

      expect(from.getFullYear()).toBe(2026);
      expect(from.getMonth()).toBe(2); // March
      expect(from.getDate()).toBe(4);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(from.getSeconds()).toBe(0);
      expect(from.getMilliseconds()).toBe(0);

      expect(to.getHours()).toBe(14);
      expect(to.getMinutes()).toBe(30);
    });

    it("returns valid ISO 8601 strings", () => {
      vi.setSystemTime(new Date(2026, 0, 15, 10, 0, 0));
      const result = getDateRange("today");

      expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("from is before to", () => {
      vi.setSystemTime(new Date(2026, 5, 20, 18, 0, 0));
      const result = getDateRange("today");

      expect(new Date(result.from).getTime()).toBeLessThan(
        new Date(result.to).getTime(),
      );
    });

    it("works at midnight (from equals to within same second)", () => {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 0));
      const result = getDateRange("today");

      const from = new Date(result.from);
      const to = new Date(result.to);

      expect(from.getHours()).toBe(0);
      expect(to.getHours()).toBe(0);
      expect(from.getTime()).toBe(to.getTime());
    });
  });

  describe("week preset", () => {
    it("returns Monday of current week when today is Wednesday", () => {
      // Wednesday, 2026-03-04
      vi.setSystemTime(new Date(2026, 2, 4, 14, 0, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getDay()).toBe(1); // Monday
      expect(from.getDate()).toBe(2); // March 2
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
    });

    it("returns Monday of current week when today is Monday", () => {
      // Monday, 2026-03-02
      vi.setSystemTime(new Date(2026, 2, 2, 9, 0, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getDay()).toBe(1); // Monday
      expect(from.getDate()).toBe(2); // Same day (March 2)
      expect(from.getHours()).toBe(0);
    });

    it("returns previous Monday when today is Sunday", () => {
      // Sunday, 2026-03-08
      vi.setSystemTime(new Date(2026, 2, 8, 12, 0, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getDay()).toBe(1); // Monday
      expect(from.getDate()).toBe(2); // March 2 (previous Monday)
    });

    it("returns previous Monday when today is Saturday", () => {
      // Saturday, 2026-03-07
      vi.setSystemTime(new Date(2026, 2, 7, 12, 0, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getDay()).toBe(1); // Monday
      expect(from.getDate()).toBe(2); // March 2
    });

    it("handles week crossing month boundary", () => {
      // Wednesday, 2026-04-01
      vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getDay()).toBe(1); // Monday
      expect(from.getMonth()).toBe(2); // March
      expect(from.getDate()).toBe(30); // March 30
    });

    it("returns midnight at start of week", () => {
      vi.setSystemTime(new Date(2026, 2, 5, 16, 30, 0));
      const result = getDateRange("week");

      const from = new Date(result.from);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(from.getSeconds()).toBe(0);
      expect(from.getMilliseconds()).toBe(0);
    });
  });

  describe("sprint preset", () => {
    it("returns 14 days ago to now", () => {
      // 2026-03-15 at 10:00
      vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0));
      const result = getDateRange("sprint");

      const from = new Date(result.from);
      expect(from.getMonth()).toBe(2); // March
      expect(from.getDate()).toBe(1); // March 1 (15 - 14)
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
    });

    it("handles sprint crossing month boundary", () => {
      // 2026-03-10 — 14 days ago is Feb 24
      vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
      const result = getDateRange("sprint");

      const from = new Date(result.from);
      expect(from.getMonth()).toBe(1); // February
      expect(from.getDate()).toBe(24);
    });

    it("handles sprint crossing year boundary", () => {
      // 2026-01-05 — 14 days ago is Dec 22
      vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
      const result = getDateRange("sprint");

      const from = new Date(result.from);
      expect(from.getFullYear()).toBe(2025);
      expect(from.getMonth()).toBe(11); // December
      expect(from.getDate()).toBe(22);
    });

    it("returns midnight at start of sprint", () => {
      vi.setSystemTime(new Date(2026, 5, 20, 18, 30, 0));
      const result = getDateRange("sprint");

      const from = new Date(result.from);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(from.getSeconds()).toBe(0);
      expect(from.getMilliseconds()).toBe(0);
    });
  });

  describe("custom preset", () => {
    it("uses provided from and to dates", () => {
      const result = getDateRange("custom", "2026-01-01", "2026-01-31");

      const from = new Date(result.from);
      expect(from.getFullYear()).toBe(2026);
      expect(from.getMonth()).toBe(0);
      expect(from.getDate()).toBe(1);

      const to = new Date(result.to);
      expect(to.getFullYear()).toBe(2026);
      expect(to.getMonth()).toBe(0);
      expect(to.getDate()).toBe(31);
      expect(to.getHours()).toBe(23);
      expect(to.getMinutes()).toBe(59);
      expect(to.getSeconds()).toBe(59);
    });

    it("returns empty from when customFrom not provided", () => {
      const result = getDateRange("custom", undefined, "2026-06-30");

      expect(result.from).toBe("");
    });

    it("returns empty from when customFrom is empty string", () => {
      const result = getDateRange("custom", "", "2026-06-30");

      expect(result.from).toBe("");
    });

    it("returns now for to when customTo not provided", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0));
      const result = getDateRange("custom", "2026-06-01");

      const to = new Date(result.to);
      expect(to.getHours()).toBe(14);
      expect(to.getMinutes()).toBe(0);
    });

    it("returns now for to when customTo is empty string", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0));
      const result = getDateRange("custom", "2026-06-01", "");

      const to = new Date(result.to);
      expect(to.getHours()).toBe(14);
      expect(to.getMinutes()).toBe(0);
    });

    it("sets to end of day (23:59:59) for customTo date", () => {
      const result = getDateRange("custom", "2026-01-01", "2026-01-15");

      const to = new Date(result.to);
      expect(to.getHours()).toBe(23);
      expect(to.getMinutes()).toBe(59);
      expect(to.getSeconds()).toBe(59);
    });
  });

  describe("return values", () => {
    it("all presets return ISO 8601 strings", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      for (const preset of ["today", "week", "sprint"] as const) {
        const result = getDateRange(preset);
        expect(result.from).toMatch(isoPattern);
        expect(result.to).toMatch(isoPattern);
      }

      const custom = getDateRange("custom", "2026-01-01", "2026-01-31");
      expect(custom.from).toMatch(isoPattern);
      expect(custom.to).toMatch(isoPattern);
    });

    it("from is always before or equal to to for non-custom presets", () => {
      vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

      for (const preset of ["today", "week", "sprint"] as const) {
        const result = getDateRange(preset);
        expect(new Date(result.from).getTime()).toBeLessThanOrEqual(
          new Date(result.to).getTime(),
        );
      }
    });
  });
});
