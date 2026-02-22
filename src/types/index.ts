// Core TypeScript type definitions for Developer Soundtrack

export type CIStatus = "pass" | "fail" | "pending" | "unknown";

export type ScaleType = "major" | "minor" | "dorian";

export interface MusicalParams {
  instrument: string;
  note: string;
  duration: number;
  velocity: number;
  octave: number;
  scale: ScaleType;
  pan: number;
  effects: {
    reverb: number;
    delay: number;
  };
}

export interface CommitStats {
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface Commit {
  id: string;
  repoId: string;
  timestamp: string;
  author: string;
  message: string;
  stats: CommitStats;
  primaryLanguage: string;
  languages: Record<string, number>;
  ciStatus: CIStatus;
  musicalParams: MusicalParams;
}

export interface AuthorMotif {
  login: string;
  rhythmPattern: number[];
  panPosition: number;
  color: string;
}

export interface UserSettings {
  userId: string;
  defaultTempo: number;
  defaultRepo: string;
  theme: "dark" | "light";
  instrumentOverrides: Record<string, string>;
  enabledLanguages: string[];
  authorMotifs: AuthorMotif[];
  volume: number;
}
