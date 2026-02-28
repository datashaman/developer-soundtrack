"use client";

import { useCallback, useRef, useState } from "react";
import * as Tone from "tone";
import type { AuthorMotif } from "@/types";
import { generateAuthorMotif } from "@/lib/music/motifs";

const POSSIBLE_DURATIONS = [0.5, 1, 1.5];
const DURATION_LABELS: Record<number, string> = {
  0.5: "Short",
  1: "Normal",
  1.5: "Long",
};

interface MotifEditorProps {
  authorMotifs: AuthorMotif[];
  knownAuthors: string[];
  onChange: (motifs: AuthorMotif[]) => void;
}

export function MotifEditor({
  authorMotifs,
  knownAuthors,
  onChange,
}: MotifEditorProps) {
  const [previewingAuthor, setPreviewingAuthor] = useState<string | null>(null);
  const previewSynthRef = useRef<Tone.Synth | null>(null);

  const getMotifForAuthor = useCallback(
    (login: string): AuthorMotif => {
      const custom = authorMotifs.find((m) => m.login === login);
      if (custom) return custom;
      return generateAuthorMotif(login);
    },
    [authorMotifs],
  );

  const isCustomized = useCallback(
    (login: string): boolean => {
      return authorMotifs.some((m) => m.login === login);
    },
    [authorMotifs],
  );

  const handleColorChange = useCallback(
    (login: string, color: string) => {
      const current = getMotifForAuthor(login);
      const updated: AuthorMotif = { ...current, color };
      const next = authorMotifs.filter((m) => m.login !== login);
      next.push(updated);
      onChange(next);
    },
    [authorMotifs, getMotifForAuthor, onChange],
  );

  const handleRhythmBeatChange = useCallback(
    (login: string, beatIndex: number, duration: number) => {
      const current = getMotifForAuthor(login);
      const newPattern = [...current.rhythmPattern];
      newPattern[beatIndex] = duration;
      const updated: AuthorMotif = { ...current, rhythmPattern: newPattern };
      const next = authorMotifs.filter((m) => m.login !== login);
      next.push(updated);
      onChange(next);
    },
    [authorMotifs, getMotifForAuthor, onChange],
  );

  const handleAddBeat = useCallback(
    (login: string) => {
      const current = getMotifForAuthor(login);
      if (current.rhythmPattern.length >= 8) return;
      const updated: AuthorMotif = {
        ...current,
        rhythmPattern: [...current.rhythmPattern, 1],
      };
      const next = authorMotifs.filter((m) => m.login !== login);
      next.push(updated);
      onChange(next);
    },
    [authorMotifs, getMotifForAuthor, onChange],
  );

  const handleRemoveBeat = useCallback(
    (login: string, beatIndex: number) => {
      const current = getMotifForAuthor(login);
      if (current.rhythmPattern.length <= 2) return;
      const newPattern = current.rhythmPattern.filter(
        (_, i) => i !== beatIndex,
      );
      const updated: AuthorMotif = { ...current, rhythmPattern: newPattern };
      const next = authorMotifs.filter((m) => m.login !== login);
      next.push(updated);
      onChange(next);
    },
    [authorMotifs, getMotifForAuthor, onChange],
  );

  const handleResetAuthor = useCallback(
    (login: string) => {
      const next = authorMotifs.filter((m) => m.login !== login);
      onChange(next);
    },
    [authorMotifs, onChange],
  );

  const handleResetAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handlePreview = useCallback(
    async (login: string) => {
      try {
        await Tone.start();

        if (previewSynthRef.current) {
          previewSynthRef.current.dispose();
          previewSynthRef.current = null;
        }

        const motif = getMotifForAuthor(login);
        const synth = new Tone.Synth().toDestination();
        const panner = new Tone.Panner(motif.panPosition).toDestination();
        synth.disconnect();
        synth.connect(panner);
        previewSynthRef.current = synth;
        setPreviewingAuthor(login);

        const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
        let timeOffset = 0;
        const now = Tone.now();

        for (let i = 0; i < motif.rhythmPattern.length; i++) {
          const dur = motif.rhythmPattern[i];
          const noteIndex = i % notes.length;
          const noteDuration = dur * 0.3;
          synth.triggerAttackRelease(
            notes[noteIndex],
            noteDuration,
            now + timeOffset,
            0.7,
          );
          timeOffset += dur * 0.35;
        }

        const totalDuration = timeOffset + 0.5;
        setTimeout(() => {
          if (previewSynthRef.current === synth) {
            synth.dispose();
            panner.dispose();
            previewSynthRef.current = null;
            setPreviewingAuthor(null);
          }
        }, totalDuration * 1000);
      } catch {
        setPreviewingAuthor(null);
      }
    },
    [getMotifForAuthor],
  );

  const hasCustomMotifs = authorMotifs.length > 0;

  if (knownAuthors.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-mono text-text-primary">
            Author Motifs
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            Customize how each contributor sounds
          </p>
        </div>
        <p className="text-sm font-mono text-text-faint">
          No authors found. Play a repository to discover contributors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-mono text-text-primary">
            Author Motifs
          </h3>
          <p className="text-xs text-text-faint mt-0.5">
            Customize how each contributor sounds
          </p>
        </div>
        <button
          onClick={handleResetAll}
          disabled={!hasCustomMotifs}
          className="text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Reset all to defaults"
        >
          Reset all to defaults
        </button>
      </div>

      <div className="space-y-3">
        {knownAuthors.map((login) => {
          const motif = getMotifForAuthor(login);
          const customized = isCustomized(login);
          const isPreviewing = previewingAuthor === login;

          return (
            <div
              key={login}
              className="rounded-lg border border-border-strong bg-surface p-4 space-y-3"
              data-testid={`motif-row-${login}`}
            >
              {/* Author header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: motif.color }}
                    aria-label={`${login} avatar`}
                  >
                    {login[0].toUpperCase()}
                  </span>
                  <span
                    className={`text-sm font-mono ${customized ? "text-accent" : "text-text-primary"}`}
                  >
                    {login}
                  </span>
                  {customized && (
                    <span className="text-[10px] font-mono text-accent/60 uppercase tracking-wider">
                      customized
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(login)}
                    disabled={isPreviewing}
                    aria-label={`Preview ${login}`}
                    className="inline-flex items-center gap-1 text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreviewing ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="currentColor"
                        className="text-accent animate-pulse"
                      >
                        <circle cx="4" cy="7" r="2" />
                        <circle cx="10" cy="7" r="2" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="currentColor"
                      >
                        <path d="M3 2l9 5-9 5V2z" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">
                      {isPreviewing ? "Playing" : "Preview"}
                    </span>
                  </button>
                  <button
                    onClick={() => handleResetAuthor(login)}
                    disabled={!customized}
                    aria-label={`Reset ${login} to default`}
                    className="text-xs font-mono text-text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Color picker row */}
              <div className="flex items-center gap-3">
                <label
                  htmlFor={`color-${login}`}
                  className="text-xs font-mono text-text-faint w-12 shrink-0"
                >
                  Color
                </label>
                <input
                  id={`color-${login}`}
                  type="color"
                  value={motif.color}
                  onChange={(e) => handleColorChange(login, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border-strong bg-transparent p-0"
                  aria-label={`Color for ${login}`}
                />
                <span className="text-xs font-mono text-text-faint">
                  {motif.color}
                </span>
              </div>

              {/* Rhythm pattern editor */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-faint w-12 shrink-0">
                    Rhythm
                  </span>
                  <span className="text-xs font-mono text-text-faint">
                    Pan: {motif.panPosition.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {motif.rhythmPattern.map((dur, beatIdx) => (
                    <div
                      key={beatIdx}
                      className="relative group"
                      data-testid={`beat-${login}-${beatIdx}`}
                    >
                      <button
                        onClick={() => {
                          const currentIdx = POSSIBLE_DURATIONS.indexOf(dur);
                          const nextIdx =
                            (currentIdx + 1) % POSSIBLE_DURATIONS.length;
                          handleRhythmBeatChange(
                            login,
                            beatIdx,
                            POSSIBLE_DURATIONS[nextIdx],
                          );
                        }}
                        className={`w-10 h-10 rounded-md border text-xs font-mono transition-colors ${
                          dur === 0.5
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                            : dur === 1.5
                              ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
                              : "border-border-strong bg-surface text-text-primary"
                        }`}
                        title={`${DURATION_LABELS[dur]} — click to cycle`}
                        aria-label={`Beat ${beatIdx + 1}: ${DURATION_LABELS[dur]}`}
                      >
                        {dur}
                      </button>
                      {motif.rhythmPattern.length > 2 && (
                        <button
                          onClick={() => handleRemoveBeat(login, beatIdx)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove beat ${beatIdx + 1}`}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  {motif.rhythmPattern.length < 8 && (
                    <button
                      onClick={() => handleAddBeat(login)}
                      className="w-10 h-10 rounded-md border border-dashed border-border-strong text-text-faint hover:text-accent hover:border-accent/50 transition-colors text-lg"
                      aria-label={`Add beat for ${login}`}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
