import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models", () => ({
  User: { findOne: vi.fn(), create: vi.fn() },
  Worker: { create: vi.fn() },
  Session: { create: vi.fn() },
  USER_ROLES: ["customer", "worker", "admin"],
  WORKER_CATEGORIES: ["plumber", "electrician", "ac_technician", "carpenter"],
}));

import { User, Worker, Session } from "@/models";
import { POST } from "./route";

const CUSTOMER_BODY = {
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  password: "secure-pass-9",
  role: "customer",
};

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(User.findOne).mockReturnValue({
    lean: vi.fn().mockResolvedValue(null),
  } as never);
  vi.mocked(User.create).mockResolvedValue({
    _id: "user-1",
    role: "customer",
    name: CUSTOMER_BODY.name,
    email: CUSTOMER_BODY.email,
  } as never);
  vi.mocked(Session.create).mockResolvedValue({ _id: "session-1" } as never);
});

describe("POST /api/auth/signup", () => {
  it("creates a customer account, hashes the password and sets a session cookie", async () => {
    const res = await POST(request(CUSTOMER_BODY));
    expect(res.status).toBe(201);

    const createArg = vi.mocked(User.create).mock.calls[0][0] as Record<string, unknown>;
    expect(createArg.email).toBe("ayesha@example.com");
    expect(createArg.role).toBe("customer");
    // Never store the raw password
    expect(createArg.password_hash).not.toBe(CUSTOMER_BODY.password);
    expect(String(createArg.password_hash)).toMatch(/^scrypt\$/);

    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", role: "customer" })
    );
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ustad_session=");
    expect(cookie.toLowerCase()).toContain("httponly");

    const body = await res.json();
    expect(body.data.user).toMatchObject({
      id: "user-1",
      role: "customer",
      email: "ayesha@example.com",
    });
  });

  it("normalizes email casing and whitespace before lookup and insert", async () => {
    await POST(request({ ...CUSTOMER_BODY, email: "  AYESHA@Example.COM  " }));
    expect(User.findOne).toHaveBeenCalledWith({ email: "ayesha@example.com" });
    const createArg = vi.mocked(User.create).mock.calls[0][0] as Record<string, unknown>;
    expect(createArg.email).toBe("ayesha@example.com");
  });

  it("rejects a duplicate email with 409", async () => {
    vi.mocked(User.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "existing" }),
    } as never);
    const res = await POST(request(CUSTOMER_BODY));
    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await POST(request({ ...CUSTOMER_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects a weak password with 422", async () => {
    const res = await POST(request({ ...CUSTOMER_BODY, password: "short" }));
    expect(res.status).toBe(422);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects a missing name", async () => {
    const res = await POST(request({ ...CUSTOMER_BODY, name: "" }));
    expect(res.status).toBe(400);
  });

  it("creates a worker profile when the role is worker", async () => {
    vi.mocked(User.create).mockResolvedValue({
      _id: "user-9",
      role: "worker",
      name: "Imran",
      email: "imran@example.com",
    } as never);
    const res = await POST(
      request({
        ...CUSTOMER_BODY,
        email: "imran@example.com",
        role: "worker",
        worker: { category: "plumber", skills: ["pipe fitting", "faucet repair"] },
      })
    );
    expect(res.status).toBe(201);
    expect(Worker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-9",
        category: "plumber",
        skills: ["pipe fitting", "faucet repair"],
        verified: false,
      })
    );
    const body = await res.json();
    expect(body.data.user.role).toBe("worker");
  });

  it("rejects a worker signup without a valid category", async () => {
    const res = await POST(
      request({
        ...CUSTOMER_BODY,
        role: "worker",
        worker: { category: "astronaut", skills: ["pipe fitting"] },
      })
    );
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects a worker signup without skills", async () => {
    const res = await POST(
      request({
        ...CUSTOMER_BODY,
        role: "worker",
        worker: { category: "plumber", skills: [] },
      })
    );
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it("does not allow signing up as admin", async () => {
    const res = await POST(request({ ...CUSTOMER_BODY, role: "admin" }));
    expect(res.status).toBe(400);
  });
});
