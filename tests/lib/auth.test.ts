import { describe, it, expect, beforeEach } from "vitest";

describe("auth tokens", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("round-trips a user id through sign and verify", async () => {
    const { signToken, verifyToken } = await import("@/lib/auth");
    expect(verifyToken(signToken("abc123"))).toBe("abc123");
  });

  it("returns null for a token signed with a different secret", async () => {
    const { signToken, verifyToken } = await import("@/lib/auth");
    const token = signToken("abc123");
    process.env.JWT_SECRET = "a-different-secret";
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a malformed token rather than throwing", async () => {
    const { verifyToken } = await import("@/lib/auth");
    expect(verifyToken("not-a-token")).toBeNull();
  });

  it("verifies a password against its own hash and rejects others", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth");
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("reads a signed-in user id out of a request cookie", async () => {
    const { signToken, currentUserId, AUTH_COOKIE } = await import("@/lib/auth");
    const req = new Request("http://x/", { headers: { cookie: `${AUTH_COOKIE}=${signToken("u1")}` } });
    expect(currentUserId(req)).toBe("u1");
  });

  it("returns null when the request carries no auth cookie", async () => {
    const { currentUserId } = await import("@/lib/auth");
    expect(currentUserId(new Request("http://x/"))).toBeNull();
  });
});
