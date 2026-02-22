import type { AuthorMotif } from "@/types";
import { hashToColor, hashToRange, hashToRhythmPattern } from "../utils/hash";

/**
 * Generate a deterministic AuthorMotif from a GitHub login.
 * Same login always produces the same pan position, rhythm pattern, and color.
 */
export function generateAuthorMotif(login: string): AuthorMotif {
  return {
    login,
    panPosition: hashToPanPosition(login),
    rhythmPattern: hashToRhythmPattern(login),
    color: hashToColor(login),
  };
}

/**
 * Hash an author login to a stereo pan position in range [-0.8, 0.8].
 */
export function hashToPanPosition(login: string): number {
  const raw = hashToRange(login, -0.8, 0.8);
  // Round to 4 decimal places to avoid floating-point noise
  return Math.round(raw * 10000) / 10000;
}
