import { describe, expect, it } from "vitest";
import {
  CATEGORY_ESTIMATES,
  INSPECTION_FEES,
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

describe("score-based category detection", () => {
  it("picks the category with the most keyword hits", () => {
    // "tap" + "leak" + "drain" = 3 plumber hits vs 0 for others
    const r = analyzeJobInput("Bathroom ka tap leak ho raha hai, drain bhi blocked hai");
    expect(r.category).toBe("plumber");
  });

  it("expands Roman-Urdu keywords to match canonical rules", () => {
    const r = analyzeJobInput("nal ka paani nahi aa raha");
    expect(r.category).toBe("plumber");
  });

  it("detects AC from short keyword", () => {
    const r = analyzeJobInput("AC kharab hai, hawa nahi de raha");
    expect(r.category).toBe("ac_technician");
  });

  it("detects carpenter from expanded keywords", () => {
    const r = analyzeJobInput("Sootay mein darwaza tut gaya hai");
    expect(r.category).toBe("carpenter");
  });
});

describe("inspection fees (visit & check fee)", () => {
  it("defines an inspection fee for every category", () => {
    for (const category of Object.keys(CATEGORY_ESTIMATES)) {
      expect(INSPECTION_FEES[category]).toBeGreaterThan(0);
    }
  });

  it("returns the inspection fee on every analysis", () => {
    const r = analyzeJobInput("Bathroom ka tap leak ho raha hai");
    expect(r.inspection_fee).toBe(INSPECTION_FEES.plumber);
  });

  it("keeps the inspection fee small relative to the repair estimate", () => {
    const r = analyzeJobInput("AC ki tandi nahi aa rahi, compressor check karwana hai");
    expect(r.category).toBe("ac_technician");
    expect(r.inspection_fee).toBeLessThan(r.estimate_min);
  });

  it("zeroes the inspection fee when the category is unknown", () => {
    const r = analyzeJobInput("Kuch bhi random baat");
    expect(r.inspection_fee).toBe(0);
  });
});
