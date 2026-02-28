import * as Tone from "tone";
import type { Commit } from "@/types";
import { generateAuthorMotif } from "./motifs";
import {
  LANGUAGE_SYNTH_MAP,
  type SynthConfig,
  type ToneInstrument,
} from "./synths";
import { getNoteName } from "./scales";

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P];
};

function createSynthInstance(config: SynthConfig): ToneInstrument {
  const opts = config.options;
  switch (config.type) {
    case "AMSynth":
      return new Tone.AMSynth(opts as RecursivePartial<Tone.AMSynthOptions>);
    case "FMSynth":
      return new Tone.FMSynth(opts as RecursivePartial<Tone.FMSynthOptions>);
    case "MonoSynth":
      return new Tone.MonoSynth(
        opts as RecursivePartial<Tone.MonoSynthOptions>
      );
    case "MetalSynth":
      return new Tone.MetalSynth(
        opts as RecursivePartial<Tone.MetalSynthOptions>
      );
    case "NoiseSynth":
      return new Tone.NoiseSynth(
        opts as RecursivePartial<Tone.NoiseSynthOptions>
      );
    case "PluckSynth":
      return new Tone.PluckSynth(
        opts as RecursivePartial<Tone.PluckSynthOptions>
      );
    case "Synth":
    default:
      return new Tone.Synth(opts as RecursivePartial<Tone.SynthOptions>);
  }
}

/**
 * Detect if a commit message indicates a merge commit.
 */
export function isMergeCommit(message: string): boolean {
  return message.toLowerCase().startsWith("merge ");
}

/**
 * Detect if a commit message indicates a revert commit.
 */
export function isRevertCommit(message: string): boolean {
  return message.toLowerCase().includes("revert");
}

/**
 * Detect if a commit is the first commit of its day relative to the previous commit.
 * Returns true if there is no previous commit or the previous commit is on a different calendar day.
 */
export function isFirstOfDay(
  commit: Commit,
  previousCommit: Commit | null
): boolean {
  if (!previousCommit) return true;
  const currDate = new Date(commit.timestamp);
  const prevDate = new Date(previousCommit.timestamp);
  return (
    currDate.getUTCFullYear() !== prevDate.getUTCFullYear() ||
    currDate.getUTCMonth() !== prevDate.getUTCMonth() ||
    currDate.getUTCDate() !== prevDate.getUTCDate()
  );
}

/**
 * Get the note name one semitone below a given note.
 * E.g. "C4" → "B3", "D#3" → "D3"
 */
function semitoneBelowNote(note: string): string {
  const noteNames = [
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
  ];
  // Parse note name and octave
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return note;
  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const idx = noteNames.indexOf(noteName);
  if (idx === -1) return note;
  if (idx === 0) {
    return `B${octave - 1}`;
  }
  return `${noteNames[idx - 1]}${octave}`;
}

/**
 * MusicEngine — singleton audio engine for Developer Soundtrack.
 *
 * Signal chain per language synth:
 *   Synth → Panner → Reverb → Volume → Destination
 *
 * A shared Analyser node is tapped off the master Volume for waveform/FFT data.
 */
export type NotePlayCallback = (commit: Commit, index: number) => void;
export type PlaybackCompleteCallback = () => void;
export type ErrorCallback = (error: Error) => void;

export class MusicEngine {
  private static instance: MusicEngine | null = null;

  private initialized = false;
  private masterVolume: Tone.Volume | null = null;
  private waveformAnalyser: Tone.Analyser | null = null;
  private fftAnalyser: Tone.Analyser | null = null;

  /** Per-language audio chains: synth → panner → reverb → delay → masterVolume */
  private synthChains = new Map<
    string,
    {
      synth: ToneInstrument;
      panner: Tone.Panner;
      reverb: Tone.Reverb;
      delay: Tone.FeedbackDelay;
    }
  >();

  /** Special sound nodes — created lazily on first use */
  private cymbalSynth: Tone.MetalSynth | null = null;
  private graceSynth: Tone.Synth | null = null;
  private arpeggioSynth: Tone.Synth | null = null;

  /** Track previous commit for first-of-day detection */
  private _previousCommit: Commit | null = null;

  // Sequential playback state
  private _commits: Commit[] = [];
  private _currentIndex = 0;
  private _playing = false;
  private _paused = false;
  private _tempo = 1.0; // seconds between notes
  private _playbackTimer: ReturnType<typeof setTimeout> | null = null;

  /** Enabled languages — empty array means all enabled (default) */
  private _enabledLanguages: string[] = [];

  // Callbacks
  onNotePlay: NotePlayCallback | null = null;
  onPlaybackComplete: PlaybackCompleteCallback | null = null;
  onError: ErrorCallback | null = null;

  private constructor() {}

  static getInstance(): MusicEngine {
    if (!MusicEngine.instance) {
      MusicEngine.instance = new MusicEngine();
    }
    return MusicEngine.instance;
  }

  /**
   * Initialize the audio context. Must be called from a user gesture.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();

    this.masterVolume = new Tone.Volume(0);
    this.waveformAnalyser = new Tone.Analyser("waveform", 2048);
    this.fftAnalyser = new Tone.Analyser("fft", 2048);

    this.masterVolume.chain(
      this.waveformAnalyser,
      this.fftAnalyser,
      Tone.getDestination()
    );

    this.initialized = true;
  }

  /**
   * Get or create the audio chain for a given language.
   */
  private getChain(language: string): {
    synth: ToneInstrument;
    panner: Tone.Panner;
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
  } {
    const key = language in LANGUAGE_SYNTH_MAP ? language : "Other";
    const existing = this.synthChains.get(key);
    if (existing) return existing;

    const config = LANGUAGE_SYNTH_MAP[key];
    const synth = createSynthInstance(config);
    const panner = new Tone.Panner(0);
    const reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.01 });
    const delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.3,
      wet: 0,
    });

    synth.chain(panner, reverb, delay, this.masterVolume!);

    const chain = { synth, panner, reverb, delay };
    this.synthChains.set(key, chain);
    return chain;
  }

  /**
   * Get or create the cymbal MetalSynth for merge commits.
   */
  private getCymbalSynth(): Tone.MetalSynth {
    if (!this.cymbalSynth) {
      this.cymbalSynth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -12,
      } as RecursivePartial<Tone.MetalSynthOptions>);
      this.cymbalSynth.connect(this.masterVolume!);
    }
    return this.cymbalSynth;
  }

  /**
   * Get or create the grace note Synth for CI failure dissonance.
   */
  private getGraceSynth(): Tone.Synth {
    if (!this.graceSynth) {
      this.graceSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -6,
      } as RecursivePartial<Tone.SynthOptions>);
      this.graceSynth.connect(this.masterVolume!);
    }
    return this.graceSynth;
  }

  /**
   * Get or create the arpeggio Synth for first-of-day commits.
   */
  private getArpeggioSynth(): Tone.Synth {
    if (!this.arpeggioSynth) {
      this.arpeggioSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.2 },
        volume: -10,
      } as RecursivePartial<Tone.SynthOptions>);
      this.arpeggioSynth.connect(this.masterVolume!);
    }
    return this.arpeggioSynth;
  }

  /**
   * Play a single commit as a musical note, with special sounds for
   * merges, reverts, first-of-day, and CI failures.
   */
  playCommit(commit: Commit): void {
    if (!this.initialized || !this.masterVolume) {
      throw new Error("MusicEngine not initialized. Call initialize() first.");
    }

    const { musicalParams } = commit;
    const chain = this.getChain(commit.primaryLanguage);

    // Set pan from author motif
    const motif = generateAuthorMotif(commit.author);
    chain.panner.pan.value = motif.panPosition;

    // Set effects
    chain.reverb.wet.value = musicalParams.effects.reverb;
    chain.delay.wet.value = musicalParams.effects.delay;

    const now = Tone.now();
    const config =
      LANGUAGE_SYNTH_MAP[commit.primaryLanguage] ??
      LANGUAGE_SYNTH_MAP["Other"];

    // --- Special sounds ---

    // First-of-day: brief ascending arpeggio before the main note
    if (isFirstOfDay(commit, this._previousCommit)) {
      const arp = this.getArpeggioSynth();
      // 3-note ascending arpeggio using scale degrees 0, 2, 4
      const arpeggioNotes = [0, 2, 4].map((idx) =>
        getNoteName("C", musicalParams.scale, idx, musicalParams.octave)
      );
      const arpDuration = 0.08;
      for (let i = 0; i < arpeggioNotes.length; i++) {
        arp.triggerAttackRelease(
          arpeggioNotes[i],
          arpDuration,
          now + i * arpDuration,
          0.4
        );
      }
    }

    // CI failure: dissonant grace note a semitone below the main note
    if (commit.ciStatus === "fail") {
      const grace = this.getGraceSynth();
      const graceNote = semitoneBelowNote(musicalParams.note);
      grace.triggerAttackRelease(graceNote, 0.08, now, 0.5);
    }

    // Revert commits: override envelope to slow attack, sharp release
    if (isRevertCommit(commit.message)) {
      // Temporarily modify envelope if the synth has one
      const synthAny = chain.synth as unknown as Record<string, unknown>;
      if (synthAny.envelope && typeof synthAny.envelope === "object") {
        const env = synthAny.envelope as {
          attack: number;
          release: number;
          _origAttack?: number;
          _origRelease?: number;
        };
        env._origAttack = env.attack;
        env._origRelease = env.release;
        env.attack = musicalParams.duration * 0.7;
        env.release = 0.05;
      }
    }

    // Trigger the main note
    if (config.type === "NoiseSynth") {
      (chain.synth as Tone.NoiseSynth).triggerAttackRelease(
        musicalParams.duration,
        now,
        musicalParams.velocity
      );
    } else if (config.type === "MetalSynth") {
      (chain.synth as Tone.MetalSynth).triggerAttackRelease(
        musicalParams.duration,
        now,
        musicalParams.velocity
      );
    } else {
      (
        chain.synth as Exclude<
          ToneInstrument,
          Tone.NoiseSynth | Tone.MetalSynth
        >
      ).triggerAttackRelease(
        musicalParams.note,
        musicalParams.duration,
        now,
        musicalParams.velocity
      );
    }

    // Merge commits: subtle cymbal/crash layered on top
    if (isMergeCommit(commit.message)) {
      const cymbal = this.getCymbalSynth();
      cymbal.triggerAttackRelease("8n", now, 0.3);
    }

    // Restore envelope for revert commits
    if (isRevertCommit(commit.message)) {
      const synthAny = chain.synth as unknown as Record<string, unknown>;
      if (synthAny.envelope && typeof synthAny.envelope === "object") {
        const env = synthAny.envelope as {
          attack: number;
          release: number;
          _origAttack?: number;
          _origRelease?: number;
        };
        if (env._origAttack !== undefined) {
          env.attack = env._origAttack;
          delete env._origAttack;
        }
        if (env._origRelease !== undefined) {
          env.release = env._origRelease;
          delete env._origRelease;
        }
      }
    }
  }

  /**
   * Begin sequential playback of a list of commits.
   */
  play(commits: Commit[], startIndex = 0): void {
    if (!this.initialized) {
      this.onError?.(new Error("MusicEngine not initialized. Call initialize() first."));
      return;
    }
    this._commits = commits;
    this._currentIndex = Math.max(0, Math.min(startIndex, commits.length - 1));
    this._playing = true;
    this._paused = false;
    this.scheduleNext();
  }

  /**
   * Pause playback at the current position.
   */
  pause(): void {
    if (!this._playing || this._paused) return;
    this._paused = true;
    this.clearTimer();
  }

  /**
   * Resume playback from the paused position.
   */
  resume(): void {
    if (!this._playing || !this._paused) return;
    this._paused = false;
    this.scheduleNext();
  }

  /**
   * Stop playback and reset to the beginning.
   */
  stop(): void {
    this.clearTimer();
    this._playing = false;
    this._paused = false;
    this._currentIndex = 0;
    this._previousCommit = null;
  }

  /**
   * Jump to a specific commit in the sequence.
   */
  seekTo(index: number): void {
    if (this._commits.length === 0) return;
    this._currentIndex = Math.max(0, Math.min(index, this._commits.length - 1));
    // If currently playing, restart scheduling from the new position
    if (this._playing && !this._paused) {
      this.clearTimer();
      this.scheduleNext();
    }
  }

  /**
   * Adjust playback speed (seconds between notes, 0.3-5.0 range).
   */
  setTempo(secondsBetweenNotes: number): void {
    this._tempo = Math.min(Math.max(secondsBetweenNotes, 0.3), 5.0);
  }

  /**
   * Set the list of enabled languages. Empty array means all enabled (default).
   * Disabled languages are skipped during sequential playback.
   */
  setEnabledLanguages(languages: string[]): void {
    this._enabledLanguages = languages;
  }

  /** Check if a language is enabled for playback */
  private isLanguageEnabled(language: string): boolean {
    if (this._enabledLanguages.length === 0) return true;
    return this._enabledLanguages.includes(language);
  }

  /** Current playback state accessors */
  get playing(): boolean {
    return this._playing;
  }

  get paused(): boolean {
    return this._paused;
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get currentCommit(): Commit | null {
    if (this._commits.length === 0) return null;
    return this._commits[this._currentIndex] ?? null;
  }

  get commitCount(): number {
    return this._commits.length;
  }

  get tempo(): number {
    return this._tempo;
  }

  private clearTimer(): void {
    if (this._playbackTimer !== null) {
      clearTimeout(this._playbackTimer);
      this._playbackTimer = null;
    }
  }

  private scheduleNext(): void {
    if (!this._playing || this._paused) return;

    // Skip commits whose language is disabled
    while (
      this._currentIndex < this._commits.length &&
      !this.isLanguageEnabled(this._commits[this._currentIndex].primaryLanguage)
    ) {
      this._currentIndex++;
    }

    if (this._currentIndex >= this._commits.length) {
      this._playing = false;
      this._paused = false;
      this.onPlaybackComplete?.();
      return;
    }

    const commit = this._commits[this._currentIndex];
    try {
      this.playCommit(commit);
      this.onNotePlay?.(commit, this._currentIndex);
    } catch (err) {
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    this._previousCommit = commit;
    this._currentIndex++;

    if (this._currentIndex >= this._commits.length) {
      // Last note played; fire complete after the note's duration
      this._playbackTimer = setTimeout(() => {
        this._playing = false;
        this._paused = false;
        this.onPlaybackComplete?.();
      }, this._tempo * 1000);
    } else {
      this._playbackTimer = setTimeout(() => {
        this.scheduleNext();
      }, this._tempo * 1000);
    }
  }

  /**
   * Get current waveform data for visualization.
   */
  getWaveformData(): Float32Array {
    if (!this.waveformAnalyser) return new Float32Array(0);
    return this.waveformAnalyser.getValue() as Float32Array;
  }

  /**
   * Get current FFT data for visualization.
   */
  getFFTData(): Float32Array {
    if (!this.fftAnalyser) return new Float32Array(0);
    return this.fftAnalyser.getValue() as Float32Array;
  }

  /**
   * Set master volume (0-1 range, mapped to decibels).
   */
  setVolume(level: number): void {
    if (!this.masterVolume) return;
    const clamped = Math.min(Math.max(level, 0), 1);
    // Map 0-1 to -Infinity..0 dB (use -60 as practical minimum)
    this.masterVolume.volume.value = clamped === 0 ? -Infinity : -60 + clamped * 60;
  }

  /**
   * Whether the engine has been initialized.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Dispose all synths, effects, and nodes. Resets the singleton.
   */
  dispose(): void {
    this.stop();
    this._commits = [];
    this._previousCommit = null;
    this.onNotePlay = null;
    this.onPlaybackComplete = null;
    this.onError = null;

    for (const chain of this.synthChains.values()) {
      chain.synth.dispose();
      chain.panner.dispose();
      chain.reverb.dispose();
      chain.delay.dispose();
    }
    this.synthChains.clear();

    // Dispose special sound synths
    this.cymbalSynth?.dispose();
    this.graceSynth?.dispose();
    this.arpeggioSynth?.dispose();
    this.cymbalSynth = null;
    this.graceSynth = null;
    this.arpeggioSynth = null;

    this.waveformAnalyser?.dispose();
    this.fftAnalyser?.dispose();
    this.masterVolume?.dispose();

    this.waveformAnalyser = null;
    this.fftAnalyser = null;
    this.masterVolume = null;
    this.initialized = false;

    MusicEngine.instance = null;
  }
}
