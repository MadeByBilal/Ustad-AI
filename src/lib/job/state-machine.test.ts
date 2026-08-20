import { describe, expect, it } from "vitest";
import {
  EMERGENCY_ACCEPTANCE_MINUTES,
  NORMAL_ACCEPTANCE_MINUTES,
  SELECTION_MINUTES,
  canTransition,
  expireIfDeadlinePassed,
  resolveAcceptanceDeadline,
  resolveSelectionDeadline,
} from "@/lib/job/state-machine";

describe("canTransition", () => {
  it("allows DRAFT -> ANALYZING for system", () => {
    expect(canTransition("DRAFT", "ANALYZING", "system")).toBe(true);
  });

  it("rejects DRAFT -> ANALYZING for a worker", () => {
    expect(canTransition("DRAFT", "ANALYZING", "worker")).toBe(false);
  });

  it("allows ANALYZING -> WAITING_FOR_CUSTOMER for system", () => {
    expect(canTransition("ANALYZING", "WAITING_FOR_CUSTOMER", "system")).toBe(
      true
    );
  });

  it("allows WAITING_FOR_CUSTOMER -> READY_TO_MATCH for the customer", () => {
    expect(
      canTransition("WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "customer")
    ).toBe(true);
  });

  it("allows READY_TO_MATCH -> BROADCASTING for the customer", () => {
    expect(canTransition("READY_TO_MATCH", "BROADCASTING", "customer")).toBe(
      true
    );
  });

  it("allows BROADCASTING -> WORKER_RESPONSES for a worker", () => {
    expect(canTransition("BROADCASTING", "WORKER_RESPONSES", "worker")).toBe(
      true
    );
  });

  it("allows BROADCASTING -> ACCEPTED for a worker on emergency", () => {
    expect(canTransition("BROADCASTING", "ACCEPTED", "worker")).toBe(true);
  });

  it("rejects BROADCASTING -> ACCEPTED by the customer directly", () => {
    expect(canTransition("BROADCASTING", "ACCEPTED", "customer")).toBe(false);
  });

  it("allows BROADCASTING -> CUSTOMER_SELECTING when customer picks directly", () => {
    expect(canTransition("BROADCASTING", "CUSTOMER_SELECTING", "customer")).toBe(
      true
    );
  });

  it("allows WORKER_RESPONSES -> CUSTOMER_SELECTING for system", () => {
    expect(
      canTransition("WORKER_RESPONSES", "CUSTOMER_SELECTING", "system")
    ).toBe(true);
  });

  it("allows CUSTOMER_SELECTING -> ACCEPTED for the customer", () => {
    expect(canTransition("CUSTOMER_SELECTING", "ACCEPTED", "customer")).toBe(
      true
    );
  });

  it("rejects CUSTOMER_SELECTING -> ACCEPTED for a worker", () => {
    expect(canTransition("CUSTOMER_SELECTING", "ACCEPTED", "worker")).toBe(
      false
    );
  });

  it("allows cancellation from any active flow state", () => {
    expect(canTransition("WAITING_FOR_CUSTOMER", "CANCELLED", "customer")).toBe(
      true
    );
    expect(canTransition("BROADCASTING", "CANCELLED", "customer")).toBe(true);
    expect(canTransition("CUSTOMER_SELECTING", "CANCELLED", "system")).toBe(
      true
    );
  });

  it("allows the assigned worker to cancel an active job", () => {
    expect(canTransition("ACCEPTED", "CANCELLED", "worker")).toBe(true);
    expect(canTransition("EN_ROUTE", "CANCELLED", "worker")).toBe(true);
    expect(canTransition("ARRIVED", "CANCELLED", "worker")).toBe(true);
    expect(canTransition("IN_PROGRESS", "CANCELLED", "worker")).toBe(true);
    expect(canTransition("AWAITING_CUSTOMER_CONFIRMATION", "CANCELLED", "worker")).toBe(
      false
    );
  });

  it("lets the customer send a rejected job back to re-broadcast", () => {
    expect(canTransition("WORKER_RESPONSES", "READY_TO_MATCH", "customer")).toBe(
      true
    );
    expect(canTransition("CUSTOMER_SELECTING", "READY_TO_MATCH", "customer")).toBe(
      true
    );
    expect(canTransition("WORKER_RESPONSES", "READY_TO_MATCH", "worker")).toBe(
      false
    );
  });

  it("rejects unknown / backwards transitions", () => {
    expect(canTransition("ACCEPTED", "BROADCASTING", "system")).toBe(false);
    expect(canTransition("DRAFT", "CUSTOMER_SELECTING", "system")).toBe(false);
    expect(canTransition("BROADCASTING", "DRAFT", "system")).toBe(false);
  });

  it("rejects transitions to an unlisted status", () => {
    expect(canTransition("DRAFT", "EN_ROUTE", "system")).toBe(false);
  });
});

describe("worker journey transitions", () => {
  it("allows ACCEPTED -> EN_ROUTE for the assigned worker", () => {
    expect(canTransition("ACCEPTED", "EN_ROUTE", "worker")).toBe(true);
  });

  it("rejects ACCEPTED -> EN_ROUTE for the customer", () => {
    expect(canTransition("ACCEPTED", "EN_ROUTE", "customer")).toBe(false);
  });

  it("allows EN_ROUTE -> ARRIVED for the worker", () => {
    expect(canTransition("EN_ROUTE", "ARRIVED", "worker")).toBe(true);
  });

  it("allows EN_ROUTE -> ARRIVED for system (geofence auto-arrival)", () => {
    expect(canTransition("EN_ROUTE", "ARRIVED", "system")).toBe(true);
  });

  it("rejects EN_ROUTE -> ARRIVED for the customer", () => {
    expect(canTransition("EN_ROUTE", "ARRIVED", "customer")).toBe(false);
  });

  it("allows ARRIVED -> IN_PROGRESS for the worker", () => {
    expect(canTransition("ARRIVED", "IN_PROGRESS", "worker")).toBe(true);
  });

  it("allows IN_PROGRESS -> AWAITING_CUSTOMER_CONFIRMATION for the worker", () => {
    expect(
      canTransition("IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION", "worker")
    ).toBe(true);
  });

  it("rejects skipping steps or moving backwards", () => {
    expect(canTransition("ACCEPTED", "IN_PROGRESS", "worker")).toBe(false);
    expect(canTransition("EN_ROUTE", "ACCEPTED", "worker")).toBe(false);
  });

  it("rejects worker moves from a terminal state", () => {
    expect(canTransition("COMPLETED", "EN_ROUTE", "worker")).toBe(false);
  });

  it("lets the customer confirm or dispute a finished job", () => {
    expect(
      canTransition("AWAITING_CUSTOMER_CONFIRMATION", "COMPLETED", "customer")
    ).toBe(true);
    expect(
      canTransition("AWAITING_CUSTOMER_CONFIRMATION", "DISPUTED", "customer")
    ).toBe(true);
  });
});

describe("deadlines", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("uses the short acceptance window for emergencies", () => {
    const d = resolveAcceptanceDeadline("emergency", now);
    expect(d.getTime()).toBe(
      now.getTime() + EMERGENCY_ACCEPTANCE_MINUTES * 60_000
    );
  });

  it("uses the longer acceptance window for normal jobs", () => {
    const d = resolveAcceptanceDeadline("normal", now);
    expect(d.getTime()).toBe(
      now.getTime() + NORMAL_ACCEPTANCE_MINUTES * 60_000
    );
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
    expect(
      expireIfDeadlinePassed("BROADCASTING", { acceptance_deadline: past }, now)
    ).toBe("EXPIRED");
  });

  it("does not expire a BROADCASTING job before its deadline", () => {
    expect(
      expireIfDeadlinePassed(
        "BROADCASTING",
        { acceptance_deadline: future },
        now
      )
    ).toBeNull();
  });

  it("expires a CUSTOMER_SELECTING job past its selection deadline", () => {
    expect(
      expireIfDeadlinePassed(
        "CUSTOMER_SELECTING",
        { selection_deadline: past },
        now
      )
    ).toBe("EXPIRED");
  });

  it("expires a WORKER_RESPONSES job past its selection deadline", () => {
    expect(
      expireIfDeadlinePassed(
        "WORKER_RESPONSES",
        { selection_deadline: past },
        now
      )
    ).toBe("EXPIRED");
  });

  it("does not expire a WORKER_RESPONSES job while the selection window is open", () => {
    expect(
      expireIfDeadlinePassed(
        "WORKER_RESPONSES",
        { acceptance_deadline: future, selection_deadline: future },
        now
      )
    ).toBeNull();
  });

  it("returns null when no deadline applies to the status", () => {
    expect(expireIfDeadlinePassed("DRAFT", {}, now)).toBeNull();
    expect(expireIfDeadlinePassed("ACCEPTED", {}, now)).toBeNull();
  });

  it("uses the current time when now is omitted", () => {
    const longPast = new Date(Date.now() - 86400000);
    expect(
      expireIfDeadlinePassed("BROADCASTING", { acceptance_deadline: longPast })
    ).toBe("EXPIRED");
  });
});
