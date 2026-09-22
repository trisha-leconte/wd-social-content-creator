import { describe, it, expect } from "vitest";
import { BUCKETS, SERIES, WEEKLY_SLOTS, STRATEGY_PROFILE, STORY_PROMPTS } from "@/seed/strategy";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

describe("seeded strategy", () => {
  it("defines all four buckets, and their targets sum to 100", () => {
    expect(BUCKETS.map((b) => b.key).sort()).toEqual([...BUCKET_KEYS].sort());
    expect(BUCKETS.reduce((n, b) => n + b.targetPercent, 0)).toBe(100);
  });

  it("gives every bucket a whatItIsNot, since the agent relies on it", () => {
    expect(BUCKETS.every((b) => b.whatItIsNot.trim().length > 0)).toBe(true);
  });

  it("defines all six series, each pointing at a real bucket", () => {
    expect(SERIES.map((s) => s.key).sort()).toEqual([...SERIES_KEYS].sort());
    expect(SERIES.every((s) => (BUCKET_KEYS as readonly string[]).includes(s.bucketKey))).toBe(true);
  });

  it("gives every series prompt questions and at least one real example", () => {
    expect(SERIES.every((s) => s.promptQuestions.length > 0 && s.examples.length > 0)).toBe(true);
  });

  it("schedules exactly four posts a week on Mon, Tue, Thu and Sat", () => {
    expect(WEEKLY_SLOTS.map((s) => s.dayOfWeek)).toEqual([1, 2, 4, 6]);
  });

  it("points every slot at a series that belongs to that slot's bucket", () => {
    for (const slot of WEEKLY_SLOTS) {
      const series = SERIES.find((s) => s.key === slot.defaultSeriesKey);
      expect(series?.bucketKey).toBe(slot.bucketKey);
    }
  });

  it("names the feature-advertising failure mode in the do-not list", () => {
    const joined = STRATEGY_PROFILE.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("download");
    expect(joined).toContain("streaks");
  });

  it("forbids platform-instruction CTAs in the do-not list", () => {
    const joined = STRATEGY_PROFILE.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("comment below");
    expect(joined).toContain("tag a friend");
  });

  it("carries a CTA rotation and an opener bank the agent can rotate through", () => {
    expect(STRATEGY_PROFILE.ctaRotation.length).toBeGreaterThanOrEqual(5);
    expect(STRATEGY_PROFILE.openerBank.length).toBeGreaterThanOrEqual(5);
  });

  it("defines exactly three pinned posts", () => {
    expect(STRATEGY_PROFILE.pinnedPosts).toHaveLength(3);
  });

  it("carries story prompts for the unscheduled Stories layer", () => {
    expect(STORY_PROMPTS.length).toBeGreaterThanOrEqual(5);
  });
});
