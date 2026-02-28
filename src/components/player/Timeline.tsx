"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Commit } from "@/types";
import { LANGUAGE_COLORS } from "@/components/shared/LanguageIcon";
import { DiffStats } from "@/components/shared/DiffStats";

/** Compute node size from diff stats (min 8px, max 28px) */
function getNodeSize(commit: Commit): number {
  const total = commit.stats.additions + commit.stats.deletions;
  return Math.max(8, Math.min(28, 8 + total / 20));
}

interface TimelineProps {
  commits: Commit[];
  currentCommitId: string | null;
  onSeek: (index: number) => void;
}

/** Horizontal scroll padding on each side */
const PADDING = 24;
/** Spacing between node centers */
const NODE_SPACING = 44;
/** SVG height */
const SVG_HEIGHT = 64;
/** Center Y of nodes */
const CENTER_Y = SVG_HEIGHT / 2;
/** Virtualization buffer (extra nodes to render outside visible area) */
const VIRTUALIZATION_BUFFER = 20;

export function Timeline({ commits, currentCommitId, onSeek }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    commit: Commit;
    x: number;
    y: number;
  } | null>(null);

  // Track visible range for virtualization (>200 commits)
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 0]);
  const shouldVirtualize = commits.length > 200;

  const totalWidth = PADDING * 2 + (commits.length - 1) * NODE_SPACING;

  // Compute visible range from scroll position
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current || !shouldVirtualize) return;
    const el = containerRef.current;
    const scrollLeft = el.scrollLeft;
    const viewWidth = el.clientWidth;

    const startIdx = Math.max(
      0,
      Math.floor((scrollLeft - PADDING) / NODE_SPACING) - VIRTUALIZATION_BUFFER
    );
    const endIdx = Math.min(
      commits.length - 1,
      Math.ceil((scrollLeft + viewWidth - PADDING) / NODE_SPACING) +
        VIRTUALIZATION_BUFFER
    );
    setVisibleRange([startIdx, endIdx]);
  }, [commits.length, shouldVirtualize]);

  // Set up scroll listener for virtualization
  useEffect(() => {
    if (!shouldVirtualize || !containerRef.current) return;
    const el = containerRef.current;
    updateVisibleRange();
    el.addEventListener("scroll", updateVisibleRange, { passive: true });
    return () => el.removeEventListener("scroll", updateVisibleRange);
  }, [shouldVirtualize, updateVisibleRange]);

  // Non-virtualized: render all
  const renderRange: [number, number] = useMemo(
    () => (shouldVirtualize ? visibleRange : [0, commits.length - 1]),
    [shouldVirtualize, visibleRange, commits.length]
  );

  // Auto-scroll to keep current commit centered
  useEffect(() => {
    if (!containerRef.current || currentCommitId === null) return;
    const idx = commits.findIndex((c) => c.id === currentCommitId);
    if (idx === -1) return;

    const el = containerRef.current;
    const nodeX = PADDING + idx * NODE_SPACING;
    const viewCenter = el.clientWidth / 2;
    const targetScroll = nodeX - viewCenter;

    el.scrollTo?.({ left: targetScroll, behavior: "smooth" });
  }, [currentCommitId, commits]);

  // Render with D3
  useEffect(() => {
    if (!svgRef.current || commits.length === 0) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    const [startIdx, endIdx] = renderRange;
    const visibleCommits = commits.slice(startIdx, endIdx + 1);

    // Draw connecting lines between visible nodes
    if (visibleCommits.length > 1) {
      const lineStartX = PADDING + startIdx * NODE_SPACING;
      const lineEndX = PADDING + endIdx * NODE_SPACING;

      svg
        .append("line")
        .attr("x1", lineStartX)
        .attr("y1", CENTER_Y)
        .attr("x2", lineEndX)
        .attr("y2", CENTER_Y)
        .attr("stroke", "rgba(255,255,255,0.08)")
        .attr("stroke-width", 1);
    }

    // Draw nodes
    const nodes = svg
      .selectAll<SVGGElement, Commit>("g.node")
      .data(visibleCommits, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .attr(
        "transform",
        (_, i) =>
          `translate(${PADDING + (startIdx + i) * NODE_SPACING}, ${CENTER_Y})`
      );

    // Node circles
    nodes
      .append("circle")
      .attr("r", (d) => getNodeSize(d) / 2)
      .attr("fill", (d) => LANGUAGE_COLORS[d.primaryLanguage] ?? LANGUAGE_COLORS.Other)
      .attr("opacity", (d) => (d.id === currentCommitId ? 1 : 0.6))
      .attr("stroke", (d) => (d.id === currentCommitId ? "white" : "transparent"))
      .attr("stroke-width", 2)
      .attr("cursor", "pointer");

    // Invisible hit area for easier clicking
    nodes
      .append("circle")
      .attr("r", 18)
      .attr("fill", "transparent")
      .attr("cursor", "pointer");

    // Event handlers
    nodes.on("click", (_, d) => {
      const idx = commits.indexOf(d);
      if (idx !== -1) onSeek(idx);
    });

    nodes.on("mouseenter", function (event, d) {
      const g = d3.select(this);
      const x = parseFloat(g.attr("transform").split("(")[1]);
      setTooltip({ commit: d, x, y: 0 });
    });

    nodes.on("mouseleave", () => {
      setTooltip(null);
    });
  }, [commits, currentCommitId, renderRange, onSeek]);

  if (commits.length === 0) return null;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] relative">
      <div
        ref={containerRef}
        className="overflow-x-auto py-2"
        data-testid="timeline-scroll-container"
      >
        <svg
          ref={svgRef}
          width={Math.max(totalWidth, 100)}
          height={SVG_HEIGHT}
          className="block"
          data-testid="timeline-svg"
        />
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono shadow-lg"
          style={{
            left: tooltip.x,
            top: 0,
            transform: "translate(-50%, -100%) translateY(-8px)",
            maxWidth: 280,
          }}
          data-testid="timeline-tooltip"
        >
          <p className="text-white/90 font-semibold truncate">
            {tooltip.commit.author}
          </p>
          <p className="text-white/60 truncate">{tooltip.commit.message}</p>
          <p className="text-white/40 mt-1">
            {new Date(tooltip.commit.timestamp).toLocaleString()} &middot;{" "}
            <DiffStats
              additions={tooltip.commit.stats.additions}
              deletions={tooltip.commit.stats.deletions}
            />
          </p>
        </div>
      )}
    </div>
  );
}
