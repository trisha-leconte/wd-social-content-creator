import { describe, it, expect } from "vitest";
import { mineIdeas } from "@/lib/blog/ideas";

const DECKS = [
  { productId: "p1", title: "The Science of Getting Rich", cardCount: 84 },
  { productId: "p2", title: "The Man in the Mirror", cardCount: 60 },
  { productId: "p3", title: "Empty Book", cardCount: 0 },
];

describe("mineIdeas", () => {
  it("proposes ideas only for products that actually have cards", () => {
    const ideas = mineIdeas(DECKS);
    expect(ideas.some((i) => i.productId === "p3")).toBe(false);
    expect(ideas.some((i) => i.productId === "p1")).toBe(true);
  });

  it("names the real book in every topic", () => {
    for (const idea of mineIdeas(DECKS)) {
      expect(idea.topic.toLowerCase()).toContain(
        DECKS.find((d) => d.productId === idea.productId)!.title.toLowerCase()
      );
    }
  });

  it("proposes several angles per book, not one", () => {
    const forSogr = mineIdeas(DECKS).filter((i) => i.productId === "p1");
    expect(forSogr.length).toBeGreaterThanOrEqual(3);
  });

  it("tags each idea with an audience the blog agent understands", () => {
    for (const idea of mineIdeas(DECKS)) {
      expect(["reader", "creator", "book_searcher"]).toContain(idea.audience);
    }
  });

  it("says why each idea is hers to write", () => {
    for (const idea of mineIdeas(DECKS)) expect(idea.why.length).toBeGreaterThan(10);
  });

  it("mentions the real card count where the angle depends on it", () => {
    const ideas = mineIdeas(DECKS).filter((i) => i.productId === "p1");
    expect(ideas.some((i) => i.why.includes("84"))).toBe(true);
  });

  it("returns an empty list when the catalogue is empty", () => {
    expect(mineIdeas([])).toEqual([]);
  });
});
