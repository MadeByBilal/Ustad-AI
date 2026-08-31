import { describe, expect, it } from "vitest";
import {
  canTransition,
  assertAllowedTransition,
  expireIfDeadlinePassed,
  resolveAcceptanceDeadline,
  resolveSelectionDeadline,
  EMERGENCY_ACCEPTANCE_MINUTES,
  NORMAL_ACCEPTANCE_MINUTES,
  SELECTION_MINUTES,
} from "@/server/lib/job/state-machine";
import type { JobStatus } from "@/server/models";

// ─── Complete transition matrix ───────────────────────────────────────

const ALL_STATUSES: JobStatus[] = [
  "DRAFT", "ANALYZING", "WAITING_FOR_CUSTOMER", "READY_TO_MATCH",
  "BROADCASTING", "WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED",
  "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION",
  "COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED",
];

const VALID_TRANSITIONS: Array<[JobStatus, JobStatus, string]> = [
  ["DRAFT", "ANALYZING", "system"],
  ["ANALYZING", "WAITING_FOR_CUSTOMER", "system"],
  ["WAITING_FOR_CUSTOMER", "ANALYZING", "customer"],
  ["WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "customer"],
  ["WAITING_FOR_CUSTOMER", "CANCELLED", "customer"],
  ["READY_TO_MATCH", "BROADCASTING", "customer"],
  ["READY_TO_MATCH", "CANCELLED", "customer"],
  ["BROADCASTING", "WORKER_RESPONSES", "worker"],
  ["BROADCASTING", "CUSTOMER_SELECTING", "customer"],
  ["BROADCASTING", "ACCEPTED", "worker"],
  ["BROADCASTING", "EXPIRED", "system"],
  ["BROADCASTING", "CANCELLED", "customer"],
  ["WORKER_RESPONSES", "CUSTOMER_SELECTING", "system"],
  ["WORKER_RESPONSES", "READY_TO_MATCH", "customer"],
  ["WORKER_RESPONSES", "EXPIRED", "system"],
  ["WORKER_RESPONSES", "CANCELLED", "customer"],
  ["CUSTOMER_SELECTING", "ACCEPTED", "customer"],
  ["CUSTOMER_SELECTING", "READY_TO_MATCH", "customer"],
  ["CUSTOMER_SELECTING", "EXPIRED", "system"],
  ["CUSTOMER_SELECTING", "CANCELLED", "customer"],
  ["ACCEPTED", "EN_ROUTE", "worker"],
  ["ACCEPTED", "CANCELLED", "worker"],
  ["EN_ROUTE", "ARRIVED", "worker"],
  ["EN_ROUTE", "CANCELLED", "worker"],
  ["ARRIVED", "IN_PROGRESS", "worker"],
  ["ARRIVED", "CANCELLED", "worker"],
  ["IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION", "worker"],
  ["IN_PROGRESS", "CANCELLED", "worker"],
  ["AWAITING_CUSTOMER_CONFIRMATION", "COMPLETED", "customer"],
  ["AWAITING_CUSTOMER_CONFIRMATION", "DISPUTED", "customer"],
];

// ─── All invalid transitions (every status -> every other status not in VALID) ──

function generateInvalidTransitions(): Array<[JobStatus, JobStatus, string]> {
  const invalid: Array<[JobStatus, JobStatus, string]> = [];

  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      if (from === to) continue;
      const isValid = VALID_TRANSITIONS.some(
        ([vFrom, vTo]) => vFrom === from && vTo === to
      );
      if (!isValid) {
        // Pick the most likely actor to try
        invalid.push([from, to, "customer"]);
        if (to === "EN_ROUTE" || to === "ARRIVED" || to === "IN_PROGRESS") {
          invalid.push([from, to, "worker"]);
        }
      }
    }
  }
  return invalid;
}

const INVALID_TRANSITIONS = generateInvalidTransitions();

describe("state machine — exhaustive valid transitions", () => {
  it.each(VALID_TRANSITIONS)(
    "allows %s -> %s for %s",
    (from, to, actor) => {
      expect(canTransition(from, to, actor as "customer" | "worker" | "system")).toBe(true);
    }
  );
});

describe("state machine — exhaustive invalid transitions", () => {
  it.each(INVALID_TRANSITIONS)(
    "rejects %s -> %s for %s",
    (from, to, actor) => {
      expect(canTransition(from, to, actor as "customer" | "worker" | "system")).toBe(false);
    }
  );
});

describe("state machine — terminal states have no outgoing transitions", () => {
  const terminalStates: JobStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED"];
  const actors: Array<"customer" | "worker" | "system"> = ["customer", "worker", "system"];

  for (const terminal of terminalStates) {
    for (const target of ALL_STATUSES) {
      if (target === terminal) continue;
      for (const actor of actors) {
        it(`rejects ${terminal} -> ${target} for ${actor}`, () => {
          expect(canTransition(terminal, target, actor)).toBe(false);
        });
      }
    }
  }
});

describe("state machine — assertAllowedTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() =>
      assertAllowedTransition("DRAFT", "ANALYZING", "system")
    ).not.toThrow();
  });

  it("throws for invalid transitions", () => {
    expect(() =>
      assertAllowedTransition("COMPLETED", "DRAFT", "system")
    ).toThrow("Invalid transition COMPLETED -> DRAFT for actor system");
  });

  it("throws for wrong actor on valid transition", () => {
    expect(() =>
      assertAllowedTransition("DRAFT", "ANALYZING", "customer")
    ).toThrow("Invalid transition DRAFT -> ANALYZING for actor customer");
  });
});

describe("state machine — edge cases", () => {
  it("allows system to cancel from any cancellable state", () => {
    const cancellableFrom: JobStatus[] = [
      "WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "BROADCASTING",
      "WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED",
      "EN_ROUTE", "ARRIVED", "IN_PROGRESS",
    ];
    for (const from of cancellableFrom) {
      expect(canTransition(from, "CANCELLED", "system")).toBe(true);
    }
  });

  it("allows worker to cancel from ACCEPTED, EN_ROUTE, ARRIVED, IN_PROGRESS", () => {
    const workerCancellable: JobStatus[] = ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
    for (const from of workerCancellable) {
      expect(canTransition(from, "CANCELLED", "worker")).toBe(true);
    }
  });

  it("rejects worker cancellation from AWAITING_CUSTOMER_CONFIRMATION", () => {
    expect(canTransition("AWAITING_CUSTOMER_CONFIRMATION", "CANCELLED", "worker")).toBe(false);
  });

  it("allows BROADCASTING -> ACCEPTED for system (emergency auto-accept)", () => {
    expect(canTransition("BROADCASTING", "ACCEPTED", "system")).toBe(true);
  });

  it("rejects customer going directly from BROADCASTING to ACCEPTED", () => {
    expect(canTransition("BROADCASTING", "ACCEPTED", "customer")).toBe(false);
  });

  it("allows rebroadcast from WORKER_RESPONSES and CUSTOMER_SELECTING", () => {
    expect(canTransition("WORKER_RESPONSES", "READY_TO_MATCH", "customer")).toBe(true);
    expect(canTransition("CUSTOMER_SELECTING", "READY_TO_MATCH", "customer")).toBe(true);
  });

  it("rejects rebroadcast by worker", () => {
    expect(canTransition("WORKER_RESPONSES", "READY_TO_MATCH", "worker")).toBe(false);
  });

  it("allows system rebroadcast from WORKER_RESPONSES", () => {
    expect(canTransition("WORKER_RESPONSES", "READY_TO_MATCH", "system")).toBe(true);
  });
});

describe("deadlines", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("uses the short acceptance window for emergencies", () => {
    const d = resolveAcceptanceDeadline("emergency", now);
    expect(d.getTime()).toBe(now.getTime() + EMERGENCY_ACCEPTANCE_MINUTES * 60_000);
  });

  it("uses the longer acceptance window for normal jobs", () => {
    const d = resolveAcceptanceDeadline("normal", now);
    expect(d.getTime()).toBe(now.getTime() + NORMAL_ACCEPTANCE_MINUTES * 60_000);
  });

  it("sets a selection deadline after the acceptance window", () => {
    const d = resolveSelectionDeadline(now);
    expect(d.getTime()).toBe(now.getTime() + SELECTION_MINUTES * 60_000);
  });
});

describe("expireIfDeadlinePassed", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const past = new Date("2026-01-01T11:00:00Z");
  const future = new Date("2026-01-01T13:00:00Z");

  it("expires a BROADCASTING job past its acceptance deadline", () => {
    expect(expireIfDeadlinePassed("BROADCASTING", { acceptance_deadline: past }, now)).toBe("EXPIRED");
  });

  it("does not expire a BROADCASTING job before its deadline", () => {
    expect(expireIfDeadlinePassed("BROADCASTING", { acceptance_deadline: future }, now)).toBeNull();
  });

  it("expires a CUSTOMER_SELECTING job past its selection deadline", () => {
    expect(expireIfDeadlinePassed("CUSTOMER_SELECTING", { selection_deadline: past }, now)).toBe("EXPIRED");
  });

  it("expires a WORKER_RESPONSES job past its selection deadline", () => {
    expect(expireIfDeadlinePassed("WORKER_RESPONSES", { selection_deadline: past }, now)).toBe("EXPIRED");
  });

  it("does not expire a WORKER_RESPONSES job while the selection window is open", () => {
    expect(
      expireIfDeadlinePassed("WORKER_RESPONSES", { acceptance_deadline: future, selection_deadline: future }, now)
    ).toBeNull();
  });

  it("returns null when no deadline applies to the status", () => {
    expect(expireIfDeadlinePassed("DRAFT", {}, now)).toBeNull();
    expect(expireIfDeadlinePassed("ACCEPTED", {}, now)).toBeNull();
    expect(expireIfDeadlinePassed("COMPLETED", {}, now)).toBeNull();
    expect(expireIfDeadlinePassed("IN_PROGRESS", {}, now)).toBeNull();
  });

  it("uses the current time when now is omitted", () => {
    const longPast = new Date(Date.now() - 86400000);
    expect(expireIfDeadlinePassed("BROADCASTING", { acceptance_deadline: longPast })).toBe("EXPIRED");
  });

  it("handles null deadlines gracefully", () => {
    expect(expireIfDeadlinePassed("BROADCASTING", null, now)).toBeNull();
    expect(expireIfDeadlinePassed("BROADCASTING", undefined, now)).toBeNull();
  });
});

describe("state machine — no backwards transitions", () => {
const backwardsPairs: Array<[JobStatus, JobStatus, string]> = [
  ["ANALYZING", "DRAFT", "system"],
  ["READY_TO_MATCH", "WAITING_FOR_CUSTOMER", "customer"],
  ["BROADCASTING", "READY_TO_MATCH", "customer"],
  ["WORKER_RESPONSES", "BROADCASTING", "worker"],
  ["CUSTOMER_SELECTING", "BROADCASTING", "customer"],
  ["ACCEPTED", "BROADCASTING", "worker"],
  ["EN_ROUTE", "ACCEPTED", "worker"],
  ["ARRIVED", "EN_ROUTE", "worker"],
  ["IN_PROGRESS", "ARRIVED", "worker"],
  ["AWAITING_CUSTOMER_CONFIRMATION", "IN_PROGRESS", "worker"],
  ["COMPLETED", "AWAITING_CUSTOMER_CONFIRMATION", "customer"],
];

it.each(backwardsPairs)("rejects %s -> %s for %s (backwards)", (from, to, actor) => {
  expect(canTransition(from, to, actor as "customer" | "worker" | "system")).toBe(false);
});
});

describe("state machine — no skipping transitions", () => {
  const skipPairs: Array<[JobStatus, JobStatus]> = [
    ["ACCEPTED", "ARRIVED"],
    ["ACCEPTED", "IN_PROGRESS"],
    ["ACCEPTED", "AWAITING_CUSTOMER_CONFIRMATION"],
    ["EN_ROUTE", "IN_PROGRESS"],
    ["EN_ROUTE", "AWAITING_CUSTOMER_CONFIRMATION"],
    ["ARRIVED", "AWAITING_CUSTOMER_CONFIRMATION"],
    ["DRAFT", "READY_TO_MATCH"],
    ["DRAFT", "BROADCASTING"],
  ];

  it.each(skipPairs)("rejects %s -> %s (skipping)", (from, to) => {
    expect(canTransition(from, to, "worker")).toBe(false);
  });
});
