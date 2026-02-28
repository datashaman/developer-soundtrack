export type DatePreset = "today" | "week" | "sprint" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Resolves a date preset to an ISO 8601 date range.
 *
 * - "today": midnight today (local time) to now
 * - "week": Monday of current week (local time) to now
 * - "sprint": 14 days ago (midnight, local time) to now
 * - "custom": uses the provided customFrom/customTo dates
 */
export function getDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "week": {
      const start = new Date(now);
      const day = start.getDay();
      // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      // We want Monday as start of week
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "sprint": {
      const start = new Date(now);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString() };
    }
    case "custom": {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : "",
        to: customTo
          ? new Date(`${customTo}T23:59:59`).toISOString()
          : now.toISOString(),
      };
    }
  }
}
