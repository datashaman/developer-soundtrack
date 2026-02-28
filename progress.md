## Codebase Patterns
- TypeScript strict mode is enabled; all types must be explicit
- Types are exported from `src/types/index.ts` as the central type registry
- Project uses Next.js 16 with App Router, pnpm, Tailwind CSS v4
- Path alias `@/*` maps to `./src/*`
- Tone.js v15 has strict types — use `RecursivePartial<T>` (not `Partial<T>`) when passing partial options to synth constructors; define it locally since it's not exported from the `tone` package
- Use `Record<string, unknown>` for config option maps, then cast to `RecursivePartial<*Options>` at the point of construction
- MusicEngine is a singleton — access via `MusicEngine.getInstance()`, must call `initialize()` from a user gesture before `playCommit()`
- MetalSynth and NoiseSynth don't accept note names — must type-narrow before calling `triggerAttackRelease`

---

## 2026-02-22 - US-002
- What was implemented: All core TypeScript interfaces — `Commit`, `MusicalParams`, `CommitStats`, `UserSettings`, `AuthorMotif`, plus `CIStatus` and `ScaleType` type aliases
- Files changed: `src/types/index.ts` (created)
- **Learnings for future iterations:**
  - The `src/types/` directory existed but was empty from scaffolding
  - `MusicalParams.effects` is an object with `reverb` and `delay` number fields
  - `Commit.languages` is `Record<string, number>` (language → line count)
  - `UserSettings.instrumentOverrides` is `Record<string, string>` (language → synth type)
  - `AuthorMotif.rhythmPattern` is `number[]` (array of relative durations)
---

## 2026-02-22 - US-004
- What was implemented: Language-to-instrument mapping with Tone.js synth factory. Maps 13 languages (Python, JavaScript, TypeScript, Rust, Go, Java, C, C++, Ruby, CSS, HTML, Shell, Markdown) plus "Other" fallback to appropriate Tone.js synth types with configured oscillators, envelopes, and modulation settings. Synth instances are lazily created and cached.
- Files changed: `src/lib/music/synths.ts` (rewritten to fix TypeScript strict mode errors)
- **Learnings for future iterations:**
  - Tone.js v15 constructors accept `RecursivePartial<*Options>`, NOT `Partial<*Options>` — using `Partial` causes TS errors because nested objects like `oscillator` and `envelope` still require all sub-properties
  - `RecursivePartial` is defined in `tone/Tone/core/util/Interface.ts` but NOT exported from the `tone` package — must be defined locally
  - The config map should use `Record<string, unknown>` for options to avoid fighting the type system; cast to the correct `RecursivePartial<*Options>` only at the point of synth construction
  - Exported types: `SynthType`, `SynthConfig`, `ToneInstrument` for use by other modules
---

## 2026-02-22 - US-007
- What was implemented: MusicEngine singleton class with initialization, single note playback, analyser nodes, volume control, and dispose cleanup
- Files changed: `src/lib/music/engine.ts` (created)
- **Learnings for future iterations:**
  - MusicEngine uses its own `createSynthInstance` (duplicated from synths.ts) because it needs per-language audio chains (Synth → Panner → Reverb → Delay → masterVolume) rather than bare synths
  - MetalSynth and NoiseSynth don't accept note names in `triggerAttackRelease` — they only take duration, time, and velocity. Must type-narrow before calling.
  - Tone.Reverb `wet` property controls mix level (0-1), same for FeedbackDelay
  - Volume mapping: 0-1 linear maps to -Infinity..-60..0 dB (clamped === 0 is -Infinity for silence)
  - Two separate Analyser nodes needed: one for waveform, one for FFT (each Analyser has a single `type`)
  - Signal chain: masterVolume → waveformAnalyser → fftAnalyser → Destination
  - The `LANGUAGE_SYNTH_MAP` from synths.ts is reused for config lookup; the existing `getSynthForLanguage` cache is separate from the engine's chain cache
---

## 2026-02-28 - US-030
- What was implemented: InstrumentLegend component that shows active languages from current commits with their color swatch and Tone.js instrument name
- Files changed:
  - `src/components/player/InstrumentLegend.tsx` (created) — compact legend component using `LANGUAGE_SYNTH_MAP` for instrument names and local `LANGUAGE_COLORS` for color swatches
  - `src/app/play/[owner]/[repo]/page.tsx` (updated) — replaced inline placeholder legend with `<InstrumentLegend>` component, removed unused `LANGUAGE_COLORS` constant
- **Learnings for future iterations:**
  - `LANGUAGE_COLORS` is duplicated in NowPlaying, Timeline, WaveformVisualizer, TestPlayer, and the player page — a future story could consolidate this into a shared constant
  - The player page already computed `activeLanguages` for the placeholder; the InstrumentLegend accepts this as a prop
  - `LANGUAGE_SYNTH_MAP` from `synths.ts` can be safely imported in client components since `tone` is a client-side library
---
