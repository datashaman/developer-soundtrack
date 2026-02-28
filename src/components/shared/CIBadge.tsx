import type { CIStatus } from "@/types";

const CI_DISPLAY: Record<
  CIStatus,
  { label: string; color: string; icon: "check" | "x" | "clock" | "question" }
> = {
  pass: { label: "Passed", color: "#22c55e", icon: "check" },
  fail: { label: "Failed", color: "#ef4444", icon: "x" },
  pending: { label: "Pending", color: "#eab308", icon: "clock" },
  unknown: { label: "Unknown", color: "#6b7280", icon: "question" },
};

function CIIcon({
  type,
  color,
}: {
  type: "check" | "x" | "clock" | "question";
  color: string;
}) {
  switch (type) {
    case "check":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 7L6 9.5L10.5 4.5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "x":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M4 4L10 10M10 4L4 10"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "clock":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.2" />
          <path
            d="M7 4.5V7L8.5 8.5"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "question":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.2" />
          <path
            d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7 6.5 7 7.5"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="9.5" r="0.5" fill={color} />
        </svg>
      );
  }
}

interface CIBadgeProps {
  status: CIStatus;
  /** Whether to show the label text (default true) */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function CIBadge({ status, showLabel = true, className = "" }: CIBadgeProps) {
  const ci = CI_DISPLAY[status];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <CIIcon type={ci.icon} color={ci.color} />
      {showLabel && <span style={{ color: ci.color }}>{ci.label}</span>}
    </span>
  );
}
