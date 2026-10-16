import { describe, expect, it } from "vitest";
import {
  canonicalizeSkill,
  categoryFromSkills,
  skillsRelated,
} from "./matching.js";

describe("canonicalizeSkill", () => {
  it("turns snake_case AI tags into spaced words", () => {
    expect(canonicalizeSkill("switch_repair")).toBe("switch repair");
  });

  it("resolves whole-string synonyms before per-word ones", () => {
    expect(canonicalizeSkill("gas refill")).toBe("gas refilling");
  });

  it("maps trade synonyms", () => {
    expect(canonicalizeSkill("Switchboard Installation")).toBe(
      "switch installation"
    );
    expect(canonicalizeSkill("nalka")).toBe("faucet");
  });
});

describe("skillsRelated", () => {
  it("relates AI tags to profile skill vocabulary", () => {
    expect(skillsRelated("switch_repair", "switchboard installation")).toBe(
      true
    );
    expect(skillsRelated("gas refill", "gas refilling")).toBe(true);
    expect(skillsRelated("tap repair", "faucet repair")).toBe(true);
    expect(skillsRelated("pipe_leak", "pipe fitting")).toBe(true);
  });

  it("keeps unrelated skills apart", () => {
    expect(skillsRelated("drain cleaning", "wiring")).toBe(false);
    expect(skillsRelated("door repair", "compressor service")).toBe(false);
    expect(skillsRelated("repair", "installation")).toBe(false);
  });
});

describe("categoryFromSkills", () => {
  it("infers the trade from AI skill tags", () => {
    expect(categoryFromSkills(["switch_repair"])).toBe("electrician");
    expect(categoryFromSkills(["wiring"])).toBe("electrician");
    expect(categoryFromSkills(["pipe_leak", "water tank cleaning"])).toBe(
      "plumber"
    );
    expect(categoryFromSkills(["gas_refilling"])).toBe("ac_technician");
    expect(categoryFromSkills(["door lock repair"])).toBe("carpenter");
  });

  it("returns null when nothing is recognizable", () => {
    expect(categoryFromSkills([])).toBeNull();
    expect(categoryFromSkills(["xyzzy"])).toBeNull();
  });
});
