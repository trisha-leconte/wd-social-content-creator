import { describe, it, expect } from "vitest";
import { i18n, mapCardRow } from "@/lib/wealthdaily/map";

describe("i18n", () => {
  it("reads the English value out of a translation object", () => {
    expect(i18n({ en: "Give a genuine compliment", es: "Da un cumplido" })).toBe("Give a genuine compliment");
  });

  it("falls back to the first available value when there is no English", () => {
    expect(i18n({ es: "Da un cumplido" })).toBe("Da un cumplido");
  });

  it("passes a plain string through", () => {
    expect(i18n("Just a string")).toBe("Just a string");
  });

  it("returns an empty string for null, undefined or an empty object", () => {
    expect(i18n(null)).toBe("");
    expect(i18n(undefined)).toBe("");
    expect(i18n({})).toBe("");
  });
});

describe("mapCardRow", () => {
  it("prefers the deck front text, which is what a reader actually sees", () => {
    const card = mapCardRow({
      activity_id: "a1",
      product_id: "p1",
      deck_front: { title: { en: "Compliment a stranger" } },
      instructions: { en: "Go and do it" },
      title: { en: "Day 14" },
      product_title: "Love Your Person",
      chapter_title: { en: "Chapter 2" },
    });
    expect(card.text).toBe("Compliment a stranger");
    expect(card.productId).toBe("p1");
    expect(card.productTitle).toBe("Love Your Person");
    expect(card.chapterTitle).toBe("Chapter 2");
  });

  it("falls back to instructions, then the title, when there is no deck front", () => {
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: { en: "Go and do it" }, title: { en: "Day 14" }, product_title: "P", chapter_title: null }).text
    ).toBe("Go and do it");
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: null, title: { en: "Day 14" }, product_title: "P", chapter_title: null }).text
    ).toBe("Day 14");
  });

  it("returns a null chapterTitle when the card has no chapter", () => {
    expect(
      mapCardRow({ activity_id: "a1", product_id: "p1", deck_front: null, instructions: null, title: { en: "T" }, product_title: "P", chapter_title: null }).chapterTitle
    ).toBeNull();
  });
});
