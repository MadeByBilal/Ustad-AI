import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "src");

// Files that use raw hex because they write inline CSS for external libraries
// (e.g. Leaflet) that cannot consume Tailwind utilities or CSS variables.
const HEX_EXEMPT_FILES = new Set(["TrackingMap.tsx"]);

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!/\.(css|ts|tsx)$/.test(entry.name) || /\.test\.[^.]+$/.test(entry.name)) {
      return [];
    }
    return [path];
  });
}

describe("global theme contract", () => {
  it("defines the exact shared palette", () => {
    const css = readFileSync(join(SOURCE_ROOT, "app/globals.css"), "utf8");

    expect(css).toContain("--bg: 246 240 232;");
    expect(css).toContain("--surface: 255 255 255;");
    expect(css).toContain("--text: 32 29 27;");
    expect(css).toContain("--accent: 236 154 92;");
    expect(css).toContain("--muted: 118 109 101;");
    expect(css).toContain("--warning: 224 164 97;");
    expect(css).toContain("--success: 110 157 117;");
    expect(css).toContain("--success-fg: 32 64 49;");
    expect(css).toContain("--divider: 227 216 206;");
  });

  it("contains no legacy light or semantic color utilities in production UI code", () => {
    const legacyUtility =
      /(?:bg|text|border|ring|shadow|accent)-(?:white|black|gray|slate|stone|zinc|neutral|red|green|blue|yellow|amber|orange|lime|emerald|teal|sky|indigo|violet|purple|pink|rose|fuchsia|cyan)(?:-|\/|\b)/;
    const legacyLiteral = /#[0-9a-f]{6}/i;
    const forbiddenLiterals = [
      "#0a4632",
      "#0b4c37",
      "#0e5f44",
      "#eae4d6",
      "#22c55e",
      "#2563eb",
      "#ef4444",
    ];

    for (const file of collectSourceFiles(SOURCE_ROOT)) {
      const source = readFileSync(file, "utf8");
      const relativePath = file.slice(SOURCE_ROOT.length + 1);
      const fileName = file.split("/").pop() ?? "";
      const isHexExempt = HEX_EXEMPT_FILES.has(fileName);
      expect(source, relativePath).not.toMatch(legacyUtility);
      if (!isHexExempt) {
        expect(source, relativePath).not.toMatch(legacyLiteral);
      }
      for (const literal of forbiddenLiterals) {
        expect(source, relativePath).not.toContain(literal);
      }
    }
  });
});
