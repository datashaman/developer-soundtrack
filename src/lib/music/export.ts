/**
 * Client-side audio export to WAV.
 * Uses Tone.Offline() to render the soundtrack faster than real-time,
 * then encodes to WAV and triggers download.
 *
 * Note: Spec called for server-side rendering, but Web Audio API
 * (OfflineAudioContext) is browser-only. Client-side is the practical approach.
 */
import * as Tone from "tone";
import type { Commit } from "@/types";
import { generateAuthorMotif } from "./motifs";
import {
  LANGUAGE_SYNTH_MAP,
  type SynthConfig,
  type ToneInstrument,
} from "./synths";
import { getNoteName } from "./scales";
import {
  isMergeCommit,
  isRevertCommit,
  isFirstOfDay,
  semitoneBelowNote,
} from "./engine";

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

/** Schedule a single commit's sounds into the export context */
function scheduleCommitSounds(
  commit: Commit,
  previousCommit: Commit | null,
  startTime: number,
  masterVolume: Tone.Volume,
  chains: Map<string, { synth: ToneInstrument; panner: Tone.Panner; reverb: Tone.Reverb; delay: Tone.FeedbackDelay }>,
  cymbalSynth: Tone.MetalSynth,
  graceSynth: Tone.Synth,
  arpeggioSynth: Tone.Synth
): void {
  const { musicalParams } = commit;
  const key = commit.primaryLanguage in LANGUAGE_SYNTH_MAP ? commit.primaryLanguage : "Other";
  let chain = chains.get(key);
  if (!chain) {
    const config = LANGUAGE_SYNTH_MAP[key];
    const synth = createSynthInstance(config);
    const panner = new Tone.Panner(0);
    const reverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.01 });
    const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.3, wet: 0 });
    synth.chain(panner, reverb, delay, masterVolume);
    chain = { synth, panner, reverb, delay };
    chains.set(key, chain);
  }

  const motif = generateAuthorMotif(commit.author);
  chain.panner.pan.value = motif.panPosition;
  chain.reverb.wet.value = musicalParams.effects.reverb;
  chain.delay.wet.value = musicalParams.effects.delay;

  const config = LANGUAGE_SYNTH_MAP[commit.primaryLanguage] ?? LANGUAGE_SYNTH_MAP["Other"];
  const now = startTime;

  // First-of-day arpeggio
  if (isFirstOfDay(commit, previousCommit)) {
    const arpeggioNotes = [0, 2, 4].map((idx) =>
      getNoteName("C", musicalParams.scale, idx, musicalParams.octave)
    );
    const arpDuration = 0.08;
    for (let i = 0; i < arpeggioNotes.length; i++) {
      arpeggioSynth.triggerAttackRelease(arpeggioNotes[i], arpDuration, now + i * arpDuration, 0.4);
    }
  }

  // CI failure grace note
  if (commit.ciStatus === "fail") {
    const graceNote = semitoneBelowNote(musicalParams.note);
    graceSynth.triggerAttackRelease(graceNote, 0.08, now, 0.5);
  }

  // Revert envelope override (simplified for export - just use normal)
  if (isRevertCommit(commit.message)) {
    const synthAny = chain.synth as unknown as Record<string, unknown>;
    if (synthAny.envelope && typeof synthAny.envelope === "object") {
      const env = synthAny.envelope as { attack: number; release: number; _origAttack?: number; _origRelease?: number };
      env._origAttack = env.attack;
      env._origRelease = env.release;
      env.attack = musicalParams.duration * 0.7;
      env.release = 0.05;
    }
  }

  // Main note
  if (config.type === "NoiseSynth") {
    (chain.synth as Tone.NoiseSynth).triggerAttackRelease(musicalParams.duration, now, musicalParams.velocity);
  } else if (config.type === "MetalSynth") {
    (chain.synth as Tone.MetalSynth).triggerAttackRelease(musicalParams.duration, now, musicalParams.velocity);
  } else {
    (chain.synth as Exclude<ToneInstrument, Tone.NoiseSynth | Tone.MetalSynth>).triggerAttackRelease(
      musicalParams.note,
      musicalParams.duration,
      now,
      musicalParams.velocity
    );
  }

  if (isMergeCommit(commit.message)) {
    cymbalSynth.triggerAttackRelease("8n", now, 0.3);
  }

  if (isRevertCommit(commit.message)) {
    const synthAny = chain.synth as unknown as Record<string, unknown>;
    if (synthAny.envelope && typeof synthAny.envelope === "object") {
      const env = synthAny.envelope as { attack: number; release: number; _origAttack?: number; _origRelease?: number };
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
 * Render commits to an audio buffer using Tone.Offline.
 * Returns a ToneAudioBuffer (wraps Web Audio API AudioBuffer).
 */
export async function renderSoundtrackToBuffer(
  commits: Commit[],
  tempo: number,
  volume: number
): Promise<Tone.ToneAudioBuffer> {
  if (commits.length === 0) {
    throw new Error("No commits to export");
  }

  const tempoSec = Math.min(Math.max(tempo, 0.3), 5.0);
  const totalDuration = (commits.length - 1) * tempoSec + 3; // pad for last note + effects

  const buffer = await Tone.Offline(
    ({ transport }) => {
      const masterVolume = new Tone.Volume(0);
      masterVolume.toDestination();
      const volClamped = Math.min(Math.max(volume, 0), 1);
      masterVolume.volume.value = volClamped === 0 ? -Infinity : -60 + volClamped * 60;

      const chains = new Map<string, { synth: ToneInstrument; panner: Tone.Panner; reverb: Tone.Reverb; delay: Tone.FeedbackDelay }>();
      const cymbalSynth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -12,
      } as RecursivePartial<Tone.MetalSynthOptions>);
      cymbalSynth.connect(masterVolume);

      const graceSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -6,
      } as RecursivePartial<Tone.SynthOptions>);
      graceSynth.connect(masterVolume);

      const arpeggioSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.2 },
        volume: -10,
      } as RecursivePartial<Tone.SynthOptions>);
      arpeggioSynth.connect(masterVolume);

      let prev: Commit | null = null;
      for (let i = 0; i < commits.length; i++) {
        const startTime = i * tempoSec;
        scheduleCommitSounds(
          commits[i],
          prev,
          startTime,
          masterVolume,
          chains,
          cymbalSynth,
          graceSynth,
          arpeggioSynth
        );
        prev = commits[i];
      }

      transport.start(0);
    },
    totalDuration,
    2,
    44100
  );

  return buffer;
}

/**
 * Encode an AudioBuffer to WAV format and return a Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;

  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  function writeString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, format, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  for (let i = 0; i < buffer.length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Trigger a file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export a soundtrack to WAV and trigger download.
 * Shows progress via the onProgress callback (0-1).
 */
export async function exportToWav(
  commits: Commit[],
  params: { tempo: number; volume: number },
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  onProgress?.(0.1);
  const buffer = await renderSoundtrackToBuffer(
    commits,
    params.tempo,
    params.volume
  );
  onProgress?.(0.8);
  const audioBuffer =
    typeof (buffer as { get?: () => AudioBuffer }).get === "function"
      ? (buffer as { get: () => AudioBuffer }).get()
      : (buffer as unknown as AudioBuffer);
  const blob = audioBufferToWavBlob(audioBuffer);
  onProgress?.(1);
  downloadBlob(blob, filename);
}
