import type { ScaleType } from "@/types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const SCALES: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

/**
 * Get a note name from a root note, scale type, and scale index.
 * The scale index wraps around within the scale intervals.
 * Returns a note name like "C4", "F#5", etc.
 */
export function getNoteName(
  rootNote: string,
  scale: ScaleType,
  scaleIndex: number,
  octave: number
): string {
  const rootIndex = NOTE_NAMES.indexOf(rootNote as (typeof NOTE_NAMES)[number]);
  if (rootIndex === -1) {
    throw new Error(`Invalid root note: ${rootNote}`);
  }

  const intervals = SCALES[scale];
  const wrappedIndex = ((scaleIndex % intervals.length) + intervals.length) % intervals.length;
  const octaveOffset = Math.floor(scaleIndex / intervals.length);

  const semitones = intervals[wrappedIndex];
  const absoluteNote = rootIndex + semitones;
  const finalNoteIndex = absoluteNote % 12;
  const finalOctave = octave + octaveOffset + Math.floor(absoluteNote / 12);

  return `${NOTE_NAMES[finalNoteIndex]}${finalOctave}`;
}
