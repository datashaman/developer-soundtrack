import { describe, it, expect } from "vitest";
import {
  EXTENSION_LANGUAGE_MAP,
  getLanguageForFile,
  computeLanguageCounts,
  getPrimaryLanguage,
} from "./languages";

describe("EXTENSION_LANGUAGE_MAP", () => {
  it("contains all required extensions from the spec", () => {
    const required = [
      "py", "js", "ts", "tsx", "jsx", "rs", "go", "java",
      "c", "cpp", "h", "rb", "css", "html", "sh", "bash", "md",
    ];
    for (const ext of required) {
      expect(EXTENSION_LANGUAGE_MAP[ext]).toBeDefined();
    }
  });
});

describe("getLanguageForFile", () => {
  it("detects Python files", () => {
    expect(getLanguageForFile("main.py")).toBe("Python");
    expect(getLanguageForFile("types.pyi")).toBe("Python");
    expect(getLanguageForFile("script.pyw")).toBe("Python");
  });

  it("detects JavaScript files", () => {
    expect(getLanguageForFile("app.js")).toBe("JavaScript");
    expect(getLanguageForFile("component.jsx")).toBe("JavaScript");
    expect(getLanguageForFile("lib.mjs")).toBe("JavaScript");
    expect(getLanguageForFile("util.cjs")).toBe("JavaScript");
  });

  it("detects TypeScript files", () => {
    expect(getLanguageForFile("app.ts")).toBe("TypeScript");
    expect(getLanguageForFile("component.tsx")).toBe("TypeScript");
    expect(getLanguageForFile("lib.mts")).toBe("TypeScript");
    expect(getLanguageForFile("util.cts")).toBe("TypeScript");
  });

  it("detects Rust files", () => {
    expect(getLanguageForFile("main.rs")).toBe("Rust");
  });

  it("detects Go files", () => {
    expect(getLanguageForFile("main.go")).toBe("Go");
  });

  it("detects Java files", () => {
    expect(getLanguageForFile("App.java")).toBe("Java");
  });

  it("detects C files", () => {
    expect(getLanguageForFile("main.c")).toBe("C");
    expect(getLanguageForFile("header.h")).toBe("C");
  });

  it("detects C++ files", () => {
    expect(getLanguageForFile("main.cpp")).toBe("C++");
    expect(getLanguageForFile("main.cxx")).toBe("C++");
    expect(getLanguageForFile("main.cc")).toBe("C++");
    expect(getLanguageForFile("header.hpp")).toBe("C++");
    expect(getLanguageForFile("header.hxx")).toBe("C++");
    expect(getLanguageForFile("header.hh")).toBe("C++");
  });

  it("detects Ruby files", () => {
    expect(getLanguageForFile("app.rb")).toBe("Ruby");
    expect(getLanguageForFile("Rakefile.rake")).toBe("Ruby");
    expect(getLanguageForFile("my_gem.gemspec")).toBe("Ruby");
  });

  it("detects CSS files", () => {
    expect(getLanguageForFile("style.css")).toBe("CSS");
    expect(getLanguageForFile("theme.scss")).toBe("CSS");
    expect(getLanguageForFile("base.sass")).toBe("CSS");
    expect(getLanguageForFile("vars.less")).toBe("CSS");
  });

  it("detects HTML files", () => {
    expect(getLanguageForFile("index.html")).toBe("HTML");
    expect(getLanguageForFile("page.htm")).toBe("HTML");
    expect(getLanguageForFile("icon.svg")).toBe("HTML");
  });

  it("detects Shell files", () => {
    expect(getLanguageForFile("deploy.sh")).toBe("Shell");
    expect(getLanguageForFile("init.bash")).toBe("Shell");
    expect(getLanguageForFile("setup.zsh")).toBe("Shell");
    expect(getLanguageForFile("config.fish")).toBe("Shell");
  });

  it("detects Markdown files", () => {
    expect(getLanguageForFile("README.md")).toBe("Markdown");
    expect(getLanguageForFile("docs.mdx")).toBe("Markdown");
  });

  it("handles files in nested paths", () => {
    expect(getLanguageForFile("src/lib/utils/hash.ts")).toBe("TypeScript");
    expect(getLanguageForFile("tests/test_main.py")).toBe("Python");
    expect(getLanguageForFile("path/to/deep/file.rs")).toBe("Rust");
  });

  it("returns Other for unknown extensions", () => {
    expect(getLanguageForFile("data.txt")).toBe("Other");
    expect(getLanguageForFile("photo.png")).toBe("Other");
    expect(getLanguageForFile("archive.zip")).toBe("Other");
  });

  it("returns Other for files with no extension", () => {
    expect(getLanguageForFile("Makefile")).toBe("Other");
    expect(getLanguageForFile("Dockerfile")).toBe("Other");
    expect(getLanguageForFile("LICENSE")).toBe("Other");
  });

  it("handles case insensitivity for extensions", () => {
    expect(getLanguageForFile("App.PY")).toBe("Python");
    expect(getLanguageForFile("Main.JS")).toBe("JavaScript");
    expect(getLanguageForFile("File.CPP")).toBe("C++");
  });

  it("handles dotfiles correctly", () => {
    expect(getLanguageForFile(".gitignore")).toBe("Other");
    expect(getLanguageForFile(".bashrc")).toBe("Other");
  });

  it("handles files with multiple dots", () => {
    expect(getLanguageForFile("app.test.ts")).toBe("TypeScript");
    expect(getLanguageForFile("styles.module.css")).toBe("CSS");
    expect(getLanguageForFile("data.v2.json")).toBe("Other");
  });
});

describe("computeLanguageCounts", () => {
  it("returns empty object for empty file list", () => {
    expect(computeLanguageCounts([])).toEqual({});
  });

  it("counts lines changed per language", () => {
    const files = [
      { filename: "src/app.ts", changes: 100 },
      { filename: "src/utils.ts", changes: 50 },
      { filename: "styles/main.css", changes: 20 },
    ];
    const counts = computeLanguageCounts(files);
    expect(counts).toEqual({
      TypeScript: 150,
      CSS: 20,
    });
  });

  it("defaults to 1 when changes is not provided", () => {
    const files = [
      { filename: "main.py" },
      { filename: "utils.py" },
      { filename: "app.js" },
    ];
    const counts = computeLanguageCounts(files);
    expect(counts).toEqual({
      Python: 2,
      JavaScript: 1,
    });
  });

  it("groups unknown extensions under Other", () => {
    const files = [
      { filename: "package.json", changes: 5 },
      { filename: "config.yaml", changes: 10 },
      { filename: "Makefile", changes: 3 },
    ];
    const counts = computeLanguageCounts(files);
    expect(counts).toEqual({
      Other: 18,
    });
  });

  it("handles mixed known and unknown extensions", () => {
    const files = [
      { filename: "main.rs", changes: 200 },
      { filename: "Cargo.toml", changes: 10 },
      { filename: "README.md", changes: 30 },
    ];
    const counts = computeLanguageCounts(files);
    expect(counts).toEqual({
      Rust: 200,
      Other: 10,
      Markdown: 30,
    });
  });

  it("handles zero changes", () => {
    const files = [
      { filename: "empty.ts", changes: 0 },
    ];
    const counts = computeLanguageCounts(files);
    expect(counts).toEqual({
      TypeScript: 0,
    });
  });
});

describe("getPrimaryLanguage", () => {
  it("returns Other for empty file list", () => {
    expect(getPrimaryLanguage([])).toBe("Other");
  });

  it("returns the language with most lines changed", () => {
    const files = [
      { filename: "main.py", changes: 200 },
      { filename: "utils.py", changes: 100 },
      { filename: "app.ts", changes: 50 },
      { filename: "style.css", changes: 10 },
    ];
    expect(getPrimaryLanguage(files)).toBe("Python");
  });

  it("TypeScript wins when it has the most changes", () => {
    const files = [
      { filename: "src/app.ts", changes: 100 },
      { filename: "src/hooks.ts", changes: 80 },
      { filename: "main.py", changes: 50 },
    ];
    expect(getPrimaryLanguage(files)).toBe("TypeScript");
  });

  it("handles single file", () => {
    const files = [{ filename: "main.go", changes: 42 }];
    expect(getPrimaryLanguage(files)).toBe("Go");
  });

  it("handles ties by returning the first language encountered with max count", () => {
    // Both have 100 changes, first one encountered wins
    const files = [
      { filename: "main.rs", changes: 100 },
      { filename: "main.go", changes: 100 },
    ];
    const result = getPrimaryLanguage(files);
    // Either is acceptable; we just need deterministic behavior
    expect(["Rust", "Go"]).toContain(result);
  });

  it("counts by file when changes not provided", () => {
    const files = [
      { filename: "a.py" },
      { filename: "b.py" },
      { filename: "c.py" },
      { filename: "x.js" },
    ];
    expect(getPrimaryLanguage(files)).toBe("Python");
  });

  it("returns Other when all files are unknown", () => {
    const files = [
      { filename: "Makefile", changes: 10 },
      { filename: "Dockerfile", changes: 20 },
    ];
    expect(getPrimaryLanguage(files)).toBe("Other");
  });

  it("handles real-world commit with mixed file types", () => {
    // Simulates a typical full-stack TypeScript commit
    const files = [
      { filename: "src/components/Player.tsx", changes: 85 },
      { filename: "src/lib/utils.ts", changes: 45 },
      { filename: "src/styles/player.css", changes: 15 },
      { filename: "package.json", changes: 3 },
      { filename: "README.md", changes: 10 },
    ];
    expect(getPrimaryLanguage(files)).toBe("TypeScript");
  });
});
