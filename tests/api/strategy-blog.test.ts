import { describe, it, expect, vi, beforeEach } from "vitest";

const findOneAndUpdate = vi.fn();
vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOneAndUpdate: vi.fn() } }));
vi.mock("@/models/BlogProfile", () => ({ default: { findOneAndUpdate } }));
vi.mock("@/lib/auth", () => ({ currentUserId: () => "u1" }));

describe("PATCH /api/strategy with blog fields", () => {
  beforeEach(() => findOneAndUpdate.mockReset());

  it("routes blog rule fields to the BlogProfile", async () => {
    findOneAndUpdate.mockResolvedValue({ structureRules: ["x"] });
    const { PATCH } = await import("@/app/api/strategy/route");
    const res = await PATCH(
      new Request("http://x/api/strategy", {
        method: "PATCH",
        body: JSON.stringify({ blog: { structureRules: ["x"], doNotList: ["y"] } }),
      })
    );
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { singleton: "the-one" },
      expect.objectContaining({ structureRules: ["x"], doNotList: ["y"] }),
      expect.anything()
    );
  });

  it("ignores blog fields that are not editable rules", async () => {
    findOneAndUpdate.mockResolvedValue({});
    const { PATCH } = await import("@/app/api/strategy/route");
    await PATCH(
      new Request("http://x/api/strategy", {
        method: "PATCH",
        body: JSON.stringify({ blog: { siteUrl: "http://evil", structureRules: ["x"] } }),
      })
    );
    const sent = findOneAndUpdate.mock.calls[0][1];
    expect(sent.siteUrl).toBeUndefined();
  });
});
