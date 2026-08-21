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

    expect(css).toContain("--bg: 26 20 16;");
    expect(css).toContain("--surface: 36 28 21;");
    expect(css).toContain("--text: 245 237 224;");
    expect(css).toContain("--accent: 201 122 61;");
    expect(css).toContain("--muted: 139 111 71;");
    expect(css).toContain("--warning: 232 169 60;");
    expect(css).toContain("--success: 61 90 76;");
    expect(css).toContain("--success-fg: 192 221 151;");
    expect(css).toContain("--divider: 61 52 43;");
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
