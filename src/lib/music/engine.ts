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
