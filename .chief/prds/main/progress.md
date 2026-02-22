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
