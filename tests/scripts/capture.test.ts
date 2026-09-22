import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const classifyAndDraft = vi.fn();
const buildDraftContext = vi.fn();

vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/Post", () => ({ default: { create } }));
vi.mock("@/lib/agent/generate", () => ({ classifyAndDraft }));
vi.mock("@/lib/posts", () => ({ buildDraftContext }));

const CLASSIFIED = {
  bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", classificationReason: "her own evidence",
  captions: ["It started with picking up pennies."], hooks: ["h1", "h2", "h3"], cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "photo of the coat pocket", storyVersion: "found $20 ✓",
};

describe("captureStory", () => {
  beforeEach(() => {
    create.mockReset(); classifyAndDraft.mockReset(); buildDraftContext.mockReset();
    buildDraftContext.mockResolvedValue({});
    classifyAndDraft.mockResolvedValue(CLASSIFIED);
    create.mockImplementation(async (doc) => ({ ...doc, _id: "post1" }));
  });

  it("saves the captured post with the classified bucket and series", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", status: "captured" })
    );
  });

  it("stores the raw story and leaves the post unscheduled", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    const doc = create.mock.calls[0][0];
    expect(doc.rawNotes).toBe("penny then $20");
    expect(doc.slotKey).toBeUndefined();
    expect(doc.date).toBeUndefined();
  });

  it("keeps the generated draft on the post", async () => {
    const { captureStory } = await import("@/lib/capture");
    await captureStory("penny then $20");
    expect(create.mock.calls[0][0].generations).toHaveLength(1);
  });

  it("returns the id, bucket and first caption for the terminal to print", async () => {
    const { captureStory } = await import("@/lib/capture");
    const out = await captureStory("penny then $20");
    expect(out.postId).toBe("post1");
    expect(out.bucketKey).toBe("LIVING_IT");
    expect(out.caption).toContain("pennies");
  });

  it("refuses an empty story rather than calling the model", async () => {
    const { captureStory } = await import("@/lib/capture");
    await expect(captureStory("   ")).rejects.toThrow("Tell me what happened");
    expect(classifyAndDraft).not.toHaveBeenCalled();
  });
});
