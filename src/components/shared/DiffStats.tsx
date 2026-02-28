interface DiffStatsProps {
  additions: number;
  deletions: number;
  /** Additional CSS classes */
  className?: string;
}

export function DiffStats({ additions, deletions, className = "" }: DiffStatsProps) {
  return (
    <span className={className}>
      <span className="text-green-400">+{additions}</span>{" "}
      <span className="text-red-400">&minus;{deletions}</span>
    </span>
  );
}
