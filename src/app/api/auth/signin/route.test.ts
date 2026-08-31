import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword } from "@/server/lib/auth/password";

vi.mock("@/server/lib/mongodb", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/server/models", () => ({
  User: { findOne: vi.fn() },
  Session: { create: vi.fn() },
}));

import { User, Session } from "@/server/models";
import { POST } from "./route";

const STORED_HASH = hashPassword("correct-password-1");

const USER_DOC = {
  _id: "user-1",
  role: "customer",
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  password_hash: STORED_HASH,
};

function mockUserFound(doc: unknown) {
  const lean = vi.fn().mockResolvedValue(doc);
  const select = vi.fn().mockReturnValue({ lean });
  vi.mocked(User.findOne).mockReturnValue({ select } as never);
}

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFound(USER_DOC);
  vi.mocked(Session.create).mockResolvedValue({ _id: "session-1" } as never);
});

describe("POST /api/auth/signin", () => {
  it("signs in with correct credentials and sets a session cookie", async () => {
    const res = await POST(
      request({ email: "ayesha@example.com", password: "correct-password-1" })
    );
    expect(res.status).toBe(200);

    expect(User.findOne).toHaveBeenCalledWith({ email: "ayesha@example.com" });
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
    // The hash must never leak into the response
    expect(JSON.stringify(body)).not.toContain(STORED_HASH);
  });

  it("normalizes email casing before lookup", async () => {
    await POST(request({ email: " AYESHA@Example.com ", password: "correct-password-1" }));
    expect(User.findOne).toHaveBeenCalledWith({ email: "ayesha@example.com" });
  });

  it("rejects an unknown email with 401 and no session", async () => {
    mockUserFound(null);
    const res = await POST(
      request({ email: "ghost@example.com", password: "correct-password-1" })
    );
    expect(res.status).toBe(401);
    expect(Session.create).not.toHaveBeenCalled();
  });

  it("rejects a wrong password with 401 and no session", async () => {
    const res = await POST(
      request({ email: "ayesha@example.com", password: "wrong-password-2" })
    );
    expect(res.status).toBe(401);
    expect(Session.create).not.toHaveBeenCalled();
  });

  it("returns the same generic message for unknown email and wrong password", async () => {
    mockUserFound(null);
    const unknownEmail = await POST(
      request({ email: "ghost@example.com", password: "x" })
    );
    mockUserFound(USER_DOC);
    const wrongPassword = await POST(
      request({ email: "ayesha@example.com", password: "y" })
    );
    const a = await unknownEmail.json();
    const b = await wrongPassword.json();
    expect(a.error.message).toBe(b.error.message);
  });

  it("rejects an account record without a password hash", async () => {
    mockUserFound({ ...USER_DOC, password_hash: undefined });
    const res = await POST(
      request({ email: "ayesha@example.com", password: "correct-password-1" })
    );
    expect(res.status).toBe(401);
    expect(Session.create).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads with 400", async () => {
    const res = await POST(request({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(Session.create).not.toHaveBeenCalled();
  });
});
