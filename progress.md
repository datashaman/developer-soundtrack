## Codebase Patterns
- TypeScript strict mode is enabled; all types must be explicit
- Types are exported from `src/types/index.ts` as the central type registry
- Project uses Next.js 16 with App Router, pnpm, Tailwind CSS v4
- Path alias `@/*` maps to `./src/*`
- Tone.js v15 has strict types — use `RecursivePartial<T>` (not `Partial<T>`) when passing partial options to synth constructors; define it locally since it's not exported from the `tone` package
- Use `Record<string, unknown>` for config option maps, then cast to `RecursivePartial<*Options>` at the point of construction

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
