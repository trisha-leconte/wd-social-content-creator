import { describe, it, expect } from "vitest";
import { BLOG_RULES } from "@/lib/blog/rules";

describe("blog craft rules", () => {
  it("bans fabricated statistics as the first prohibition", () => {
    expect(BLOG_RULES.doNotList[0]).toMatch(/statistic|study|percentage/i);
  });

  it("bans invented detail about her life", () => {
    expect(BLOG_RULES.doNotList.join(" ")).toMatch(/never say|did not say|invent/i);
  });

  it("bans the AI tells", () => {
    const joined = BLOG_RULES.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("fast-paced world");
    expect(joined).toContain("dive in");
    expect(joined).toContain("in conclusion");
  });

  it("requires the query answered in the first hundred words", () => {
    expect(BLOG_RULES.structureRules.join(" ")).toMatch(/first 100 words/i);
  });

  it("carries no voice rules — those live on the StrategyProfile", () => {
    const all = JSON.stringify(BLOG_RULES).toLowerCase();
    expect(all).not.toContain("i spent years consuming");
    expect(all).not.toContain("unlock your potential");
  });

  it("sets a word count range rather than a single number", () => {
    expect(BLOG_RULES.targetWordCount.min).toBeGreaterThan(800);
    expect(BLOG_RULES.targetWordCount.max).toBeLessThanOrEqual(2500);
    expect(BLOG_RULES.targetWordCount.min).toBeLessThan(BLOG_RULES.targetWordCount.max);
  });
});
