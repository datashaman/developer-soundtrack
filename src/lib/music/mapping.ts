import type { CIStatus, Commit, CommitStats, MusicalParams, ScaleType } from "@/types";
import { getNoteName } from "./scales";
import { getSynthConfig } from "./synths";

/**
 * Clamp a value between min and max (inclusive).
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Diff size → scale index (pitch).
 * scaleIndex = clamp(floor(additions / 30), 0, 13) giving a two-octave range.
 */
export function mapDiffToPitch(additions: number): number {
  return clamp(Math.floor(additions / 30), 0, 13);
}

/**
 * Diff size → duration in seconds.
 * clamp(0.15 + (additions / 150), 0.15, 2.5)
 */
export function mapDiffToDuration(additions: number): number {
  return clamp(0.15 + additions / 150, 0.15, 2.5);
}

/**
 * Files changed → velocity.
 * clamp(filesChanged / 10, 0.3, 1.0)
 */
export function mapFilesToVelocity(filesChanged: number): number {
  return clamp(filesChanged / 10, 0.3, 1.0);
}

/**
 * Files changed → octave.
 * >8 files → octave 5, >4 → octave 4, else octave 3
 */
export function mapFilesToOctave(filesChanged: number): number {
  if (filesChanged > 8) return 5;
  if (filesChanged > 4) return 4;
  return 3;
}

/**
 * CI status → scale type.
 * pass → major, fail → minor, pending/unknown → dorian
 */
export function mapCIStatusToScale(ciStatus: CIStatus): ScaleType {
  switch (ciStatus) {
    case "pass":
      return "major";
    case "fail":
      return "minor";
    case "pending":
    case "unknown":
    default:
      return "dorian";
  }
}

/**
 * Determine if a timestamp is "late night" (before 6am or after 10pm).
 */
function isLateNight(timestamp: string): boolean {
  const date = new Date(timestamp);
  const hour = date.getHours();
  return hour < 6 || hour >= 22;
}

/**
 * Determine if a commit message indicates a merge commit.
 */
function isMergeCommit(message: string): boolean {
  return message.toLowerCase().startsWith("merge ");
}

/**
 * Time of day → effects.
 * Late night (before 6am or after 10pm) → reverb 0.6, else 0.2
 * Merge commits → delay 0.4, else 0.0
 */
export function mapTimeToEffects(
  timestamp: string,
  message: string
): { reverb: number; delay: number } {
  const reverb = isLateNight(timestamp) ? 0.6 : 0.2;
  const delay = isMergeCommit(message) ? 0.4 : 0.0;
  return { reverb, delay };
}

/**
 * Convert a Commit into MusicalParams deterministically.
 * Same commit always produces identical MusicalParams.
 */
export function commitToMusicalParams(commit: Commit): MusicalParams {
  const { stats, ciStatus, primaryLanguage, timestamp, message } = commit;

  const scaleIndex = mapDiffToPitch(stats.additions);
  const duration = mapDiffToDuration(stats.additions);
  const velocity = mapFilesToVelocity(stats.filesChanged);
  const octave = mapFilesToOctave(stats.filesChanged);
  const scale = mapCIStatusToScale(ciStatus);
  const effects = mapTimeToEffects(timestamp, message);
  const instrument = getSynthConfig(primaryLanguage).type;
  const note = getNoteName("C", scale, scaleIndex, octave);

  return {
    instrument,
    note,
    duration,
    velocity,
    octave,
    scale,
    pan: 0,
    effects,
  };
}
