import { describe, it, expect, vi, beforeEach } from "vitest";

const findOne = vi.fn();
const find = vi.fn();
vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOne } }));
vi.mock("@/models/Bucket", () => ({ default: { findOne } }));
vi.mock("@/models/Series", () => ({ default: { findOne } }));
vi.mock("@/models/Post", () => ({ default: { find } }));

describe("buildDraftContext", () => {
  beforeEach(() => {
    findOne.mockReset();
    find.mockReset();
  });

  it("assembles a context from the post, its bucket, its series and the profile", async () => {
    findOne
      .mockReturnValueOnce({ lean: () => ({ oneStory: "s", voiceRules: ["v"], doNotList: ["d"], ctaRotation: ["c"] }) })
      .mockReturnValueOnce({ lean: () => ({ key: "LIVING_IT", name: "I'M LIVING IT", description: "d", whatItIsNot: "n" }) })
      .mockReturnValueOnce({ lean: () => ({ key: "TODAY_I_LIVED_IT", name: "TODAY I LIVED IT", structureSkeleton: "sk", examples: ["e"] }) });
    find.mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => [{ chosenCaption: "old caption here", cta: "Try this today." }] }) }),
    });

    const { buildDraftContext } = await import("@/lib/posts");
    const ctx = await buildDraftContext({
      bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", lens: "consumer",
      rawNotes: "penny", sourceCardRef: null,
    } as never);

    expect(ctx.bucket.name).toBe("I'M LIVING IT");
    expect(ctx.series.key).toBe("TODAY_I_LIVED_IT");
    expect(ctx.rawNotes).toBe("penny");
    expect(ctx.recentCaptions).toEqual(["old caption here"]);
    expect(ctx.recentCtas).toEqual(["Try this today."]);
  });

  it("throws a clear error when the strategy has not been seeded", async () => {
    findOne.mockReturnValue({ lean: () => null });
    const { buildDraftContext } = await import("@/lib/posts");
    await expect(
      buildDraftContext({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", lens: "consumer", rawNotes: "" } as never)
    ).rejects.toThrow("npm run seed");
  });
});
