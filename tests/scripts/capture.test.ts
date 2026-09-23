import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const classifyStory = vi.fn();
const generateDraft = vi.fn();
const buildDraftContext = vi.fn();

vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/Post", () => ({ default: { create } }));
vi.mock("@/lib/agent/generate", () => ({ classifyStory, generateDraft }));
vi.mock("@/lib/posts", () => ({ buildDraftContext }));

const DRAFT = {
  captions: ["It started with picking up pennies."],
  hooks: ["h1", "h2", "h3"],
  cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "photo of the coat pocket",
  storyVersion: "found $20 ✓",
};

describe("captureStory", () => {
  beforeEach(() => {
    create.mockReset();
    classifyStory.mockReset();
    generateDraft.mockReset();
    buildDraftContext.mockReset();
    buildDraftContext.mockResolvedValue({});
    generateDraft.mockResolvedValue(DRAFT);
    create.mockImplementation(async (doc) => ({ ...doc, _id: "post1" }));
  });

  it("classifies the story BEFORE building the writing prompt", async () => {
    classifyStory.mockResolvedValue({
      bucketKey: "BEHIND_THE_WORLD",
      seriesKey: "BUILDING_WEALTH_DAILY",
      reason: "she is shipping something",
    });
    const { captureStory } = await import("@/lib/capture");
    await captureStory("the site is live");

    expect(classifyStory).toHaveBeenCalledBefore(generateDraft as never);
  });

  it("builds the writing prompt from the CLASSIFIED series, not a hardcoded one", async () => {
    classifyStory.mockResolvedValue({
      bucketKey: "BEHIND_THE_WORLD",
      seriesKey: "BUILDING_WEALTH_DAILY",
      reason: "she is shipping something",
    });
    const { captureStory } = await import("@/lib/capture");
    await captureStory("the site is live at wealthdailyapp.com");

    // The regression: this used to be called with LIVING_IT / TODAY_I_LIVED_IT
    // every time, so the model was primed with a card-and-resistance skeleton
    // and invented a card and resistance to satisfy it.
    const ctxArg = buildDraftContext.mock.calls.at(-1)?.[0];
    expect(ctxArg.bucketKey).toBe("BEHIND_THE_WORLD");
    expect(ctxArg.seriesKey).toBe("BUILDING_WEALTH_DAILY");
  });

  it("saves the post under the classified bucket and series", async () => {
    classifyStory.mockResolvedValue({
      bucketKey: "THE_IDEA",
      seriesKey: "TRY_THIS",
      reason: "a belief, not an event",
    });
    const { captureStory } = await import("@/lib/capture");
    await captureStory("you don't need more information");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ bucketKey: "THE_IDEA", seriesKey: "TRY_THIS", status: "captured" })
    );
  });

  it("stores the raw story and leaves the post unscheduled", async () => {
    classifyStory.mockResolvedValue({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", reason: "r" });
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    const doc = create.mock.calls[0][0];
    expect(doc.rawNotes).toBe("penny then $20");
    expect(doc.slotKey).toBeUndefined();
    expect(doc.date).toBeUndefined();
  });

  it("keeps the generated draft on the post", async () => {
    classifyStory.mockResolvedValue({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", reason: "r" });
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    expect(create.mock.calls[0][0].generations).toHaveLength(1);
  });

  it("returns the id, bucket and first caption for the terminal to print", async () => {
    classifyStory.mockResolvedValue({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", reason: "her own evidence" });
    const { captureStory } = await import("@/lib/capture");
    const out = await captureStory("penny then $20");
    expect(out.postId).toBe("post1");
    expect(out.bucketKey).toBe("LIVING_IT");
    expect(out.caption).toContain("pennies");
  });

  it("refuses an empty story rather than calling the model", async () => {
    const { captureStory } = await import("@/lib/capture");
    await expect(captureStory("   ")).rejects.toThrow("Tell me what happened");
    expect(classifyStory).not.toHaveBeenCalled();
    expect(generateDraft).not.toHaveBeenCalled();
  });
});
