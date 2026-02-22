/**
 * Deterministic hash utilities for generating consistent values from strings.
 * Uses a simple but effective hash function (djb2) to avoid external dependencies.
 */

/**
 * djb2 hash function — produces a 32-bit unsigned integer from a string.
 * Deterministic: same input always produces the same output.
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Hash a string to a floating-point number in the range [min, max].
 */
export function hashToRange(str: string, min: number, max: number): number {
  const hash = djb2Hash(str);
  const normalized = hash / 0xffffffff;
  return min + normalized * (max - min);
}

/**
 * Hash a string to a 6-digit hex color (e.g. "#a3f2c1").
 */
export function hashToColor(str: string): string {
  const hash = djb2Hash(str);
  const hex = (hash & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
}

/**
 * Hash a string to an array of relative durations for a rhythmic motif.
 * Returns an array of 3-6 values, each being 0.5, 1, or 1.5.
 */
export function hashToRhythmPattern(str: string): number[] {
  const hash = djb2Hash(str);
  const possibleDurations = [0.5, 1, 1.5];
  const length = 3 + (hash % 4); // 3 to 6 elements

  const pattern: number[] = [];
  let seed = hash;
  for (let i = 0; i < length; i++) {
    // Use different bits of the hash for each element
    seed = ((seed * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    pattern.push(possibleDurations[seed % possibleDurations.length]);
  }

  return pattern;
}
