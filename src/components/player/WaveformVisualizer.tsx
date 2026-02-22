"use client";

import { useRef, useEffect, useCallback } from "react";

/** Color map for programming languages — used for waveform stroke color */
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Markdown: "#083fa1",
  Other: "#00ffc8",
};

const DEFAULT_STROKE_COLOR = "#00ffc8";

interface WaveformVisualizerProps {
  /** Function returning current waveform data from MusicEngine */
  getWaveformData: () => Float32Array;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** The primary language of the currently playing commit (for stroke color) */
  currentLanguage?: string;
}

export function WaveformVisualizer({
  getWaveformData,
  isPlaying,
  currentLanguage,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const currentColorRef = useRef(DEFAULT_STROKE_COLOR);
  const targetColorRef = useRef(DEFAULT_STROKE_COLOR);
  const idlePhaseRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});

  // Update target color when language changes
  useEffect(() => {
    targetColorRef.current =
      (currentLanguage && LANGUAGE_COLORS[currentLanguage]) ||
      DEFAULT_STROKE_COLOR;
  }, [currentLanguage]);

  const lerp = useCallback((a: number, b: number, t: number) => {
    return a + (b - a) * t;
  }, []);

  const lerpColor = useCallback(
    (colorA: string, colorB: string, t: number): string => {
      const parseHex = (hex: string) => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
      });
      const a = parseHex(colorA);
      const b = parseHex(colorB);
      const r = Math.round(lerp(a.r, b.r, t));
      const g = Math.round(lerp(a.g, b.g, t));
      const bl = Math.round(lerp(a.b, b.b, t));
      return `rgb(${r},${g},${bl})`;
    },
    [lerp]
  );

  // Keep draw function in a ref to allow self-referencing in rAF loop
  useEffect(() => {
    drawRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Handle high-DPI displays
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Smoothly transition stroke color
      currentColorRef.current = lerpColor(
        currentColorRef.current,
        targetColorRef.current,
        0.05
      );
      const strokeColor = currentColorRef.current;

      if (isPlaying) {
        // Draw real-time waveform from MusicEngine
        const waveform = getWaveformData();

        if (waveform.length > 0) {
          const sliceWidth = width / waveform.length;

          // Main waveform
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;

          for (let i = 0; i < waveform.length; i++) {
            const x = i * sliceWidth;
            const y = centerY + waveform[i] * centerY * 0.8;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();

          // Mirror/reflection effect below centerline
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.globalAlpha = 0.2;
          ctx.lineWidth = 1;

          for (let i = 0; i < waveform.length; i++) {
            const x = i * sliceWidth;
            // Reflect: invert the displacement from center
            const y = centerY - waveform[i] * centerY * 0.5;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      } else {
        // Idle "heartbeat" sine wave animation
        idlePhaseRef.current += 0.02;
        const phase = idlePhaseRef.current;
        const amplitude = 8;

        // Main sine wave
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          const normalizedX = (x / width) * Math.PI * 4;
          const y = centerY + Math.sin(normalizedX + phase) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Mirror reflection
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x++) {
          const normalizedX = (x / width) * Math.PI * 4;
          const y = centerY - Math.sin(normalizedX + phase) * amplitude * 0.6;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      animationRef.current = requestAnimationFrame(drawRef.current);
    };
  }, [isPlaying, getWaveformData, lerpColor]);

  // Start/stop animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(drawRef.current);
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, getWaveformData, lerpColor]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[140px] w-full"
      style={{ display: "block" }}
    />
  );
}
