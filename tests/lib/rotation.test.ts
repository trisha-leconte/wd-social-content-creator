import { describe, it, expect } from "vitest";
import { nextCta, firstWords, recentOpeners } from "@/lib/rotation";

const ROTATION = ["Try this today.", "Show me your proof.", "Come LIVE IT with us."];

describe("nextCta", () => {
  it("returns the first CTA when nothing has been used", () => {
    expect(nextCta(ROTATION, [])).toBe("Try this today.");
  });

  it("never repeats the most recently used CTA", () => {
    expect(nextCta(ROTATION, ["Try this today."])).not.toBe("Try this today.");
  });

  it("prefers the least recently used CTA", () => {
    expect(nextCta(ROTATION, ["Come LIVE IT with us.", "Show me your proof."])).toBe("Try this today.");
  });

  it("still returns something when every CTA was used recently", () => {
    expect(ROTATION).toContain(nextCta(ROTATION, [...ROTATION].reverse()));
  });

  it("throws when the rotation is empty, rather than returning undefined", () => {
    expect(() => nextCta([], [])).toThrow("CTA rotation is empty");
  });
});

describe("firstWords", () => {
  it("takes the first six words of a caption by default", () => {
    expect(firstWords("Today's card told me to compliment a stranger and I did")).toBe(
      "Today's card told me to compliment"
    );
  });

  it("ignores leading whitespace and blank lines", () => {
    expect(firstWords("\n\n  Did it anyway.", 3)).toBe("Did it anyway.");
  });

  it("returns an empty string for an empty caption", () => {
    expect(firstWords("")).toBe("");
  });
});

describe("recentOpeners", () => {
  it("returns the openers of the last eight captions, newest first", () => {
    const captions = Array.from({ length: 10 }, (_, i) => `Caption number ${i} continues here`);
    const openers = recentOpeners(captions);
    expect(openers).toHaveLength(8);
    expect(openers[0]).toContain("number 9");
  });

  it("drops blank captions", () => {
    expect(recentOpeners(["", "Did it anyway now"])).toEqual(["Did it anyway now"]);
  });
});
