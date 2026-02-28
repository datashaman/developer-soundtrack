"use client";

import { useState } from "react";

export type DatePreset = "today" | "week" | "sprint" | "custom";

interface DateRangePickerProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomFromChange: (from: string) => void;
  onCustomToChange: (to: string) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "sprint", label: "This Sprint" },
  { value: "custom", label: "Custom" },
];

export function DateRangePicker({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: DateRangePickerProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(preset === "custom");

  function handlePresetChange(newPreset: DatePreset) {
    onPresetChange(newPreset);
    setIsCustomOpen(newPreset === "custom");
  }

  return (
    <div>
      <label className="block text-xs text-white/40 uppercase tracking-widest font-mono mb-2">
        Time Range
      </label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePresetChange(p.value)}
            className={`px-4 py-2 min-h-11 rounded-lg text-sm font-mono transition-colors ${
              preset === p.value
                ? "bg-[#00ffc8]/15 text-[#00ffc8] border border-[#00ffc8]/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {isCustomOpen && (
        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <label htmlFor="custom-from" className="block text-xs text-white/30 font-mono mb-1">
              From
            </label>
            <input
              id="custom-from"
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 min-h-11 text-sm font-mono focus:outline-none focus:border-[#00ffc8]/50"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="custom-to" className="block text-xs text-white/30 font-mono mb-1">
              To
            </label>
            <input
              id="custom-to"
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 text-white px-3 py-2 min-h-11 text-sm font-mono focus:outline-none focus:border-[#00ffc8]/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
