/**
 * File extension to programming language mapping and language detection utilities.
 * Used to determine the primary language of a commit from its changed files.
 */

/**
 * Maps file extensions (without the leading dot) to language names.
 * Language names must match keys in LANGUAGE_SYNTH_MAP (src/lib/music/synths.ts).
 */
export const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  // Python
  py: "Python",
  pyw: "Python",
  pyi: "Python",

  // JavaScript
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JavaScript",

  // TypeScript
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",

  // Rust
  rs: "Rust",

  // Go
  go: "Go",

  // Java
  java: "Java",

  // C
  c: "C",
  h: "C",

  // C++
  cpp: "C++",
  cxx: "C++",
  cc: "C++",
  hpp: "C++",
  hxx: "C++",
  hh: "C++",

  // Ruby
  rb: "Ruby",
  rake: "Ruby",
  gemspec: "Ruby",

  // CSS
  css: "CSS",
  scss: "CSS",
  sass: "CSS",
  less: "CSS",

  // HTML
  html: "HTML",
  htm: "HTML",
  svg: "HTML",

  // Shell
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",

  // Markdown
  md: "Markdown",
  mdx: "Markdown",

  // Additional languages that map to "Other" via fallback
  // but are included for completeness:
  json: "Other",
  yaml: "Other",
  yml: "Other",
  toml: "Other",
  xml: "Other",
  lock: "Other",
};

/**
 * Get the language name for a file path based on its extension.
 * Returns "Other" for unknown extensions.
 */
export function getLanguageForFile(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return "Other";

  const ext = filePath.slice(lastDot + 1).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? "Other";
}

export interface FileChange {
  filename: string;
  changes?: number;
}

/**
 * Compute per-language line counts from a list of changed files.
 * Each file contributes its `changes` count (additions + deletions) to its language.
 * If `changes` is not provided, defaults to 1 (count by file).
 */
export function computeLanguageCounts(
  files: FileChange[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const file of files) {
    const language = getLanguageForFile(file.filename);
    const lines = file.changes ?? 1;
    counts[language] = (counts[language] ?? 0) + lines;
  }

  return counts;
}

/**
 * Determine the primary language from a list of changed files.
 * The language with the most lines changed wins.
 * Returns "Other" if no files are provided.
 */
export function getPrimaryLanguage(files: FileChange[]): string {
  if (files.length === 0) return "Other";

  const counts = computeLanguageCounts(files);

  let maxLanguage = "Other";
  let maxCount = 0;

  for (const [language, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLanguage = language;
    }
  }

  return maxLanguage;
}
