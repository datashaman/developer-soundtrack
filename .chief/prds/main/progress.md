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
- Component tests with `// @vitest-environment jsdom`: add explicit `cleanup()` in `afterEach` to prevent DOM accumulation across tests
- Database: better-sqlite3 with WAL mode, foreign keys ON; db modules in `src/lib/db/`
- DB tests: use in-memory SQLite (`:memory:`) with `vi.mock("./index")` to inject test db
- JSON columns (languages, musical_params, etc.) stored as TEXT, parsed with JSON.parse/JSON.stringify
- `pnpm.onlyBuiltDependencies` in package.json for native addons (better-sqlite3)
- Auth: NextAuth.js v5 beta — config in `src/lib/auth.ts`, route at `src/app/api/auth/[...nextauth]/route.ts`
- Auth: `Providers` wrapper (`SessionProvider`) in `src/components/shared/Providers.tsx`, used in root layout
- Auth: Type augmentation for session `accessToken` in `src/types/next-auth.d.ts`
- Animation loops: use `drawRef` pattern (store callback in ref) to avoid self-referencing `useCallback` lint errors
- GitHub integration modules go in `src/lib/github/` (languages.ts, client.ts, commits.ts, etc.)
- Language names must exactly match keys in `LANGUAGE_SYNTH_MAP` from `src/lib/music/synths.ts`
- Commit caching: API routes should call `getCachedCommits()` from `src/lib/github/cache.ts` — it checks SQLite first, fetches from GitHub on miss/stale
- API route auth pattern: call `auth()` from `@/lib/auth`, check `session?.accessToken`, return 401 if missing
- API route test mocking for `auth()`: use separate `vi.fn<() => Promise<Session | null>>()` wired through mock factory to avoid NextAuth overloaded type issues

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

## 2026-02-22 - US-012
- Implemented `WaveformVisualizer` component in `src/components/player/WaveformVisualizer.tsx`
  - Full-width canvas, 140px tall (`h-[140px] w-full`)
  - Real-time waveform drawing from `getWaveformData()` using `requestAnimationFrame`
  - Stroke color transitions smoothly to match current commit's language color via lerp
  - Subtle mirror/reflection effect below centerline at 0.2 opacity (0.1 when idle)
  - Idle/stopped state shows slow sine wave "heartbeat" animation (amplitude 8px, 4 cycles across width)
  - Canvas resizes responsively using `getBoundingClientRect` + `devicePixelRatio` for high-DPI
- Language color map defined inline: Python→#3572A5, JavaScript→#f1e05a, TypeScript→#3178c6, etc.
- Default stroke color is `#00ffc8` (cyan accent matching project design spec)
- 12 unit tests in `WaveformVisualizer.test.tsx` covering rendering, animation lifecycle, idle/playing states, mirror effect, language color transitions, empty data handling
- Files changed: `src/components/player/WaveformVisualizer.tsx`, `src/components/player/WaveformVisualizer.test.tsx`
- **Learnings for future iterations:**
  - This is the first component in `src/components/player/` — directory needed to be created
  - Canvas rendering tests require mocking `HTMLCanvasElement.prototype.getContext`, `getBoundingClientRect`, `requestAnimationFrame`, and `cancelAnimationFrame`
  - Color lerp is done in RGB space for simplicity (parsing hex → interpolating → outputting `rgb()` string)
  - The component takes `getWaveformData`, `isPlaying`, and optional `currentLanguage` as props (not using `useMusicEngine` directly — keeps it decoupled)
  - Language colors are defined in the component; may be extracted to a shared module later when other components need them
---

## 2026-02-22 - US-013
- Implemented `TransportControls` component in `src/components/player/TransportControls.tsx`
  - Play/Pause toggle button — shows Play icon when stopped, Pause icon when playing
  - Stop button — resets playback to beginning
  - Skip backward / Skip forward buttons — disabled at sequence boundaries
  - Tempo slider (0.3s to 5.0s) with numeric display showing value with one decimal
  - Volume slider (0-100%) with mute toggle that remembers pre-mute volume
  - Progress bar showing current position in commit sequence, clickable to seek
  - Commit counter display (e.g. "4 / 10")
- Component is decoupled from `useMusicEngine` — takes callback props for all actions
- 24 unit tests in `TransportControls.test.tsx` covering all buttons, sliders, mute/unmute, progress bar seeking, disabled states, and initial values
- Files changed: `src/components/player/TransportControls.tsx`, `src/components/player/TransportControls.test.tsx`
- **Learnings for future iterations:**
  - `@testing-library/react` needs explicit `cleanup()` in `afterEach` when using `// @vitest-environment jsdom` — without it, multiple renders accumulate in the DOM and `getByLabelText` finds duplicate elements
  - SVG icons are inline (no icon library) — keeps dependencies minimal and bundle small
  - Progress bar uses `role="progressbar"` with aria attributes for accessibility, and `getBoundingClientRect` + `clientX` for click-to-seek calculation
  - Mute toggle stores pre-mute volume in a `useRef` to restore on unmute
  - Component follows same prop-based pattern as `WaveformVisualizer` — decoupled from `useMusicEngine` for testability and reuse
---

## 2026-02-22 - US-014
- Created test page at `/` that plays through hardcoded sample commits with full audio engine integration
- Created `src/lib/data/sample-commits.ts` with 12 hardcoded commits spanning:
  - 7 languages: TypeScript, Python, JavaScript, Rust, Markdown, Shell, Go, Java, C++, CSS, Ruby
  - 5 authors: alice, bob, carol, dave, eve
  - CI statuses: pass, fail, pending, unknown
  - Special commits: merge ("Merge pull request #42"), revert ("Revert ..."), first-of-day (March 11 commits), late-night (23:50)
- Musical params computed dynamically via `commitToMusicalParams()` to stay consistent with mapping logic
- Created `src/components/player/TestPlayer.tsx` client component integrating:
  - `WaveformVisualizer` with language-based stroke color
  - `TransportControls` with all functional controls (play, pause, stop, seek, tempo, volume)
  - Now-playing card showing author, message, language, diff stats, CI status, and musical info
  - Scrollable commit list with clickable items for seeking
- Updated `src/app/page.tsx` to render the test page (replaced default Next.js scaffold)
- Files changed: `src/app/page.tsx`, `src/components/player/TestPlayer.tsx`, `src/lib/data/sample-commits.ts`
- **Learnings for future iterations:**
  - Sample commits use `Omit<Commit, "musicalParams">` and compute params dynamically — keeps data in sync with any mapping logic changes
  - The `TestPlayer` component manages play/resume/stop state via a `hasStartedRef` ref — first play calls `play()`, subsequent calls use `resume()`
  - Language colors are duplicated between `WaveformVisualizer` and `TestPlayer` — may want to extract to a shared module
  - `&minus;` HTML entity works in JSX for the minus sign in diff stats display
---

## 2026-02-22 - US-015
- Set up SQLite database with better-sqlite3 in `src/lib/db/`
- Database connection module (`index.ts`) with singleton pattern, WAL mode, foreign keys ON
- Schema creation (`schema.ts`) with repos, commits, user_settings tables and required indexes (idx_commits_repo_time, idx_commits_author)
- CRUD for repos (`repos.ts`): create, getById, getByFullName, getAll, update (dynamic fields), delete
- CRUD for commits (`commits.ts`): create, createMany (transactional batch), getById, getByRepo (with pagination + date range filtering), getByAuthor, deleteByRepo
- CRUD for settings (`settings.ts`): get (returns defaults for new users), save (upsert via ON CONFLICT), delete
- JSON columns (languages, musical_params, instrument_overrides, etc.) serialized as TEXT
- 32 unit tests in `db.test.ts` covering all CRUD operations, schema creation, cascading deletes, pagination, date filtering, upserts, and defaults
- Added `pnpm.onlyBuiltDependencies` to package.json for better-sqlite3 native addon
- Files changed: `package.json`, `pnpm-lock.yaml`, `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `src/lib/db/repos.ts`, `src/lib/db/commits.ts`, `src/lib/db/settings.ts`, `src/lib/db/db.test.ts`
- **Learnings for future iterations:**
  - better-sqlite3 requires native build — use `pnpm.onlyBuiltDependencies` in package.json (not .npmrc)
  - `pnpm approve-builds` is interactive and doesn't work in non-interactive terminals — use package.json config instead
  - In-memory SQLite (`:memory:`) is ideal for tests — fast, isolated, no cleanup needed
  - `vi.mock("./index")` with a module-level `let db` variable lets tests inject their own database instance
  - SQLite `INSERT OR REPLACE` is useful for commit upserts (same SHA can be re-fetched with updated CI status)
  - Foreign keys need `PRAGMA foreign_keys = ON` each connection (SQLite default is OFF)
  - SQLite stores dates as TEXT — ISO 8601 strings sort correctly for range queries
---

## 2026-02-22 - US-016
- Configured NextAuth.js v5 (beta.30) with GitHub OAuth provider
- Auth config in `src/lib/auth.ts` with GitHub provider, `repo` and `read:org` scopes
- JWT and session callbacks store GitHub access token in encrypted session
- Route handler at `src/app/api/auth/[...nextauth]/route.ts` exports GET/POST handlers
- Type augmentation in `src/types/next-auth.d.ts` extends Session and JWT with `accessToken`
- `AuthButton` client component in `src/components/shared/AuthButton.tsx` shows sign in/out state
- `Providers` wrapper component in `src/components/shared/Providers.tsx` with `SessionProvider`
- Updated `src/app/layout.tsx` to wrap children with `Providers`
- Fixed pre-existing lint errors: WaveformVisualizer self-referencing useCallback (used drawRef pattern), unused imports in mapping.ts/mapping.test.ts
- Files changed: `package.json`, `pnpm-lock.yaml`, `src/lib/auth.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/components/shared/AuthButton.tsx`, `src/components/shared/Providers.tsx`, `src/app/layout.tsx`, `src/components/player/WaveformVisualizer.tsx`, `src/lib/music/mapping.ts`, `src/lib/music/mapping.test.ts`
- **Learnings for future iterations:**
  - NextAuth.js v5 beta works with Next.js 16 — install via `pnpm add next-auth@beta`
  - Auth config goes in `src/lib/auth.ts` (not root `auth.ts`) to match project's file structure
  - Export `{ auth, handlers, signIn, signOut }` from NextAuth() — `handlers` is destructured to `{ GET, POST }` in route handler
  - Use existing env var names from `.env.example` (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET) — pass explicitly to provider config
  - Session augmentation requires `declare module "next-auth"` and `declare module "next-auth/jwt"` in a `.d.ts` file
  - Client components using `useSession` need `SessionProvider` in a parent — use a `Providers` wrapper component in `src/components/shared/Providers.tsx`
  - Self-referencing `useCallback` for animation loops triggers lint error — use `drawRef` pattern: store draw function in a ref, update ref in useEffect, self-reference via `drawRef.current`
---

## 2026-02-22 - US-017
- Implemented file extension to language detection in `src/lib/github/languages.ts`
  - `EXTENSION_LANGUAGE_MAP`: maps 40+ file extensions to language names matching `LANGUAGE_SYNTH_MAP` keys
  - `getLanguageForFile(filePath)`: extracts extension from path and returns language name ("Other" for unknown)
  - `computeLanguageCounts(files)`: aggregates line counts per language from a list of changed files
  - `getPrimaryLanguage(files)`: returns the language with the most lines changed
  - `FileChange` interface: `{ filename: string, changes?: number }` for use by GitHub commit processing
- 34 unit tests in `src/lib/github/languages.test.ts` covering all extensions, path handling, case insensitivity, dotfiles, multi-dot filenames, empty inputs, ties, and real-world scenarios
- Files changed: `src/lib/github/languages.ts`, `src/lib/github/languages.test.ts`
- **Learnings for future iterations:**
  - First file in `src/lib/github/` — this is where GitHub API integration modules live
  - Language names must exactly match keys in `LANGUAGE_SYNTH_MAP` from `src/lib/music/synths.ts` (e.g. "C++", not "Cpp")
  - `FileChange` interface uses optional `changes` field — when absent, counts by file (1 per file) instead of by lines
  - Extension extraction uses `lastIndexOf(".")` to handle multi-dot filenames like `app.test.ts`
  - Files without dots (Makefile, LICENSE, Dockerfile) return "Other"
---

## 2026-02-22 - US-018
- Implemented Octokit wrapper in `src/lib/github/client.ts` — simple factory function that creates authenticated Octokit client
- Implemented commit fetching and processing in `src/lib/github/commits.ts`:
  - `fetchCommits(octokit, options)` — fetches commits from GitHub with pagination, processes each one
  - Fetches commit list via `repos.listCommits` with since/until/page/perPage params
  - Fetches full commit details via `repos.getCommit` for diff stats and changed files
  - Applies language detection from changed files using `getPrimaryLanguage`/`computeLanguageCounts`
  - Computes and attaches musical parameters via `commitToMusicalParams`
  - Returns `{ commits, hasMore, rateLimitRemaining }`
  - `hasMore` determined by whether response length equals perPage
  - Rate limit parsed from `x-ratelimit-remaining` response header
- Installed `octokit` package (v5.0.5) as a dependency
- 16 unit tests in `commits.test.ts` covering: API parameter passing, commit detail fetching, field mapping, language detection, musical params, author fallback, pagination (hasMore), rate limits, empty results, missing stats/files, multi-commit ordering, merge commit effects
- Files changed: `package.json`, `pnpm-lock.yaml`, `src/lib/github/client.ts`, `src/lib/github/commits.ts`, `src/lib/github/commits.test.ts`
- **Learnings for future iterations:**
  - Octokit types are complex — use `mock as unknown as Parameters<typeof fetchCommits>[0]` for test mocks
  - GitHub commit list API returns minimal data; full details (stats, files) require a separate `getCommit` call per SHA
  - `author.login` can be null on GitHub (e.g., commits from non-GitHub users) — fall back to `commit.author.name`
  - CI status is set to "unknown" here — US-019 will add proper CI status fetching
  - Rate limit header key is `x-ratelimit-remaining` (lowercase in Octokit response headers)
---

## 2026-02-22 - US-019
- Implemented CI status fetching module at `src/lib/github/ci-status.ts`
  - `fetchCIStatus(octokit, owner, repo, sha)` — fetches check runs via `checks.listForRef` API
  - Maps check run conclusions to CIStatus: failure/timed_out/cancelled → "fail", all success → "pass", queued/in_progress → "pending", no checks → "unknown"
  - Failure takes priority over pending (checked first)
- Integrated into commit fetching pipeline (`src/lib/github/commits.ts`):
  - `fetchCommits` now calls `fetchCIStatus` for each commit instead of hardcoding `"unknown"`
  - Musical parameters are computed after CI status is set, so scale selection (major/minor/dorian) reflects actual CI state
- 11 unit tests in `ci-status.test.ts` covering: API params, no checks, all success, failure, timed_out, cancelled, in_progress, queued, failure priority over pending, skipped, single success
- 1 new integration test in `commits.test.ts` verifying `fetchCIStatus` is called with correct params and result is used
- Files changed: `src/lib/github/ci-status.ts`, `src/lib/github/ci-status.test.ts`, `src/lib/github/commits.ts`, `src/lib/github/commits.test.ts`
- **Learnings for future iterations:**
  - GitHub Check Runs API: `checks.listForRef` returns `{ check_runs: [...] }` — check `conclusion` for completed runs, `status` for in-progress
  - Check run conclusions include: success, failure, neutral, cancelled, skipped, timed_out, action_required, stale
  - When mocking a module that another module imports, use `vi.mock("./ci-status")` at the module level and `vi.mocked()` to type the mock
  - Failure should be checked before pending — if any check failed, the overall status is "fail" regardless of other running checks
---

## 2026-02-22 - US-020
- Implemented commit caching layer in `src/lib/github/cache.ts`
  - `isCacheStale(lastFetchedAt, queryTo?)` — determines cache freshness based on staleness rules
  - `getCachedCommits(octokit, options)` — checks SQLite cache first, falls back to GitHub fetch
  - Cache freshness rules: 5-minute TTL for recent data (within 24h), permanent cache for historical data (older than 24h)
  - On cache miss: fetches all pages from GitHub, stores commits in SQLite, updates `last_fetched_at` on repo
  - On cache hit: reads directly from SQLite with pagination and date range filtering
  - Ensures repo exists in DB (creates if needed) before storing commits
  - Returns `{ commits, total, page, hasMore, fromCache }` result
- 18 unit tests in `cache.test.ts` covering:
  - `isCacheStale`: null fetch time, fresh/stale recent data, historical data permanence, boundary conditions (exactly 5 min)
  - `getCachedCommits`: cache hit, cache miss, stale cache, historical query bypass, multi-page GitHub fetch, date range passthrough, empty results, hasMore computation, page/limit passthrough
- Files changed: `src/lib/github/cache.ts`, `src/lib/github/cache.test.ts`
- **Learnings for future iterations:**
  - The caching layer sits between the API route (US-022) and the GitHub fetch module — API routes should call `getCachedCommits` instead of `fetchCommits` directly
  - `getRepoByFullName` returns `undefined` (not `null`) when repo not found — check with `=== undefined` or truthiness
  - For mocking both DB and GitHub modules, use `vi.mock("../db/commits")` and `vi.mock("./commits")` separately — each gets its own mock factory
  - `last_fetched_at` is stored as ISO 8601 string on the repos table — already existed in schema from US-015
  - When fetching from GitHub on cache miss, all pages are fetched (not just the requested page) to fully populate the cache
---

## 2026-02-22 - US-021
- Implemented GET /api/repos route at `src/app/api/repos/route.ts`
  - Authenticates via `auth()` from NextAuth — returns 401 if no session or missing accessToken
  - Creates Octokit client with session access token
  - Fetches user's repos via `repos.listForAuthenticatedUser` sorted by `pushed` (desc), 100 per page
  - Maps response to `{ fullName, description, language, pushedAt }` format
  - Graceful error handling: preserves Octokit error status codes, returns 500 for unknown errors
- 7 unit tests in `src/app/api/repos/route.test.ts` covering: unauthenticated (null session, missing token), repo listing, token passthrough, empty repos, Octokit errors, unknown errors
- Files changed: `src/app/api/repos/route.ts`, `src/app/api/repos/route.test.ts`
- **Learnings for future iterations:**
  - NextAuth v5 `auth()` has overloaded types (middleware, route handler, standalone) — in tests, create a separate `vi.fn<() => Promise<Session | null>>()` and wire it through the mock factory to avoid type conflicts
  - API route tests: mock `@/lib/auth` and `@/lib/github/client` at module level with `vi.mock()`, then use `vi.mocked()` or separate fn variables for type-safe mock control
  - Cast mock session objects with `as Session` (import `Session` from `next-auth`) rather than complex conditional types
  - Octokit error objects have a `status` property — check `"status" in error` to extract HTTP status for forwarding
---

## 2026-02-22 - US-022
- Implemented GET /api/commits route at `src/app/api/commits/route.ts`
  - Authenticates via `auth()` from NextAuth — returns 401 if no session or missing accessToken
  - Required query param: `repo` (owner/repo format) — returns 400 if missing or invalid format
  - Optional query params: `from` (ISO date), `to` (ISO date), `page` (default 1), `limit` (default 100, max 100)
  - Validates page (>= 1) and limit (1-100) parameters — returns 400 on invalid values
  - Delegates to `getCachedCommits()` from cache layer (US-020) for cache-first fetching
  - Response format: `{ commits, total, page, hasMore }` — does not expose internal `fromCache` field
  - Graceful error handling: preserves error status codes from Octokit/cache layer, returns 500 for unknown errors
- 17 unit tests in `src/app/api/commits/route.test.ts` covering: auth (null session, missing token), missing repo, invalid repo format, invalid page/limit, default pagination, param passthrough, token passthrough, empty results, hasMore, error handling (Octokit errors, unknown errors)
- Files changed: `src/app/api/commits/route.ts`, `src/app/api/commits/route.test.ts`
- **Learnings for future iterations:**
  - API route tests for routes with query params: create `NextRequest` with `new NextRequest(new URL(url, "http://localhost:3000"))` — the URL base is required
  - The `getCachedCommits` result includes `fromCache` which is an internal detail — the API route should strip it from the response
  - Following same auth pattern as repos route: `auth()` → check `session?.accessToken` → 401 if missing
  - Following same error handling pattern: check `error instanceof Error` for message, check `"status" in error` for HTTP status code forwarding
---

## 2026-02-22 - US-023
- Implemented GET/PUT /api/settings route at `src/app/api/settings/route.ts`
  - **GET**: Returns current user's settings (defaults if none saved) — response format `{ settings: UserSettings }`
  - **PUT**: Accepts JSON body, merges with existing settings, saves to SQLite — response format `{ settings: UserSettings }`
  - Both endpoints require auth (401 if not signed in), identify user by `session.user.email`
  - PUT validates JSON body (400 for invalid JSON, non-object), handles partial updates by merging with current settings
  - PUT overrides `userId` from session (ignores any userId in request body) — prevents impersonation
  - Default settings for new users: tempo 1.0, volume 0.8, theme "dark"
  - Graceful error handling for database errors (500)
- 16 unit tests in `src/app/api/settings/route.test.ts` covering: auth (null session, missing token, no email), GET defaults, GET saved settings, GET errors, PUT auth, PUT invalid JSON, PUT non-object body, PUT full save, PUT partial merge, PUT userId override, PUT errors (Error, non-Error)
- Files changed: `src/app/api/settings/route.ts`, `src/app/api/settings/route.test.ts`
- **Learnings for future iterations:**
  - Settings route uses `session.user?.email` as userId — consistent unique identifier from GitHub OAuth
  - PUT merges body with existing settings before saving — allows partial updates (e.g. just changing theme)
  - `userId` is always overridden from session after merge — `{ ...current, ...body, userId }` ensures body can't override userId
  - Test helper pattern: `makeSession()` and `makePutRequest()` reduce boilerplate across test cases
  - Mock pattern for DB modules: use separate `vi.fn()` variables wired through mock factory (same pattern as auth mock)
---
