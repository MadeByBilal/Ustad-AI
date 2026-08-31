import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/models", () => {
  const mockFindOne = () => ({ lean: vi.fn().mockResolvedValue(null) });
  const mockFindOneAndUpdate = () => ({ lean: vi.fn().mockResolvedValue(null) });
  const mockCreate = vi.fn().mockResolvedValue({ _id: "created" });
  const mockUpdateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const mockUpdateMany = vi.fn().mockResolvedValue({});
  return {
    Job: {
      findOne: vi.fn(mockFindOne),
      findOneAndUpdate: vi.fn(mockFindOneAndUpdate),
      create: mockCreate,
    },
    Offer: {
      findOne: vi.fn(mockFindOne),
      findOneAndUpdate: vi.fn(mockFindOneAndUpdate),
      create: mockCreate,
      updateOne: mockUpdateOne,
      updateMany: mockUpdateMany,
    },
    Worker: {
      updateOne: mockUpdateOne,
    },
    JobEvent: {
      create: mockCreate,
    },
    Message: {
      create: mockCreate,
    },
    SYSTEM_SENDER_ID: "system",
    JOB_STATUSES: ["DRAFT", "ANALYZING", "WAITING_FOR_CUSTOMER", "READY_TO_MATCH", "BROADCASTING", "WORKER_RESPONSES", "CUSTOMER_SELECTING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_CUSTOMER_CONFIRMATION", "COMPLETED", "CANCELLED", "EXPIRED", "DISPUTED"],
    URGENCY_LEVELS: ["normal", "potentially_urgent", "emergency"],
  };
});

describe("direct request lib", () => {
  it("exports the expected functions", async () => {
    const mod = await import("@/server/lib/job/requests");
    expect(typeof mod.createDirectRequest).toBe("function");
    expect(typeof mod.respondToDirectRequest).toBe("function");
    expect(typeof mod.respondToCounter).toBe("function");
  });
});
