# Developer Soundtrack

## Overview
Developer Soundtrack is a web application that connects to GitHub repositories and transforms commit activity into generative, listenable music. Each commit becomes a musical event — the language determines the instrument, the diff size controls pitch and duration, CI status sets the key, and each author has a recognizable motif. The result is a real-time or historical "soundtrack" of your codebase that you can listen to, share, and explore.

The app serves two purposes: it's a novel way to monitor repository activity, and it's a team culture tool that makes development work tangible and shareable.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS v4, Tone.js, SQLite (better-sqlite3), NextAuth.js (GitHub OAuth), Octokit, D3.js, pnpm, Node.js v24 LTS

---

## User Stories

---

### US-001: Project Scaffolding and Configuration
**Priority:** 1
**Description:** As a developer, I want the project scaffolded with the correct tech stack so that all subsequent work builds on a solid foundation.

**Acceptance Criteria:**
- [ ] Next.js 14+ project with App Router and TypeScript configured
- [ ] Tailwind CSS v4 installed and configured
- [ ] pnpm as package manager with Node.js v24 LTS specified in `.nvmrc` and `package.json` engines
- [ ] ESLint and TypeScript strict mode enabled
- [ ] File structure matches the spec: `src/app/`, `src/lib/`, `src/components/`, `src/hooks/`, `src/types/`
- [ ] Environment variables template (`.env.example`) with all required vars documented
- [ ] `data/` directory created and gitignored for SQLite database
- [ ] Project builds and runs without errors on `pnpm dev`

---

### US-002: TypeScript Type Definitions
**Priority:** 1
**Description:** As a developer, I want all core TypeScript interfaces defined so that the data model is consistent across the codebase.

**Acceptance Criteria:**
- [ ] `Commit` interface defined with all fields (id, repoId, timestamp, author, message, stats, primaryLanguage, languages, ciStatus, musicalParams)
- [ ] `MusicalParams` interface defined (instrument, note, duration, velocity, octave, scale, pan, effects)
- [ ] `UserSettings` interface defined (userId, defaultTempo, defaultRepo, theme, instrumentOverrides, enabledLanguages, authorMotifs, volume)
- [ ] `AuthorMotif` interface defined (login, rhythmPattern, panPosition, color)
- [ ] All interfaces exported from `src/types/index.ts`
- [ ] Types compile without errors in strict mode

---

### US-003: Musical Scale Definitions
**Priority:** 1
**Description:** As a developer, I want scale definitions (major, minor, dorian) implemented so that the musical mapping system has the correct note intervals.

**Acceptance Criteria:**
- [ ] Major scale intervals defined: `[0, 2, 4, 5, 7, 9, 11]`
- [ ] Minor scale intervals defined: `[0, 2, 3, 5, 7, 8, 10]`
- [ ] Dorian mode intervals defined: `[0, 2, 3, 5, 7, 9, 10]`
- [ ] Helper function to get a note name from a root note, scale, and scale index
- [ ] Scales module located at `src/lib/music/scales.ts`
- [ ] Unit tests verify correct note generation for each scale

---

### US-004: Language-to-Instrument Mapping
**Priority:** 1
**Description:** As a developer, I want a mapping from programming languages to Tone.js synth types so that each language has a distinctive musical character.

**Acceptance Criteria:**
- [ ] Mapping defined per spec: Python→AMSynth, JavaScript→FMSynth, TypeScript→FMSynth (deeper modulation), Rust→MonoSynth (sawtooth), Go→Synth (triangle), Java→AMSynth, C/C++→MonoSynth (square), Ruby→MonoSynth (warm sawtooth), CSS/HTML→MetalSynth, Shell→NoiseSynth, Markdown→PluckSynth, Other→Synth (triangle)
- [ ] Synth factory function that creates a configured Tone.js synth instance for a given language
- [ ] Synth instances are cached and reused (lazy creation)
- [ ] Module located at `src/lib/music/synths.ts`
- [ ] Each synth type has appropriate tonal character (oscillator type, envelope, modulation settings)

---

### US-005: Commit-to-Musical-Parameters Mapping
**Priority:** 1
**Description:** As a developer, I want pure functions that convert commit data into musical parameters so that every commit deterministically produces the same sound.

**Acceptance Criteria:**
- [ ] Diff size → pitch: `scaleIndex = clamp(floor(additions / 30), 0, 13)` giving a two-octave range
- [ ] Diff size → duration: `clamp(0.15 + (additions / 150), 0.15, 2.5)` seconds
- [ ] Files changed → velocity: `clamp(filesChanged / 10, 0.3, 1.0)`
- [ ] Files changed → octave: >8 files → octave 5, >4 → octave 4, else octave 3
- [ ] CI status → scale: pass→major, fail→minor, pending/unknown→dorian
- [ ] Time of day → effects: late night (before 6am or after 10pm) → reverb 0.6, else 0.2; merge commits → delay 0.4
- [ ] Same commit always produces identical MusicalParams
- [ ] Module located at `src/lib/music/mapping.ts`
- [ ] Unit tests cover edge cases (zero additions, massive diffs, all CI statuses)

---

### US-006: Author Motif Generation
**Priority:** 1
**Description:** As a developer, I want each commit author to have a deterministic stereo position and rhythmic motif derived from their login name so that authors are sonically distinguishable.

**Acceptance Criteria:**
- [ ] Author login hashed to a stereo pan position in range -0.8 to 0.8
- [ ] Author login hashed to a rhythmic motif (array of relative durations, e.g. `[1, 0.5, 0.5, 1]`)
- [ ] Author login hashed to a hex color for UI display
- [ ] Hashing is deterministic — same login always produces same values
- [ ] Utility hash functions in `src/lib/utils/hash.ts`
- [ ] Motif generation in `src/lib/music/motifs.ts`
- [ ] Unit tests verify determinism and value ranges

---

### US-007: MusicEngine Core — Initialization and Single Note Playback
**Priority:** 2
**Description:** As a user, I want the audio engine to initialize and play a single commit as a musical note so that I can hear what a commit sounds like.

**Acceptance Criteria:**
- [ ] `MusicEngine` class implemented as a singleton in `src/lib/music/engine.ts`
- [ ] `initialize()` method calls `Tone.start()` (requires user gesture)
- [ ] `playCommit(commit)` method: creates/retrieves synth for the commit's language, sets pan, reverb, delay, and triggers the note with correct pitch, duration, and velocity
- [ ] Audio signal chain: Synth → Panner → Reverb → Volume → Destination
- [ ] Analyser node connected for waveform data
- [ ] `dispose()` cleans up all synths and nodes
- [ ] `setVolume(level)` controls master volume (0-1)

---

### US-008: MusicEngine — Sequential Playback
**Priority:** 2
**Description:** As a user, I want to play through a sequence of commits as a soundtrack so that I can hear the musical representation of repository activity over time.

**Acceptance Criteria:**
- [ ] `play(commits, startIndex?)` begins sequential playback using `setTimeout` scheduling
- [ ] `pause()` stops playback at current position, `resume()` continues from where it paused
- [ ] `stop()` halts playback and resets to the beginning
- [ ] `seekTo(index)` jumps to a specific commit in the sequence
- [ ] `setTempo(secondsBetweenNotes)` adjusts playback speed (0.3s to 5.0s range)
- [ ] `onNotePlay` callback fires with the current commit and index when each note plays
- [ ] `onPlaybackComplete` callback fires when all commits have played
- [ ] `onError` callback fires on audio errors

---

### US-009: MusicEngine — Special Sounds
**Priority:** 2
**Description:** As a user, I want special commits (merges, reverts, first-of-day, CI failures) to have distinctive sonic signatures so that notable events stand out in the soundtrack.

**Acceptance Criteria:**
- [ ] Merge commits: subtle cymbal/crash layered on top of the normal note
- [ ] Revert commits (message contains "revert"): reversed envelope (slow attack, sharp release)
- [ ] First commit of the day: brief ascending arpeggio before the note
- [ ] CI failure: dissonant grace note a semitone below the main note
- [ ] Special sounds do not interfere with normal playback timing

---

### US-010: MusicEngine — Visualization Data
**Priority:** 2
**Description:** As a developer, I want the MusicEngine to expose waveform and FFT data so that visualizations can render in real-time.

**Acceptance Criteria:**
- [ ] `getWaveformData()` returns `Float32Array` of current waveform samples
- [ ] `getFFTData()` returns `Float32Array` of current frequency data
- [ ] Data updates in real-time during playback
- [ ] Analyser node configured with appropriate FFT size (e.g. 2048)

---

### US-011: React Hook — useMusicEngine
**Priority:** 2
**Description:** As a developer, I want a React hook that wraps the MusicEngine singleton so that components can control playback and react to state changes.

**Acceptance Criteria:**
- [ ] `useMusicEngine` hook in `src/hooks/useMusicEngine.ts`
- [ ] Exposes: `isPlaying`, `currentCommit`, `currentIndex`, `progress` (0-1)
- [ ] Exposes: `play()`, `pause()`, `resume()`, `stop()`, `seekTo()`, `setTempo()`, `setVolume()`
- [ ] Exposes: `getWaveformData()`, `getFFTData()`
- [ ] Handles initialization (gated behind user gesture)
- [ ] Cleans up on unmount

---

### US-012: Waveform Visualizer Component
**Priority:** 2
**Description:** As a user, I want to see a real-time waveform visualization that responds to the music so that I have visual feedback of the audio.

**Acceptance Criteria:**
- [ ] `WaveformVisualizer` component in `src/components/player/WaveformVisualizer.tsx`
- [ ] Full-width canvas, approximately 140px tall
- [ ] Draws real-time waveform from `MusicEngine.getWaveformData()` using `requestAnimationFrame`
- [ ] Stroke color transitions to match the current commit's language color
- [ ] Subtle mirror/reflection effect below the centerline at reduced opacity
- [ ] When idle/stopped, shows a slow sine wave "heartbeat" animation
- [ ] Canvas resizes responsively

---

### US-013: Transport Controls Component
**Priority:** 2
**Description:** As a user, I want play/pause, stop, skip, tempo, and volume controls so that I can control playback of the soundtrack.

**Acceptance Criteria:**
- [ ] `TransportControls` component in `src/components/player/TransportControls.tsx`
- [ ] Play/Pause toggle button (gates `Tone.start()` on first click)
- [ ] Stop button (resets to beginning)
- [ ] Skip forward / skip backward buttons (move to next/previous commit)
- [ ] Tempo slider (0.3s to 5.0s between notes) with numeric display
- [ ] Volume slider (0-100%) with mute toggle
- [ ] Progress bar showing current position in the commit sequence (clickable to seek)

---

### US-014: Test Page with Hardcoded Commit Data
**Priority:** 2
**Description:** As a developer, I want a test page that plays through hardcoded sample commits so that I can verify the audio engine works end-to-end before integrating GitHub data.

**Acceptance Criteria:**
- [ ] Page accessible at `/` for now (will become landing page later)
- [ ] Contains at least 10 hardcoded sample commits spanning multiple languages, authors, CI statuses, and diff sizes
- [ ] Includes merge commits, a revert commit, and first-of-day commits to test special sounds
- [ ] Waveform visualizer renders above transport controls
- [ ] All transport controls functional: play, pause, stop, seek, tempo, volume
- [ ] Current commit info displayed during playback (author, message, language, note)

---

### US-015: SQLite Database Setup and Schema
**Priority:** 3
**Description:** As a developer, I want the SQLite database initialized with the correct schema so that commit data and settings can be persisted.

**Acceptance Criteria:**
- [ ] SQLite connection via better-sqlite3 in `src/lib/db/index.ts`
- [ ] Database file at path from `DATABASE_PATH` env var (default `./data/soundtrack.db`)
- [ ] Schema creation on first run: `repos`, `commits`, `user_settings` tables per spec
- [ ] Indexes created: `idx_commits_repo_time`, `idx_commits_author`
- [ ] Schema module at `src/lib/db/schema.ts`
- [ ] CRUD operations for commits in `src/lib/db/commits.ts`
- [ ] CRUD operations for repos in `src/lib/db/repos.ts`
- [ ] CRUD operations for settings in `src/lib/db/settings.ts`
- [ ] Database file is gitignored

---

### US-016: NextAuth.js GitHub OAuth Setup
**Priority:** 3
**Description:** As a user, I want to sign in with my GitHub account so that the app can access my repositories.

**Acceptance Criteria:**
- [ ] NextAuth.js configured with GitHub OAuth provider
- [ ] OAuth scopes: `repo`, `read:org`
- [ ] Auth route at `/api/auth/[...nextauth]/route.ts`
- [ ] Access token stored in encrypted session
- [ ] Sign in / sign out flows work correctly
- [ ] `AuthButton` component in `src/components/shared/AuthButton.tsx` shows sign in/out state
- [ ] Environment variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

---

### US-017: File Extension to Language Detection
**Priority:** 3
**Description:** As a developer, I want file extensions mapped to programming languages so that commits can be tagged with their primary language.

**Acceptance Criteria:**
- [ ] Extension map in `src/lib/github/languages.ts` covering: .py, .js, .ts, .tsx, .jsx, .rs, .go, .java, .c, .cpp, .h, .rb, .css, .html, .sh, .bash, .md (and more as appropriate)
- [ ] Function to determine primary language from a list of changed files (language with most lines changed wins)
- [ ] Function to compute per-language line counts from file list
- [ ] Unknown extensions map to "Other"
- [ ] Unit tests cover common and edge cases

---

### US-018: GitHub Commit Fetching and Processing
**Priority:** 3
**Description:** As a user, I want the app to fetch commits from my GitHub repositories so that I can generate soundtracks from real commit data.

**Acceptance Criteria:**
- [ ] Octokit wrapper in `src/lib/github/client.ts` using session access token
- [ ] Commit fetching in `src/lib/github/commits.ts` using `GET /repos/{owner}/{repo}/commits` with `since`/`until` params
- [ ] For each commit, fetches full details (`GET /repos/{owner}/{repo}/commits/{sha}`) for diff stats and files
- [ ] Language detection applied per commit from changed files
- [ ] Musical parameters computed and attached to each commit
- [ ] Pagination support (100 per page)
- [ ] Rate limit awareness (respect `X-RateLimit-Remaining` headers)

---

### US-019: CI Status Fetching
**Priority:** 3
**Description:** As a developer, I want commit CI status fetched from GitHub Check Runs so that the musical key reflects build health.

**Acceptance Criteria:**
- [ ] CI status module at `src/lib/github/ci-status.ts`
- [ ] Fetches check runs via `GET /repos/{owner}/{repo}/commits/{sha}/check-runs`
- [ ] Maps to status: any failure → "fail", all success → "pass", still running → "pending", no checks → "unknown"
- [ ] Integrates with commit fetching pipeline

---

### US-020: Commit Caching Layer
**Priority:** 3
**Description:** As a user, I want commit data cached in SQLite so that repeated plays don't hit the GitHub API and load times are fast.

**Acceptance Criteria:**
- [ ] `/api/commits` route checks SQLite cache first
- [ ] Cache hit returns data directly without GitHub API call
- [ ] Cache considered stale after 5 minutes for recent data (commits from last 24 hours)
- [ ] Historical data (older than 24 hours) cached permanently
- [ ] Cache miss triggers GitHub fetch, processes commits, stores in SQLite, then returns
- [ ] `last_fetched_at` tracked per repo for staleness checks

---

### US-021: API Route — GET /api/repos
**Priority:** 3
**Description:** As a user, I want an API endpoint that returns my GitHub repositories so that I can choose which repo to generate a soundtrack for.

**Acceptance Criteria:**
- [ ] Route at `src/app/api/repos/route.ts`
- [ ] Returns authenticated user's repositories sorted by most recently pushed
- [ ] Response format: `{ repos: [{ fullName, description, language, pushedAt }] }`
- [ ] Requires authentication (returns 401 if not signed in)
- [ ] Handles Octokit errors gracefully

---

### US-022: API Route — GET /api/commits
**Priority:** 3
**Description:** As a user, I want an API endpoint that returns processed commits with musical parameters for a given repo and time range.

**Acceptance Criteria:**
- [ ] Route at `src/app/api/commits/route.ts`
- [ ] Query params: `repo` (required), `from` (ISO date), `to` (ISO date), `page`, `limit` (default 100)
- [ ] Response format: `{ commits: [Commit], total, page, hasMore }`
- [ ] Uses caching layer (US-020)
- [ ] Requires authentication
- [ ] Handles missing/invalid params with appropriate error responses

---

### US-023: API Route — GET/PUT /api/settings
**Priority:** 3
**Description:** As a user, I want an API endpoint to read and save my settings so that my preferences persist across sessions.

**Acceptance Criteria:**
- [ ] Route at `src/app/api/settings/route.ts`
- [ ] GET returns current user's settings (defaults if none saved)
- [ ] PUT accepts a `UserSettings` JSON body and saves to SQLite
- [ ] Requires authentication
- [ ] Returns sensible defaults for new users (tempo: 1.0, volume: 0.8, theme: "dark")

---

### US-024: React Hook — useCommits
**Priority:** 3
**Description:** As a developer, I want a React hook for fetching commits from the API so that player pages can easily load commit data.

**Acceptance Criteria:**
- [ ] `useCommits` hook in `src/hooks/useCommits.ts`
- [ ] Accepts repo, date range, and pagination params
- [ ] Returns: `commits`, `isLoading`, `error`, `hasMore`, `loadMore()`
- [ ] Handles fetch errors gracefully
- [ ] Supports refetching when params change

---

### US-025: Landing Page — Unauthenticated
**Priority:** 4
**Description:** As a visitor, I want to see a marketing landing page with a demo player so that I understand what the app does before signing in.

**Acceptance Criteria:**
- [ ] Displayed at `/` when user is not authenticated
- [ ] Hero section explaining the concept
- [ ] Embedded demo player using hardcoded sample commit data (same data from US-014)
- [ ] "Connect with GitHub" call-to-action button
- [ ] Dark theme with visual aesthetic per spec: near-black background (#0a0a0e), cyan/teal accent (#00ffc8)
- [ ] Typography: JetBrains Mono for code/data, Space Grotesk for headings

---

### US-026: Dashboard — Authenticated
**Priority:** 4
**Description:** As an authenticated user, I want a dashboard where I can select a repo and time range to generate a soundtrack.

**Acceptance Criteria:**
- [ ] Displayed at `/` when user is authenticated
- [ ] Repository selector dropdown (`RepoSelector` component) populated from `/api/repos`
- [ ] Time range selector with presets: today, this week, this sprint, custom range (`DateRangePicker` component)
- [ ] "Play" button that navigates to `/play/[owner]/[repo]?range=...`
- [ ] Recent sessions list showing last 5 played soundtracks (repo, date range, commit count)
- [ ] Loading states for repo list fetch

---

### US-027: Player Page — Core Layout
**Priority:** 4
**Description:** As a user, I want the main player page at `/play/[owner]/[repo]` to display the full soundtrack experience with all player components.

**Acceptance Criteria:**
- [ ] Route at `src/app/play/[owner]/[repo]/page.tsx`
- [ ] URL determines repo; query params for time range (`from`, `to`, `range`)
- [ ] Fetches commits via `useCommits` hook on mount
- [ ] Layout (top to bottom): header bar, waveform visualizer, transport controls, now-playing card, timeline, instrument legend
- [ ] Header shows: repo name, commit count, date range, settings gear icon link
- [ ] Loading state while commits are being fetched
- [ ] Empty state if no commits found in range

---

### US-028: Now Playing Card Component
**Priority:** 4
**Description:** As a user, I want to see detailed information about the currently playing commit so that I understand what I'm hearing.

**Acceptance Criteria:**
- [ ] `NowPlaying` component in `src/components/player/NowPlaying.tsx`
- [ ] Displays: author avatar + login, commit message (truncated to 2 lines), language icon + name
- [ ] Displays: diff stats (`+142 −23` with green/red coloring), CI status badge (green checkmark / red X)
- [ ] Displays: musical info ("AMSynth → C4 major, 0.8s, pan: -0.3")
- [ ] Subtle entrance animation when a new commit starts playing
- [ ] Graceful empty state when nothing is playing

---

### US-029: Timeline Visualization
**Priority:** 4
**Description:** As a user, I want a horizontal timeline of commits that I can scroll and click to navigate the soundtrack.

**Acceptance Criteria:**
- [ ] `Timeline` component in `src/components/player/Timeline.tsx` using D3.js
- [ ] Each commit is a circular node: size proportional to `additions + deletions` (min 8px, max 28px), colored by language
- [ ] Currently playing commit has a 2px solid white border
- [ ] Nodes connected by a thin line (1px, `rgba(255,255,255,0.08)`)
- [ ] Hover tooltip: author, message, timestamp, diff stats
- [ ] Click on a node seeks playback to that commit
- [ ] Auto-scrolls to keep the current commit centered during playback
- [ ] Horizontal scrolling for overflow
- [ ] Virtualizes rendering if >200 commits (only renders visible nodes)

---

### US-030: Instrument Legend Component
**Priority:** 4
**Description:** As a user, I want to see which instruments represent which languages so that I can understand the sonic palette.

**Acceptance Criteria:**
- [ ] `InstrumentLegend` component in `src/components/player/InstrumentLegend.tsx`
- [ ] Shows each active language (from current commits) with its color swatch and instrument name
- [ ] Compact layout that doesn't dominate the page
- [ ] Only shows languages present in the current commit set

---

### US-031: Shared UI Components
**Priority:** 4
**Description:** As a developer, I want reusable shared components for common UI elements used across pages.

**Acceptance Criteria:**
- [ ] `LanguageIcon` component: colored dot/icon for a programming language
- [ ] `CIBadge` component: green checkmark, red X, yellow clock, or gray question mark for CI statuses
- [ ] `DiffStats` component: `+N −M` display with green/red coloring
- [ ] All components in `src/components/shared/`
- [ ] Components follow the dark-theme visual aesthetic

---

### US-032: Responsive Layout
**Priority:** 4
**Description:** As a user, I want the player to work well on desktop, tablet, and mobile devices.

**Acceptance Criteria:**
- [ ] Desktop (>1024px): full layout as specified
- [ ] Tablet (768-1024px): now-playing card stacks below the timeline
- [ ] Mobile (<768px): waveform + transport controls at top, vertical scrolling commit list replaces horizontal timeline, now-playing becomes a compact bottom bar
- [ ] All interactive elements have appropriate touch targets on mobile (min 44px)
- [ ] Tailwind responsive classes used throughout

---

### US-033: Dark/Light Theme Support
**Priority:** 5
**Description:** As a user, I want to toggle between dark and light themes so that I can use the app in my preferred visual style.

**Acceptance Criteria:**
- [ ] Dark theme (default): near-black background (#0a0a0e), cyan accent (#00ffc8), subtle noise texture
- [ ] Light theme: inverted colors with appropriate contrast
- [ ] Theme preference saved in user settings via `/api/settings`
- [ ] Theme toggle accessible from settings page
- [ ] CSS transitions on theme change
- [ ] `prefers-color-scheme` respected for initial state if no saved preference

---

### US-034: Webhook Registration for Live Mode
**Priority:** 5
**Description:** As a user, I want to register a GitHub webhook for a repository so that the app receives push events in real-time.

**Acceptance Criteria:**
- [ ] Webhook registration function in `src/lib/github/webhooks.ts`
- [ ] Registers webhook via `POST /repos/{owner}/{repo}/hooks` with `push` and `check_run` events
- [ ] Generates and stores a unique webhook secret per repo
- [ ] Stores webhook ID in the `repos` table for later management
- [ ] UI trigger in settings or live mode page to enable live mode for a repo
- [ ] Handles errors (insufficient permissions, webhook already exists)

---

### US-035: Webhook Receiver Endpoint
**Priority:** 5
**Description:** As a developer, I want an API endpoint that receives and validates GitHub webhook payloads so that push events can be processed for live mode.

**Acceptance Criteria:**
- [ ] Route at `src/app/api/webhook/route.ts`
- [ ] Validates `X-Hub-Signature-256` header against stored webhook secret
- [ ] Parses `push` event payloads to extract commits
- [ ] Processes new commits (language detection, CI status, musical params)
- [ ] Stores processed commits in SQLite
- [ ] Returns 200 on success, 401 on invalid signature, 400 on malformed payload

---

### US-036: Server-Sent Events for Live Commit Streaming
**Priority:** 5
**Description:** As a user, I want live commits streamed to my browser via SSE so that the player can play new commits in real-time.

**Acceptance Criteria:**
- [ ] SSE endpoint (could be part of webhook processing or a dedicated `/api/live` route)
- [ ] Webhook receiver broadcasts new commits to connected SSE clients
- [ ] Clients identified by repo they're subscribed to (only receive commits for their repo)
- [ ] Handles client disconnects gracefully
- [ ] Reconnection support on the client side

---

### US-037: React Hook — useLiveCommits
**Priority:** 5
**Description:** As a developer, I want a React hook for subscribing to live commit events so that the live player page can receive commits as they happen.

**Acceptance Criteria:**
- [ ] `useLiveCommits` hook in `src/hooks/useLiveCommits.ts`
- [ ] Accepts a repo identifier
- [ ] Establishes SSE connection and returns new commits as they arrive
- [ ] Returns: `latestCommit`, `isConnected`, `error`
- [ ] Auto-reconnects on disconnect
- [ ] Cleans up SSE connection on unmount

---

### US-038: Live Mode Player Page
**Priority:** 5
**Description:** As a user, I want a live mode page at `/play/[owner]/[repo]/live` that plays commits in real-time as they are pushed to the repository.

**Acceptance Criteria:**
- [ ] Route at `src/app/play/[owner]/[repo]/live/page.tsx`
- [ ] Connects via `useLiveCommits` hook
- [ ] Each new commit plays immediately when received
- [ ] Timeline grows rightward as new commits arrive
- [ ] "Waiting for commits..." idle state with subtle ambient drone
- [ ] Pulsing dot indicator showing live mode is active
- [ ] Waveform visualizer active during playback
- [ ] Now-playing card updates with each new commit

---

### US-039: Settings Page — Tempo and Volume
**Priority:** 5
**Description:** As a user, I want to configure default tempo and volume in settings so that my preferred playback parameters persist.

**Acceptance Criteria:**
- [ ] Settings page at `/settings`
- [ ] Tempo slider with numeric input (0.3s to 5.0s)
- [ ] Volume slider (0-100%)
- [ ] Default repository dropdown
- [ ] Changes saved to server via `PUT /api/settings`
- [ ] Settings loaded on page mount via `GET /api/settings`
- [ ] Success/error feedback on save

---

### US-040: Settings Page — Instrument Overrides
**Priority:** 5
**Description:** As a user, I want to customize which instrument represents each programming language so that I can personalize my soundtrack.

**Acceptance Criteria:**
- [ ] `InstrumentMapper` component in `src/components/settings/InstrumentMapper.tsx`
- [ ] Table of language → instrument dropdown for each supported language
- [ ] Each row has a "Preview" button that plays a sample note with the selected synth
- [ ] Changes saved as `instrumentOverrides` in user settings
- [ ] "Reset to defaults" button

---

### US-041: Settings Page — Language Toggles
**Priority:** 5
**Description:** As a user, I want to mute/unmute specific languages so that I can focus on the languages I care about.

**Acceptance Criteria:**
- [ ] `LanguageToggle` component in `src/components/settings/LanguageToggle.tsx`
- [ ] Checklist of all supported languages with toggle switches
- [ ] Disabled languages are skipped during playback
- [ ] Saved as `enabledLanguages` in user settings

---

### US-042: Settings Page — Author Motif Editor
**Priority:** 6
**Description:** As a user, I want to customize author motifs (color and rhythm pattern) so that I can personalize how team members sound.

**Acceptance Criteria:**
- [ ] `MotifEditor` component in `src/components/settings/MotifEditor.tsx`
- [ ] Lists known authors from connected repos
- [ ] Each author has a color picker
- [ ] Each author has a rhythm pattern editor (visual, tap-to-create pattern)
- [ ] "Preview" button plays a sample note with the author's motif
- [ ] "Reset to default" restores the deterministic hash-based motif
- [ ] Saved as `authorMotifs` in user settings

---

### US-043: Date Range Utility Functions
**Priority:** 3
**Description:** As a developer, I want date range helper functions so that "today", "this week", "this sprint" presets resolve to correct ISO date ranges.

**Acceptance Criteria:**
- [ ] Utility module at `src/lib/utils/time.ts`
- [ ] `getDateRange(preset: "today" | "week" | "sprint" | "custom", customFrom?, customTo?)` returns `{ from: string, to: string }` in ISO 8601
- [ ] "today" = midnight today to now
- [ ] "week" = Monday of current week to now
- [ ] "sprint" = 14 days ago to now (common sprint length)
- [ ] "custom" uses the provided from/to dates
- [ ] Unit tests for each preset and edge cases (e.g., Monday itself)

---

### US-044: Error Handling and Loading States
**Priority:** 6
**Description:** As a user, I want consistent loading, error, and empty states throughout the app so that I always know what's happening.

**Acceptance Criteria:**
- [ ] Loading spinner/skeleton shown while commits are fetching
- [ ] Error messages displayed when API calls fail (with retry option)
- [ ] Empty state when no commits found ("No commits in this time range")
- [ ] Empty state when no repos found ("Connect a repository to get started")
- [ ] GitHub rate limit warning displayed when remaining calls are low (<100)
- [ ] Audio initialization error handled (browser doesn't support Web Audio)
- [ ] Network error states for SSE disconnects in live mode

---

### US-045: Demo Mode for Unauthenticated Users
**Priority:** 6
**Description:** As an unauthenticated visitor, I want to play the demo soundtrack from the landing page so that I can experience the app before signing in.

**Acceptance Criteria:**
- [ ] Demo player on landing page uses hardcoded sample commits (no auth required)
- [ ] Full playback experience: waveform visualizer, transport controls, now-playing card
- [ ] Simplified — no timeline, no settings, no repo selector
- [ ] "Sign in to play your own repos" call-to-action displayed prominently
- [ ] Demo data covers multiple languages, authors, and CI statuses

---

### US-046: SEO and Meta Tags
**Priority:** 6
**Description:** As a developer, I want proper meta tags and OG images so that shared links look good on social media.

**Acceptance Criteria:**
- [ ] Page titles set appropriately for each route (e.g., "Developer Soundtrack — Listen to your code")
- [ ] Meta description set
- [ ] Open Graph tags: title, description, image, URL
- [ ] Twitter card meta tags
- [ ] OG image (static for MVP — can be a designed image)
- [ ] Favicon set

---

### US-047: Audio Export to WAV (Stretch)
**Priority:** 7
**Description:** As a user, I want to export a soundtrack as a WAV file so that I can share it outside the app.

**Acceptance Criteria:**
- [ ] API route at `/api/export`
- [ ] Accepts list of commit IDs and playback params (tempo, volume)
- [ ] Renders audio server-side using Tone.js `OfflineAudioContext`
- [ ] Returns downloadable WAV file
- [ ] "Export" button on the player page triggers the download
- [ ] Progress indicator during rendering

---

### US-048: Shareable Public Links (Stretch)
**Priority:** 7
**Description:** As a user, I want to generate a shareable link to a soundtrack so that others can listen without needing to sign in.

**Acceptance Criteria:**
- [ ] "Share" button on the player page generates a public URL
- [ ] Public URL includes repo, date range, and playback params
- [ ] Public player page works without authentication (reads cached commit data)
- [ ] Link is copyable to clipboard
- [ ] Shared page shows a "Sign up to create your own" CTA

---

### US-049: Large Repo Handling
**Priority:** 6
**Description:** As a user with a large repository, I want the app to handle thousands of commits without performance degradation.

**Acceptance Criteria:**
- [ ] API paginates commit fetches (100 per page) and streams data to the client
- [ ] Timeline virtualizes rendering for >200 commits (only renders visible nodes)
- [ ] Option to sample commits for very large ranges (e.g., "play every Nth commit")
- [ ] Progress indicator during large commit fetches ("Loading 1,204 commits...")
- [ ] MusicEngine handles large commit arrays without memory issues

---

### US-050: Unit Tests for Core Music Logic
**Priority:** 3
**Description:** As a developer, I want comprehensive unit tests for the musical mapping and scale functions so that the core audio logic is verified.

**Acceptance Criteria:**
- [ ] Tests for scale note generation (all three scales)
- [ ] Tests for commit → musical params mapping (all parameters)
- [ ] Tests for author hash → pan position, motif, color
- [ ] Tests for language detection from file extensions
- [ ] Tests for date range utility functions
- [ ] Tests verify determinism (same input → same output)
- [ ] Tests cover edge cases (zero values, maximum values, unknown inputs)
- [ ] Test runner configured (Jest or Vitest) and passing in CI-compatible manner
