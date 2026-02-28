/** Language color map — single source of truth for language→color mapping */
export const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Markdown: "#083fa1",
  Other: "#00ffc8",
};

interface LanguageIconProps {
  language: string;
  /** Size in pixels (default 10) */
  size?: number;
  /** Whether to show language name next to the dot */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LanguageIcon({
  language,
  size = 10,
  showLabel = false,
  className = "",
}: LanguageIconProps) {
  const color = LANGUAGE_COLORS[language] ?? LANGUAGE_COLORS.Other;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-block rounded-full shrink-0"
        style={{ backgroundColor: color, width: size, height: size }}
        aria-label={`${language} language`}
      />
      {showLabel && <span className="text-white/70">{language}</span>}
    </span>
  );
}
