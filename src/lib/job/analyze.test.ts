import { describe, expect, it } from "vitest";
import {
  CATEGORY_ESTIMATES,
  analyzeJobInput,
  deriveAnalysisForCategory,
} from "@/lib/job/analyze";

describe("analyzeJobInput", () => {
  it("detects an electrician from Urdu keywords", () => {
    const r = analyzeJobInput("Ghar ki wiring mein problem hai, fuse ud jata hai");
    expect(r.category).toBe("electrician");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
    expect(r.clarification_required).toBe(false);
    expect(r.required_skills).toContain("wiring");
  });

  it("detects a plumber from leak/tap keywords", () => {
    const r = analyzeJobInput("Bathroom ka tap leak ho raha hai");
    expect(r.category).toBe("plumber");
    expect(r.required_skills).toContain("faucet repair");
    expect(r.estimate_min).toBe(CATEGORY_ESTIMATES.plumber.min);
    expect(r.estimate_max).toBe(CATEGORY_ESTIMATES.plumber.max);
  });

  it("detects an ac technician", () => {
    const r = analyzeJobInput("AC ki tandi nahi aa rahi, compressor check karwana hai");
    expect(r.category).toBe("ac_technician");
    expect(r.required_skills.length).toBeGreaterThan(0);
  });

  it("detects a carpenter from Urdu keywords", () => {
    const r = analyzeJobInput("Darwaza tut gaya hai, wood ka kaam karwana hai");
    expect(r.category).toBe("carpenter");
    expect(r.required_skills).toContain("door repair");
  });

  it("marks an emergency when danger keywords are present", () => {
    const r = analyzeJobInput("Short circuit ho gaya, bijli ja rahi hai poori ghar mein");
    expect(r.urgency).toBe("emergency");
    expect(r.safety_flags.length).toBeGreaterThan(0);
  });

  it("marks potentially_urgent for recurring fuse problems", () => {
    const r = analyzeJobInput("Baar baar fuse ud jata hai");
    expect(r.urgency).toBe("potentially_urgent");
  });

  it("respects an explicit emergency hint", () => {
    const r = analyzeJobInput("Bijli ka masla hai", { urgencyHint: "emergency" });
    expect(r.urgency).toBe("emergency");
  });

  it("keeps the original text as the description", () => {
    const text = "  Water tank ki motor nahi chalti  ";
    const r = analyzeJobInput(text);
    expect(r.description).toBe(text.trim());
  });

  it("returns low confidence + clarification when nothing matches", () => {
    const r = analyzeJobInput("Kuch bhi random baat");
    expect(r.category).toBeNull();
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.clarification_required).toBe(true);
    expect(r.estimate_min).toBe(0);
    expect(r.estimate_max).toBe(0);
  });

  it("uses a category hint when no keyword match exists", () => {
    const r = analyzeJobInput("Kuch kaam karna hai", { categoryHint: "carpenter" });
    expect(r.category).toBe("carpenter");
    expect(r.estimate_min).toBe(CATEGORY_ESTIMATES.carpenter.min);
  });

  it("rounds estimates to 0 when input is empty", () => {
    const r = analyzeJobInput("");
    expect(r.category).toBeNull();
    expect(r.clarification_required).toBe(true);
  });
});

describe("deriveAnalysisForCategory", () => {
  it("returns canonical skills and estimates for a category", () => {
    const r = deriveAnalysisForCategory("plumber", "faucet_repair", "normal");
    expect(r.category).toBe("plumber");
    expect(r.required_skills.length).toBeGreaterThan(0);
    expect(r.estimate_min).toBe(CATEGORY_ESTIMATES.plumber.min);
  });

  it("honours emergency urgency", () => {
    const r = deriveAnalysisForCategory("electrician", "short_circuit", "emergency");
    expect(r.urgency).toBe("emergency");
    expect(r.safety_flags.length).toBeGreaterThan(0);
  });
});
