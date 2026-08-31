import { describe, expect, it } from "vitest";
import { getSafetyGuidance } from "@/server/lib/job/safety";

describe("getSafetyGuidance", () => {
  it("returns no guidance for a normal job", () => {
    expect(getSafetyGuidance("normal", [])).toEqual([]);
  });

  it("returns generic emergency guidance when no flags are known", () => {
    const g = getSafetyGuidance("emergency", []);
    expect(g.length).toBeGreaterThanOrEqual(1);
  });

  it("returns per-flag guidance for known flags", () => {
    const g = getSafetyGuidance("emergency", ["short circuit"]);
    const titles = g.map((x) => x.title);
    expect(titles).toContain("Short circuit");
  });

  it("returns guidance for gas leaks", () => {
    const g = getSafetyGuidance("emergency", ["gas leak"]);
    expect(g.some((x) => x.title.toLowerCase().includes("gas"))).toBe(true);
  });

  it("deduplicates guidance when flags repeat", () => {
    const g = getSafetyGuidance("emergency", ["short circuit", "short circuit"]);
    expect(g.length).toBe(
      getSafetyGuidance("emergency", ["short circuit"]).length
    );
  });
});
