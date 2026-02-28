## Codebase Patterns
- TypeScript strict mode is enabled; all types must be explicit
- Types are exported from `src/types/index.ts` as the central type registry
- Project uses Next.js 16 with App Router, pnpm, Tailwind CSS v4
- Path alias `@/*` maps to `./src/*`
- Tone.js v15 has strict types — use `RecursivePartial<T>` (not `Partial<T>`) when passing partial options to synth constructors; define it locally since it's not exported from the `tone` package
- Use `Record<string, unknown>` for config option maps, then cast to `RecursivePartial<*Options>` at the point of construction
- MusicEngine is a singleton — access via `MusicEngine.getInstance()`, must call `initialize()` from a user gesture before `playCommit()`
- MetalSynth and NoiseSynth don't accept note names — must type-narrow before calling `triggerAttackRelease`
- Theme system uses CSS custom properties in `globals.css` with `.dark`/`.light` classes on `<html>`. Tailwind theme colors: `bg-background`, `text-foreground`, `text-accent`, `bg-surface`, `border-border-subtle`, etc. Never use hardcoded `#0a0a0e` or `#00ffc8` — always use the CSS variable-based classes.
- The `react-hooks/set-state-in-effect` lint rule is strict — never call `setState` synchronously in `useEffect`. Use `useSyncExternalStore` + derived state or lazy `useState` initialization instead.
- When reading CSS custom properties in D3/canvas code (e.g., `getComputedStyle(document.documentElement).getPropertyValue("--var")`), always provide a fallback for jsdom test environments where CSS vars are empty.

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

## 2026-02-28 - US-033
- What was implemented: Full dark/light theme support using CSS custom properties. Created ThemeProvider context with `useTheme` hook, ThemeToggle component, and settings page. Replaced all hardcoded `#0a0a0e`, `#00ffc8`, and `white/XX` opacity values across 17+ components with semantic Tailwind CSS variable-based classes (`bg-background`, `text-accent`, `bg-surface`, `border-border-subtle`, etc.). Added CSS transitions on theme change. `prefers-color-scheme` is respected as initial default. Inline script in `<head>` prevents FOUC. Settings page at `/settings` with dark/light toggle.
- Files changed:
  - `src/hooks/useTheme.ts` (created) — ThemeContext, useTheme hook, useThemeProvider with useSyncExternalStore for system preference
  - `src/components/shared/ThemeToggle.tsx` (created) — Sun/moon toggle button
  - `src/components/shared/Providers.tsx` (updated) — Added ThemeContext provider
  - `src/app/globals.css` (updated) — Added 25+ CSS custom properties for dark/light themes with Tailwind `@theme inline` mapping
  - `src/app/layout.tsx` (updated) — Added `suppressHydrationWarning`, inline FOUC-prevention script, `dark` default class
  - `src/app/settings/page.tsx` (created) — Settings page with theme toggle
  - `src/app/play/[owner]/[repo]/page.tsx` (updated) — Replaced hardcoded colors
  - `src/components/landing/LandingPage.tsx` (updated) — Replaced hardcoded colors
  - `src/components/dashboard/Dashboard.tsx` (updated) — Replaced hardcoded colors
  - `src/components/dashboard/DateRangePicker.tsx` (updated) — Replaced hardcoded colors
  - `src/components/dashboard/RepoSelector.tsx` (updated) — Replaced hardcoded colors
  - `src/components/player/TransportControls.tsx` (updated) — Replaced hardcoded colors
  - `src/components/player/NowPlaying.tsx` (updated) — Replaced hardcoded colors
  - `src/components/player/WaveformVisualizer.tsx` (updated) — Uses `getAccentColor()` from CSS var
  - `src/components/player/Timeline.tsx` (updated) — Uses CSS vars for line color and active stroke with fallbacks
  - `src/components/player/TestPlayer.tsx` (updated) — Replaced hardcoded colors
  - `src/components/player/MobileCommitList.tsx` (updated) — Replaced hardcoded colors
  - `src/components/player/InstrumentLegend.tsx` (updated) — Replaced hardcoded colors
  - `src/components/shared/AuthButton.tsx` (updated) — Replaced hardcoded colors
  - `src/components/shared/LanguageIcon.tsx` (updated) — Replaced `text-white/70` with `text-text-secondary`
- **Learnings for future iterations:**
  - The `react-hooks/set-state-in-effect` lint rule is very strict — `setThemeState` cannot be called directly inside `useEffect`. Solution: use `useSyncExternalStore` for external state (system preference) and derive the effective theme as `userPreference ?? systemTheme`
  - Inline `<script>` in `layout.tsx` with `dangerouslySetInnerHTML` is the standard Next.js App Router approach to prevent FOUC for theme switching
  - CSS custom properties defined in `:root` (dark default) and `.light` override class work well with Tailwind v4's `@theme inline` directive
  - D3/canvas code that reads CSS vars via `getComputedStyle` needs `|| "fallback"` for jsdom test environments
  - `suppressHydrationWarning` on `<html>` is needed because the inline script may change the class before React hydrates
  - The `LANGUAGE_COLORS` map in LanguageIcon remains hardcoded hex values (not theme-dependent) since language colors should stay consistent across themes
---
