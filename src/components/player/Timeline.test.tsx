// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { Timeline } from "./Timeline";
import type { Commit } from "@/types";

beforeEach(() => {
  // jsdom doesn't implement scrollTo
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

function makeCommit(overrides: Partial<Commit> = {}): Commit {
  return {
    id: "abc123",
    repoId: "test/repo",
    timestamp: "2025-03-10T14:30:00Z",
    author: "alice",
    message: "Add new feature",
    stats: { additions: 50, deletions: 10, filesChanged: 3 },
    primaryLanguage: "TypeScript",
    languages: { TypeScript: 50 },
    ciStatus: "pass",
    musicalParams: {
      instrument: "FMSynth",
      note: "E4",
      duration: 1.1,
      velocity: 0.5,
      octave: 4,
      scale: "major",
      pan: -0.3,
      effects: { reverb: 0.2, delay: 0 },
    },
    ...overrides,
  };
}

function makeCommits(count: number): Commit[] {
  return Array.from({ length: count }, (_, i) =>
    makeCommit({
      id: `commit-${i}`,
      author: `author-${i}`,
      message: `Commit message ${i}`,
      timestamp: `2025-03-10T${String(10 + i).padStart(2, "0")}:00:00Z`,
      primaryLanguage: ["TypeScript", "Python", "JavaScript", "Rust", "Go"][i % 5],
      stats: {
        additions: 10 + i * 20,
        deletions: 5 + i * 5,
        filesChanged: 1 + i,
      },
    })
  );
}

describe("Timeline", () => {
  it("renders nothing when commits is empty", () => {
    const { container } = render(
      <Timeline commits={[]} currentCommitId={null} onSeek={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders an SVG with nodes for each commit", () => {
    const commits = makeCommits(5);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    expect(svg).toBeTruthy();
    // Each node has a visible circle + hit area circle = 2 circles per node
    // Plus one connecting line
    const circles = svg.querySelectorAll("circle");
    expect(circles.length).toBe(10); // 5 nodes * 2 circles
  });

  it("renders connecting line between nodes", () => {
    const commits = makeCommits(3);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const lines = svg.querySelectorAll("line");
    expect(lines.length).toBe(1);
    expect(lines[0].getAttribute("stroke")).toBe("rgba(255,255,255,0.08)");
    expect(lines[0].getAttribute("stroke-width")).toBe("1");
  });

  it("sizes nodes proportional to diff (min 8px, max 28px)", () => {
    const smallCommit = makeCommit({
      id: "small",
      stats: { additions: 0, deletions: 0, filesChanged: 1 },
    });
    const largeCommit = makeCommit({
      id: "large",
      stats: { additions: 500, deletions: 500, filesChanged: 20 },
    });
    const { getByTestId } = render(
      <Timeline
        commits={[smallCommit, largeCommit]}
        currentCommitId={null}
        onSeek={vi.fn()}
      />
    );
    const svg = getByTestId("timeline-svg");
    // Get visible circles (not hit area circles which have r=18)
    const circles = Array.from(svg.querySelectorAll("circle")).filter(
      (c) => c.getAttribute("fill") !== "transparent"
    );
    // small: max(8, min(28, 8 + 0/20)) = 8, radius = 4
    expect(circles[0].getAttribute("r")).toBe("4");
    // large: max(8, min(28, 8 + 1000/20)) = 28, radius = 14
    expect(circles[1].getAttribute("r")).toBe("14");
  });

  it("colors nodes by language", () => {
    const tsCommit = makeCommit({ id: "ts", primaryLanguage: "TypeScript" });
    const pyCommit = makeCommit({ id: "py", primaryLanguage: "Python" });
    const { getByTestId } = render(
      <Timeline
        commits={[tsCommit, pyCommit]}
        currentCommitId={null}
        onSeek={vi.fn()}
      />
    );
    const svg = getByTestId("timeline-svg");
    const circles = Array.from(svg.querySelectorAll("circle")).filter(
      (c) => c.getAttribute("fill") !== "transparent"
    );
    expect(circles[0].getAttribute("fill")).toBe("#3178c6");
    expect(circles[1].getAttribute("fill")).toBe("#3572A5");
  });

  it("highlights current commit with white border", () => {
    const commits = makeCommits(3);
    const { getByTestId } = render(
      <Timeline
        commits={commits}
        currentCommitId="commit-1"
        onSeek={vi.fn()}
      />
    );
    const svg = getByTestId("timeline-svg");
    const circles = Array.from(svg.querySelectorAll("circle")).filter(
      (c) => c.getAttribute("fill") !== "transparent"
    );

    // commit-0: not active
    expect(circles[0].getAttribute("stroke")).toBe("transparent");
    expect(circles[0].getAttribute("opacity")).toBe("0.6");

    // commit-1: active
    expect(circles[1].getAttribute("stroke")).toBe("white");
    expect(circles[1].getAttribute("stroke-width")).toBe("2");
    expect(circles[1].getAttribute("opacity")).toBe("1");

    // commit-2: not active
    expect(circles[2].getAttribute("stroke")).toBe("transparent");
    expect(circles[2].getAttribute("opacity")).toBe("0.6");
  });

  it("calls onSeek with correct index when clicking a node", () => {
    const commits = makeCommits(3);
    const onSeek = vi.fn();
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={onSeek} />
    );
    const svg = getByTestId("timeline-svg");
    // Click on the second node group (g.node)
    const nodeGroups = svg.querySelectorAll("g.node");
    expect(nodeGroups.length).toBe(3);
    fireEvent.click(nodeGroups[1]);
    expect(onSeek).toHaveBeenCalledWith(1);
  });

  it("shows tooltip on hover with commit info", () => {
    const commits = makeCommits(3);
    const { getByTestId, queryByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );

    // No tooltip initially
    expect(queryByTestId("timeline-tooltip")).toBeNull();

    const svg = getByTestId("timeline-svg");
    const nodeGroups = svg.querySelectorAll("g.node");

    // Hover on first node
    fireEvent.mouseEnter(nodeGroups[0]);
    const tooltip = getByTestId("timeline-tooltip");
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain("author-0");
    expect(tooltip.textContent).toContain("Commit message 0");
  });

  it("hides tooltip on mouse leave", () => {
    const commits = makeCommits(3);
    const { getByTestId, queryByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const nodeGroups = svg.querySelectorAll("g.node");

    fireEvent.mouseEnter(nodeGroups[0]);
    expect(queryByTestId("timeline-tooltip")).toBeTruthy();

    fireEvent.mouseLeave(nodeGroups[0]);
    expect(queryByTestId("timeline-tooltip")).toBeNull();
  });

  it("shows diff stats in tooltip", () => {
    const commit = makeCommit({
      id: "c1",
      stats: { additions: 42, deletions: 7, filesChanged: 3 },
    });
    const { getByTestId } = render(
      <Timeline commits={[commit]} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const nodeGroups = svg.querySelectorAll("g.node");
    fireEvent.mouseEnter(nodeGroups[0]);

    const tooltip = getByTestId("timeline-tooltip");
    expect(tooltip.innerHTML).toContain("+42");
    expect(tooltip.innerHTML).toContain("7");
  });

  it("falls back to Other color for unknown languages", () => {
    const commit = makeCommit({ id: "c1", primaryLanguage: "Haskell" });
    const { getByTestId } = render(
      <Timeline commits={[commit]} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const circles = Array.from(svg.querySelectorAll("circle")).filter(
      (c) => c.getAttribute("fill") !== "transparent"
    );
    expect(circles[0].getAttribute("fill")).toBe("#00ffc8");
  });

  it("has horizontal scroll container", () => {
    const commits = makeCommits(20);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const container = getByTestId("timeline-scroll-container");
    expect(container.className).toContain("overflow-x-auto");
  });

  it("SVG width accommodates all commits", () => {
    const commits = makeCommits(10);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    // totalWidth = 24*2 + (10-1)*44 = 48 + 396 = 444
    expect(svg.getAttribute("width")).toBe("444");
  });

  it("auto-scrolls to current commit", () => {
    const commits = makeCommits(20);
    const { getByTestId } = render(
      <Timeline
        commits={commits}
        currentCommitId="commit-10"
        onSeek={vi.fn()}
      />
    );
    const container = getByTestId("timeline-scroll-container");
    // scrollTo should have been called (mocked globally in beforeEach)
    expect(container.scrollTo).toHaveBeenCalled();
  });

  it("renders single commit without connecting line", () => {
    const commits = makeCommits(1);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    // With only 1 visible commit, still draws a line because slicing gives length 1
    // which is not > 1, so no line
    const lines = svg.querySelectorAll("line");
    expect(lines.length).toBe(0);
  });
});

describe("Timeline virtualization", () => {
  it("renders all nodes when commits <= 200", () => {
    const commits = makeCommits(50);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const nodeGroups = svg.querySelectorAll("g.node");
    expect(nodeGroups.length).toBe(50);
  });

  it("virtualizes rendering when >200 commits (renders subset)", () => {
    const commits = makeCommits(250);
    const { getByTestId } = render(
      <Timeline commits={commits} currentCommitId={null} onSeek={vi.fn()} />
    );
    const svg = getByTestId("timeline-svg");
    const nodeGroups = svg.querySelectorAll("g.node");
    // With virtualization and jsdom (clientWidth=0, scrollLeft=0),
    // visible range starts at 0 and ends at ~VIRTUALIZATION_BUFFER
    // Should render fewer than 250 nodes
    expect(nodeGroups.length).toBeLessThan(250);
  });
});
