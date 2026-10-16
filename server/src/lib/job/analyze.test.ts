import { describe, expect, it } from "vitest";
import { analyzeJobInput } from "./analyze.js";

describe("analyzeJobInput category routing", () => {
  it("classifies electrical complaints as electrician", () => {
    expect(
      analyzeJobInput("light nahi jal rahi, switch se chingari nikli").category
    ).toBe("electrician");
    expect(
      analyzeJobInput("ghar ki bijli chali gayi hai, meter check karna hai")
        .category
    ).toBe("electrician");
    expect(
      analyzeJobInput("pankha tez awaz kar raha hai").category
    ).toBe("electrician");
  });

  it("classifies water complaints as plumber", () => {
    expect(
      analyzeJobInput("nalka tapak raha hai, pani leak ho raha hai").category
    ).toBe("plumber");
    expect(
      analyzeJobInput("commode ka flush kaam nahi kar raha").category
    ).toBe("plumber");
    expect(analyzeJobInput("motor pani nahi kheench raha").category).toBe(
      "plumber"
    );
  });

  it("classifies cooling complaints as ac_technician", () => {
    expect(
      analyzeJobInput("AC cooling nahi kar raha, gas refill chahiye").category
    ).toBe("ac_technician");
    expect(
      analyzeJobInput("split ac ki gas refill karni hai").category
    ).toBe("ac_technician");
  });

  it("classifies woodwork complaints as carpenter", () => {
    expect(analyzeJobInput("darwaza band nahi hota").category).toBe(
      "carpenter"
    );
    expect(analyzeJobInput("almari ka hinge toot gaya hai").category).toBe(
      "carpenter"
    );
  });

  it("understands Urdu script", () => {
    expect(analyzeJobInput("میرے گھر کا دروازہ ٹوٹ گیا ہے").category).toBe(
      "carpenter"
    );
    expect(analyzeJobInput("نل سے پانی بہہ رہا ہے").category).toBe("plumber");
  });

  it("understands inflected Urdu script forms", () => {
    expect(analyzeJobInput("پنکھے کا کیپیسٹر خراب ہے").category).toBe(
      "electrician"
    );
    expect(analyzeJobInput("نلکے سے پانی ٹپک رہا ہے").category).toBe("plumber");
    expect(analyzeJobInput("دروازے کا تالا خراب ہے").category).toBe("carpenter");
  });

  it("does not match keywords inside unrelated words", () => {
    // "final" must not trigger "nal", "acha" must not trigger "ac".
    expect(analyzeJobInput("final payment ka masla hai").category).toBeNull();
    expect(analyzeJobInput("kaam acha nahi hua").category).toBeNull();
  });
});
