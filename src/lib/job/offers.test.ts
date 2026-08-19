import { describe, expect, it } from "vitest";
import {
  midpointOffer,
  offerIsExpired,
  roundTo50,
  validateCustomerOffer,
  validateWorkerCounter,
} from "@/lib/job/offers";

describe("validateCustomerOffer", () => {
  it("accepts an offer inside the estimate band", () => {
    const v = validateCustomerOffer(1200, 800, 1500);
    expect(v.valid).toBe(true);
  });

  it("rejects offers below the low threshold", () => {
    const v = validateCustomerOffer(300, 800, 1500);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("too_low");
    expect(v.min_allowed).toBe(400);
  });

  it("accepts an offer exactly at the low threshold", () => {
    expect(validateCustomerOffer(400, 800, 1500).valid).toBe(true);
  });

  it("rejects offers above the high threshold", () => {
    const v = validateCustomerOffer(9000, 2000, 4000);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("too_high");
    expect(v.max_allowed).toBe(8000);
  });

  it("accepts an offer exactly at the high threshold", () => {
    expect(validateCustomerOffer(8000, 2000, 4000).valid).toBe(true);
  });

  it("rejects zero and negative offers", () => {
    expect(validateCustomerOffer(0, 800, 1500).valid).toBe(false);
    expect(validateCustomerOffer(-50, 800, 1500).valid).toBe(false);
  });

  it("treats a zero estimate as unconstrained", () => {
    expect(validateCustomerOffer(100, 0, 0).valid).toBe(true);
    expect(validateCustomerOffer(5000, 0, 0).valid).toBe(true);
  });
});

describe("midpointOffer", () => {
  it("returns the midpoint rounded to 50", () => {
    expect(midpointOffer(800, 1500)).toBe(1150);
    expect(midpointOffer(2000, 4000)).toBe(3000);
  });

  it("returns 0 when the estimate is empty", () => {
    expect(midpointOffer(0, 0)).toBe(0);
  });
});

describe("roundTo50", () => {
  it("rounds to the nearest 50", () => {
    expect(roundTo50(1173)).toBe(1150);
    expect(roundTo50(1225)).toBe(1250);
    expect(roundTo50(3000)).toBe(3000);
  });
});

describe("validateWorkerCounter", () => {
  it("accepts a counter inside the negotiation band of the customer offer", () => {
    expect(validateWorkerCounter(2500, 2000).valid).toBe(true);
  });

  it("allows a counter exactly at 50% of the customer offer", () => {
    expect(validateWorkerCounter(1000, 2000).valid).toBe(true);
  });

  it("rejects counters below 50% of the customer offer", () => {
    const v = validateWorkerCounter(900, 2000);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("too_low");
    expect(v.min_allowed).toBe(1000);
  });

  it("rejects counters above 200% of the customer offer", () => {
    const v = validateWorkerCounter(4100, 2000);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("too_high");
    expect(v.max_allowed).toBe(4000);
  });

  it("allows a counter exactly at 200% of the customer offer", () => {
    expect(validateWorkerCounter(4000, 2000).valid).toBe(true);
  });

  it("rejects zero and negative counters", () => {
    expect(validateWorkerCounter(0, 2000).valid).toBe(false);
    expect(validateWorkerCounter(-5, 2000).valid).toBe(false);
  });

  it("caps a counter against the estimate when no customer offer exists", () => {
    const v = validateWorkerCounter(9000, 0, 4000);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("too_high");
    expect(v.max_allowed).toBe(8000);
  });

  it("accepts any positive counter on an empty-priced emergency job", () => {
    expect(validateWorkerCounter(5000, 0).valid).toBe(true);
  });
});

describe("offerIsExpired", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("expires offers past their deadline", () => {
    expect(offerIsExpired(new Date("2026-01-01T11:00:00Z"), now)).toBe(true);
  });

  it("keeps offers with a future or missing deadline", () => {
    expect(offerIsExpired(new Date("2026-01-01T13:00:00Z"), now)).toBe(false);
    expect(offerIsExpired(null, now)).toBe(false);
    expect(offerIsExpired(undefined, now)).toBe(false);
  });

  it("uses the current time when now is omitted", () => {
    const longPast = new Date(Date.now() - 86400000);
    expect(offerIsExpired(longPast)).toBe(true);
  });
});
