## Codebase Patterns
- Package manager: pnpm (not npm/yarn)
- File structure: src/app/, src/lib/, src/components/, src/hooks/, src/types/
- Path alias: `@/*` maps to `./src/*`
- TypeScript strict mode is enabled
- Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- Next.js 16 with App Router
- Node.js v24 LTS required
- Database files go in `data/` directory (gitignored)
- `.env.example` is tracked (excluded from `.env*` gitignore pattern)
- Test runner: Vitest with `pnpm test` (vitest run), config in `vitest.config.ts`
- Typecheck: `pnpm typecheck` (tsc --noEmit)
- Tests go in `*.test.ts` files next to the source files
- Utility modules go in `src/lib/utils/` (hash.ts, etc.)
- djb2 hash function used for deterministic string → number mapping (no external deps)
- Mocking Tone.js: use `function MockX() { this.prop = ... }` constructors, not arrow functions — `new` requires proper constructors
- React hook tests: use `@testing-library/react` with `renderHook`/`act`, set `// @vitest-environment jsdom` comment at top of `.test.tsx` file
- Dev deps for hook testing: `@testing-library/react`, `jsdom`

---

## 2026-02-22 - US-001
- Scaffolded project with Next.js 16, TypeScript, Tailwind CSS v4, pnpm
- Moved `app/` to `src/app/`, created `src/lib/`, `src/components/`, `src/hooks/`, `src/types/`
- Added `.nvmrc` (v24) and `engines` field in package.json
- Created `.env.example` with GitHub OAuth, NextAuth, and Database vars
- Created `data/` directory with `.gitkeep`, gitignored `*.db` files
- Updated tsconfig `@/*` path alias to point to `./src/*`
- Files changed: .gitignore, package.json, tsconfig.json, .nvmrc, .env.example, data/.gitkeep, src/app/* (moved from app/)
- **Learnings for future iterations:**
  - Project was bootstrapped with Next.js 16 (not 14), uses App Router
  - `.gitignore` has `.env*` pattern — need `!.env.example` to track .env.example
  - TypeScript strict mode was already enabled by create-next-app
  - Tailwind v4 uses `@tailwindcss/postcss` plugin (not the classic postcss config)
---

## 2026-02-22 - US-003
- Implemented musical scale definitions (major, minor, dorian) in `src/lib/music/scales.ts`
- Created `getNoteName()` helper function that maps root note + scale + index + octave to a note name (e.g. "C4")
- Set up Vitest test runner with path alias support (`vitest.config.ts`)
- Added `test` and `typecheck` scripts to package.json
- 14 unit tests covering all three scales, octave wrapping, sharps, negative indices, and error cases
- Files changed: `src/lib/music/scales.ts`, `src/lib/music/scales.test.ts`, `vitest.config.ts`, `package.json`
- **Learnings for future iterations:**
  - Vitest works out of the box with TypeScript, just needs path alias config in `vitest.config.ts`
  - Scale index wrapping needs modular arithmetic that handles negative values: `((n % len) + len) % len`
  - Music module lives at `src/lib/music/` — scales, synths, mapping, motifs, engine will all go here
---

## 2026-02-22 - US-005
- Implemented commit-to-musical-parameters mapping in `src/lib/music/mapping.ts`
- Pure functions for each mapping: `mapDiffToPitch`, `mapDiffToDuration`, `mapFilesToVelocity`, `mapFilesToOctave`, `mapCIStatusToScale`, `mapTimeToEffects`
- `commitToMusicalParams(commit)` composes all individual mappers into a complete `MusicalParams` object
- Pan is set to 0 (author-specific pan handled by motif system in US-006)
- 40 unit tests covering all individual mappers and the composite function, including edge cases (zero additions, massive diffs, all CI statuses, merge commits, late night commits)
- Files changed: `src/lib/music/mapping.ts`, `src/lib/music/mapping.test.ts`
- **Learnings for future iterations:**
  - 50 additions / 30 = floor(1.67) = 1, so scaleIndex=1 in major scale gives D (interval 2 semitones), not E
  - `getNoteName("C", "major", 1, 3)` returns "D3" — always verify note calculations manually
  - The mapping module depends on `scales.ts` (for `getNoteName`) and `synths.ts` (for `getSynthConfig`) — these must exist first
  - Merge commit detection uses `message.toLowerCase().startsWith("merge ")` — simple but covers standard GitHub merge messages
---

## 2026-02-22 - US-006
- Created deterministic hash utilities in `src/lib/utils/hash.ts` using djb2 hash function
  - `djb2Hash(str)` — produces 32-bit unsigned integer
  - `hashToRange(str, min, max)` — maps string to a float in [min, max]
  - `hashToColor(str)` — maps string to hex color (e.g. "#a3f2c1")
  - `hashToRhythmPattern(str)` — maps string to array of 3-6 relative durations (0.5, 1, 1.5)
- Created author motif generation in `src/lib/music/motifs.ts`
  - `generateAuthorMotif(login)` returns `AuthorMotif` with pan position, rhythm pattern, and color
  - `hashToPanPosition(login)` maps login to stereo position in [-0.8, 0.8]
- 27 unit tests across `hash.test.ts` (16 tests) and `motifs.test.ts` (11 tests) verifying determinism, value ranges, and correctness
- Files changed: `src/lib/utils/hash.ts`, `src/lib/utils/hash.test.ts`, `src/lib/music/motifs.ts`, `src/lib/music/motifs.test.ts`
- **Learnings for future iterations:**
  - Utility modules go in `src/lib/utils/` (first file created here)
  - djb2 hash is simple, fast, and sufficient for deterministic mapping without external deps
  - Use `>>> 0` to ensure unsigned 32-bit integers in JavaScript bitwise operations
  - Linear congruential generator (`seed * 1103515245 + 12345`) works well for deterministic pseudo-random sequences from a single seed
---

## 2026-02-22 - US-008
- Added sequential playback to MusicEngine in `src/lib/music/engine.ts`
  - `play(commits, startIndex?)` — begins sequential playback using setTimeout scheduling
  - `pause()` / `resume()` — stop and continue from current position
  - `stop()` — halt and reset to beginning
  - `seekTo(index)` — jump to specific commit in the sequence
  - `setTempo(secondsBetweenNotes)` — adjusts playback speed (0.3s to 5.0s range)
  - Callbacks: `onNotePlay`, `onPlaybackComplete`, `onError`
  - State accessors: `playing`, `paused`, `currentIndex`, `currentCommit`, `commitCount`, `tempo`
- 29 unit tests in `src/lib/music/engine.test.ts` covering play, pause, resume, stop, seekTo, setTempo, callbacks, state accessors, and dispose
- Files changed: `src/lib/music/engine.ts`, `src/lib/music/engine.test.ts`
- **Learnings for future iterations:**
  - Mocking Tone.js for tests requires `function` constructors (not arrow functions) — `vi.fn(() => obj)` fails with "not a constructor" when used with `new`
  - `scheduleNext()` plays the current note then increments `_currentIndex` — so after play, `currentIndex` points to the *next* note to be played
  - The `seekTo()` method re-triggers `scheduleNext()` when playing (not paused), so it immediately plays the note at the seeked-to index
  - Exported callback types: `NotePlayCallback`, `PlaybackCompleteCallback`, `ErrorCallback` for consumers
---

## 2026-02-22 - US-009
- Added special sounds to MusicEngine for merge, revert, first-of-day, and CI failure commits
  - **Merge commits**: Layered cymbal/crash via a lazy-created MetalSynth connected to masterVolume
  - **Revert commits**: Temporarily overrides synth envelope to slow attack (70% of duration), sharp release (0.05s), then restores original values
  - **First-of-day**: 3-note ascending arpeggio (scale degrees 0, 2, 4) via a lazy-created Synth, played before the main note
  - **CI failure**: Dissonant grace note one semitone below the main note via a lazy-created Synth
- Added exported helper functions: `isMergeCommit()`, `isRevertCommit()`, `isFirstOfDay()`
- Added private helper `semitoneBelowNote()` for computing grace notes
- Added `_previousCommit` tracking in `scheduleNext()` for first-of-day detection
- Special synths (cymbal, grace, arpeggio) are lazy-created and disposed with the engine
- 18 new tests (47 total in engine.test.ts) covering all special sounds, detection helpers, and timing integrity
- Files changed: `src/lib/music/engine.ts`, `src/lib/music/engine.test.ts`
- **Learnings for future iterations:**
  - Special sound synths use `.connect(masterVolume)` (not `.chain()`) since they bypass the per-language panner/reverb/delay chain
  - Use `getUTCDate()`/`getUTCMonth()`/`getUTCFullYear()` for date comparison to avoid timezone-dependent test failures
  - When testing Tone.js mocks, the same mock constructor (e.g. `Synth`) may be used for both chain synths and special synths — distinguish by checking `.connect` vs `.chain` calls, or by argument patterns (velocity values)
  - Lazy synth creation pattern: check `this.cymbalSynth` for null, create and `.connect()` on first use, dispose in `dispose()`
  - `as unknown as Record<string, unknown>` double-cast needed when accessing envelope properties on ToneInstrument union type
---

## 2026-02-22 - US-010
- Added visualization data tests to `src/lib/music/engine.test.ts` (10 new tests, 57 total in file)
- Verified existing implementation of `getWaveformData()` and `getFFTData()` methods in `src/lib/music/engine.ts`
- Both methods return `Float32Array` from Tone.js Analyser nodes (waveform and FFT)
- Analyser nodes configured with FFT size 2048 in `initialize()`
- Signal chain: masterVolume → waveformAnalyser → fftAnalyser → Destination
- Methods return empty `Float32Array(0)` when engine is not initialized or disposed
- Files changed: `src/lib/music/engine.test.ts`, `.chief/prds/main/prd.json`, `.chief/prds/main/progress.md`
- **Learnings for future iterations:**
  - The visualization data methods (`getWaveformData`, `getFFTData`) were already implemented as part of US-007 engine initialization — US-010 mainly needed test coverage
  - Tone.js mock constructors (e.g. `MockAnalyser`) are plain functions, not `vi.fn()` spies — you can't use `toHaveBeenCalledWith` on them. Test behavior (return values) instead of mock internals
  - `Tone.Volume` mock doesn't have `.mock.instances` since it's a constructor function, not a vi.fn — avoid accessing mock metadata on non-spy constructors
---

## 2026-02-22 - US-011
- Implemented `useMusicEngine` React hook in `src/hooks/useMusicEngine.ts`
  - Exposes state: `isPlaying`, `currentCommit`, `currentIndex`, `progress` (0-1)
  - Exposes controls: `play()`, `pause()`, `resume()`, `stop()`, `seekTo()`, `setTempo()`, `setVolume()`
  - Exposes visualization: `getWaveformData()`, `getFFTData()`
  - `play()` gates initialization behind user gesture (calls `engine.initialize()` on first use)
  - Cleans up engine callbacks on unmount
- Installed `@testing-library/react` and `jsdom` as dev dependencies for React hook testing
- Updated `vitest.config.ts` to include `*.test.tsx` files
- 15 unit tests in `src/hooks/useMusicEngine.test.tsx` covering initial state, all controls, callbacks, cleanup, and single-initialization
- Files changed: `src/hooks/useMusicEngine.ts`, `src/hooks/useMusicEngine.test.tsx`, `vitest.config.ts`, `package.json`, `pnpm-lock.yaml`
- **Learnings for future iterations:**
  - React hook tests use `@testing-library/react` with `renderHook` and `act` — need `jsdom` environment (set via `// @vitest-environment jsdom` comment)
  - The `useMusicEngine` hook wraps the MusicEngine singleton — it sets callbacks in a `useEffect` and clears them on unmount
  - `play()` is async in the hook (calls `ensureInitialized()`) even though `engine.play()` is sync — this gates audio context init behind user gesture
  - The engine's `onNotePlay` fires synchronously within `scheduleNext()` during `play()`, so state updates happen within the same `act()` block
  - Progress formula: `currentIndex / (commitCount - 1)` gives 0-1 range; returns 0 when commitCount is 0
---
