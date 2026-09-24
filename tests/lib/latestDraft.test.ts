import { describe, it, expect } from "vitest";
import { latestDraft } from "@/lib/latestDraft";

const g = (caption: string, createdAt: string) => ({
  createdAt,
  captions: [caption, "b", "c"],
  hooks: ["h1", "h2", "h3"],
  cta: "Try this today.",
  platformVariants: { instagram: "i", linkedin: "l", facebook_threads: "f" },
  suggestedVisual: "hold the card up",
  storyVersion: "did it ✓",
});

describe("latestDraft", () => {
  it("returns null when the post has never been generated", () => {
    expect(latestDraft([])).toBeNull();
    expect(latestDraft(undefined)).toBeNull();
  });

  it("returns the only generation when there is one", () => {
    expect(latestDraft([g("first", "2026-09-20T10:00:00Z")])?.captions[0]).toBe("first");
  });

  it("returns the NEWEST generation, not the first stored", () => {
    const out = latestDraft([
      g("older", "2026-09-20T10:00:00Z"),
      g("newest", "2026-09-23T18:00:00Z"),
      g("middle", "2026-09-21T09:00:00Z"),
    ]);
    expect(out?.captions[0]).toBe("newest");
  });

  it("falls back to the last in the array when timestamps are missing", () => {
    const out = latestDraft([
      { ...g("one", ""), createdAt: undefined },
      { ...g("two", ""), createdAt: undefined },
    ] as never);
    expect(out?.captions[0]).toBe("two");
  });

  it("carries every field the composer renders", () => {
    const out = latestDraft([g("only", "2026-09-20T10:00:00Z")]);
    expect(out?.hooks).toHaveLength(3);
    expect(out?.cta).toBe("Try this today.");
    expect(out?.platformVariants.instagram).toBe("i");
    expect(out?.suggestedVisual).toBe("hold the card up");
    expect(out?.storyVersion).toBe("did it ✓");
  });

  it("ignores a generation with no captions rather than restoring an empty editor", () => {
    expect(latestDraft([{ ...g("x", "2026-09-20T10:00:00Z"), captions: [] }] as never)).toBeNull();
  });
});
