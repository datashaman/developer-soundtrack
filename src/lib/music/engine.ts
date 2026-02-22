import * as Tone from "tone";
import type { Commit } from "@/types";
import { generateAuthorMotif } from "./motifs";
import {
  LANGUAGE_SYNTH_MAP,
  type SynthConfig,
  type ToneInstrument,
} from "./synths";

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

  // Sequential playback state
  private _commits: Commit[] = [];
  private _currentIndex = 0;
  private _playing = false;
  private _paused = false;
  private _tempo = 1.0; // seconds between notes
  private _playbackTimer: ReturnType<typeof setTimeout> | null = null;

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
   * Play a single commit as a musical note.
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

    // Trigger the note — MetalSynth and NoiseSynth don't accept note names
    const config = LANGUAGE_SYNTH_MAP[commit.primaryLanguage] ?? LANGUAGE_SYNTH_MAP["Other"];

    if (config.type === "NoiseSynth") {
      (chain.synth as Tone.NoiseSynth).triggerAttackRelease(
        musicalParams.duration,
        Tone.now(),
        musicalParams.velocity
      );
    } else if (config.type === "MetalSynth") {
      (chain.synth as Tone.MetalSynth).triggerAttackRelease(
        musicalParams.duration,
        Tone.now(),
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
        Tone.now(),
        musicalParams.velocity
      );
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
