import { describe, it, expect } from "vitest";
import {
  buildOutlinePrompt,
  buildOutlineMessage,
  buildDraftPrompt,
  buildDraftMessage,
  type BlogContext,
} from "@/lib/blog/prompt";

const CTX: BlogContext = {
  voice: {
    oneStory: "I spent years consuming personal development and calling it growth.",
    whyItExists: "I built the thing I needed to start trusting myself again.",
    beliefs: ["Stop trying to convince yourself to believe. Build evidence."],
    enemy: "Passive consumption. Knowing without doing.",
    reader: "9pm on a bad Tuesday.",
    wordsSheNeverUses: ["unlock your potential", "quantum leap"],
  },
  rules: {
    siteUrl: "https://wealthdailyapp.com",
    targetWordCount: { min: 1200, max: 2000 },
    structureRules: ["Answer the query in the first 100 words."],
    contentRules: ["Follow every abstract claim with a concrete instance."],
    doNotList: ["NEVER write a statistic, a percentage, a study."],
  },
  topic: "how to actually apply what you read",
  audience: "reader",
  cards: [
    { activityId: "a1", productId: "p1", text: "Give a genuine compliment to someone you don't know.", productTitle: "Love Your Person", chapterTitle: "Notice Them" },
  ],
  products: [
    { productId: "p1", title: "The Science of Getting Rich", cardCount: 84, slug: "science-of-getting-rich" },
  ],
};

const OUTLINE = {
  targetKeyword: "apply what you read",
  secondaryKeywords: ["personal development that works"],
  searchIntent: "informational" as const,
  titleOptions: ["A", "B", "C"],
  metaDescription: "m".repeat(150),
  outline: [
    { heading: "Why does nothing change after you finish a book?", level: 2, notes: "name the gap" },
    { heading: "Do one thing tonight", level: 2, notes: "cite a real card" },
    { heading: "Collect the proof", level: 2, notes: "evidence over belief" },
  ],
  sourceRefs: [{ kind: "card" as const, title: "Give a genuine compliment", detail: "Love Your Person" }],
  internalLinks: [{ label: "The Science of Getting Rich", url: "https://wealthdailyapp.com/store/sogr" }],
  estimatedWords: 1500,
};

describe("buildOutlinePrompt", () => {
  it("carries her voice", () => {
    const p = buildOutlinePrompt(CTX);
    expect(p).toContain("I built the thing I needed");
    expect(p).toContain("Knowing without doing.");
  });

  it("carries the one story — the belief profile the social agent also shares", () => {
    const p = buildOutlinePrompt(CTX);
    expect(p).toContain("I spent years consuming personal development and calling it growth.");
  });

  it("forbids inventing internal link URLs", () => {
    const p = buildOutlinePrompt(CTX);
    expect(p).toMatch(/never invent a url|only the real product urls/i);
  });

  it("does not leave a blank-line gap when the voice profile is empty", () => {
    const p = buildOutlinePrompt({ ...CTX, voice: {} });
    expect(p).not.toMatch(/\n\n\n/);
  });

  it("carries the blog structure and content rules", () => {
    const p = buildOutlinePrompt(CTX);
    expect(p).toContain("Answer the query in the first 100 words.");
    expect(p).toContain("Follow every abstract claim with a concrete instance.");
  });

  it("makes the fabricated-statistics ban prohibition number one", () => {
    const p = buildOutlinePrompt(CTX);
    const list = p.slice(p.indexOf("# Absolute prohibitions"));
    expect(list).toMatch(/1\. NEVER write a statistic/);
  });

  it("does NOT carry the social agent's craft rules", () => {
    const p = buildOutlinePrompt(CTX);
    expect(p).not.toMatch(/end on an open loop/i);
    expect(p).not.toMatch(/never explain the moral/i);
    expect(p).not.toMatch(/short lines/i);
  });

  it("carries the banned vocabulary", () => {
    expect(buildOutlinePrompt(CTX)).toContain("unlock your potential");
  });

  it("states the word count range", () => {
    expect(buildOutlinePrompt(CTX)).toMatch(/1200/);
    expect(buildOutlinePrompt(CTX)).toMatch(/2000/);
  });
});

describe("buildOutlineMessage", () => {
  it("includes the topic", () => {
    expect(buildOutlineMessage(CTX)).toContain("how to actually apply what you read");
  });

  it("offers the real cards and products she can cite", () => {
    const m = buildOutlineMessage(CTX);
    expect(m).toContain("Give a genuine compliment");
    expect(m).toContain("The Science of Getting Rich");
    expect(m).toContain("84");
  });

  it("says plainly when there is no catalogue available", () => {
    const m = buildOutlineMessage({ ...CTX, cards: [], products: [] });
    expect(m).toMatch(/no catalogue|not connected|nothing to cite/i);
  });

  it("builds a real URL from the product's slug rather than leaving one to invent", () => {
    const m = buildOutlineMessage(CTX);
    expect(m).toContain("https://wealthdailyapp.com/store/science-of-getting-rich");
  });
});

describe("buildDraftPrompt and buildDraftMessage", () => {
  it("the draft prompt keeps the same voice and prohibitions", () => {
    const p = buildDraftPrompt(CTX);
    expect(p).toContain("I built the thing I needed");
    expect(p).toMatch(/1\. NEVER write a statistic/);
  });

  it("the draft prompt asks for Markdown", () => {
    expect(buildDraftPrompt(CTX)).toMatch(/markdown/i);
  });

  it("the draft message carries every approved heading", () => {
    const m = buildDraftMessage(CTX, OUTLINE);
    for (const item of OUTLINE.outline) expect(m).toContain(item.heading);
  });

  it("the draft message carries the chosen keyword and meta description", () => {
    const m = buildDraftMessage(CTX, OUTLINE);
    expect(m).toContain("apply what you read");
    expect(m).toContain(OUTLINE.metaDescription);
  });

  it("the draft message tells it not to add headings of its own", () => {
    expect(buildDraftMessage(CTX, OUTLINE)).toMatch(/do not add|exactly these headings|no extra headings/i);
  });
});
