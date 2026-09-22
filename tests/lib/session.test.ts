import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieGet = vi.fn();
const redirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock("next/navigation", () => ({ redirect }));

describe("requireUserId", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    redirect.mockClear();
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns the user id for a properly signed token", async () => {
    const { signToken } = await import("@/lib/auth");
    cookieGet.mockReturnValue({ value: signToken("u1") });
    const { requireUserId } = await import("@/lib/session");
    expect(await requireUserId()).toBe("u1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to login when the cookie is a forged value", async () => {
    cookieGet.mockReturnValue({ value: "totally-made-up" });
    const { requireUserId } = await import("@/lib/session");
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when the token was signed with another secret", async () => {
    const { signToken } = await import("@/lib/auth");
    const token = signToken("u1");
    process.env.JWT_SECRET = "a-different-secret";
    cookieGet.mockReturnValue({ value: token });
    const { requireUserId } = await import("@/lib/session");
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("redirects to login when there is no cookie at all", async () => {
    cookieGet.mockReturnValue(undefined);
    const { requireUserId } = await import("@/lib/session");
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
  });
});
