import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/blog/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Science of Getting Rich Exercises")).toBe("science-getting-rich-exercises");
  });

  it("drops stop words so the slug is not soup", () => {
    expect(slugify("How to Actually Apply What You Read in a Book")).toBe("actually-apply-what-you-read-book");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugify("Wealth Daily — what's inside?  (2026)")).toBe("wealth-daily-whats-inside-2026");
  });

  it("folds accents to ASCII", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
  });

  it("never starts or ends with a hyphen", () => {
    expect(slugify("  --- The Idea --- ")).toBe("idea");
  });

  it("caps length at 60 characters without cutting a word in half", () => {
    const s = slugify("The Science of Getting Rich is a book about gratitude and creative thought and action");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("is stable for the same title", () => {
    expect(slugify("Do the thing")).toBe(slugify("Do the thing"));
  });

  it("returns an empty string for a title with nothing usable", () => {
    expect(slugify("the a of")).toBe("");
  });
});
