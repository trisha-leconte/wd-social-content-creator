import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DraftContext } from "@/lib/agent/prompt";

const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse };
  },
}));

const CTX: DraftContext = {
  profile: { oneStory: "story", voiceRules: ["rule"], doNotList: ["never"], ctaRotation: ["Try this today."] },
  bucket: { key: "LIVING_IT", name: "I'M LIVING IT", description: "d", whatItIsNot: "n" },
  series: { key: "TODAY_I_LIVED_IT", name: "TODAY I LIVED IT", structureSkeleton: "s", examples: ["e"] },
  lens: "consumer",
  card: null,
  recentCaptions: [],
  recentCtas: [],
  rawNotes: "picked up a penny",
};

const GOOD = {
  captions: ["a", "b", "c"],
  hooks: ["h1", "h2", "h3"],
  cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "hold the card up",
  storyVersion: "did it ✓",
};

describe("generateDraft", () => {
  beforeEach(() => {
    parse.mockReset();
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the parsed draft", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    expect((await generateDraft(CTX)).captions).toHaveLength(3);
  });

  it("calls the model named in the spec, with adaptive thinking", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    await generateDraft(CTX);
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5");
    expect(args.thinking).toEqual({ type: "adaptive" });
    expect(args.budget_tokens).toBeUndefined();
  });

  it("marks the system prompt cacheable so repeat drafting reuses the prefix", async () => {
    parse.mockResolvedValue({ parsed_output: GOOD });
    const { generateDraft } = await import("@/lib/agent/generate");
    await generateDraft(CTX);
    expect(parse.mock.calls[0][0].system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws a clear error when the model returns nothing parseable", async () => {
    parse.mockResolvedValue({ parsed_output: null });
    const { generateDraft } = await import("@/lib/agent/generate");
    await expect(generateDraft(CTX)).rejects.toThrow("could not be parsed");
  });

  it("throws a clear error when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { generateDraft } = await import("@/lib/agent/generate");
    await expect(generateDraft(CTX)).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});

describe("classifyAndDraft", () => {
  beforeEach(() => {
    parse.mockReset();
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the bucket and series the model chose", async () => {
    parse.mockResolvedValue({
      parsed_output: { ...GOOD, bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", classificationReason: "personal evidence" },
    });
    const { classifyAndDraft } = await import("@/lib/agent/generate");
    const out = await classifyAndDraft(CTX);
    expect(out.bucketKey).toBe("LIVING_IT");
    expect(out.seriesKey).toBe("TODAY_I_LIVED_IT");
  });
});
