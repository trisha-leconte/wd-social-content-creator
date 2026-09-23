import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserMessage, type DraftContext } from "@/lib/agent/prompt";

const CTX: DraftContext = {
  profile: {
    oneStory: "I spent years consuming personal development.",
    voiceRules: ["Open on the resistance, not the lesson.", "Never explain the moral."],
    doNotList: ["Never write 'DOWNLOAD WEALTH DAILY!'", "Never use 'Comment below!'"],
    ctaRotation: ["Try this today.", "Show me your proof.", "What did YOU live today?"],
  },
  bucket: {
    key: "LIVING_IT",
    name: "I'M LIVING IT",
    description: "Trisha doing the thing.",
    whatItIsNot: "Not teaching. Documenting.",
  },
  series: {
    key: "TODAY_I_LIVED_IT",
    name: "TODAY I LIVED IT",
    structureSkeleton: "Assignment → resistance → did it anyway → what happened.",
    examples: ["Today's card told me to ______."],
  },
  lens: "consumer",
  card: { activityId: "a1", productId: "p1", text: "Compliment a stranger", productTitle: "Love Your Person", chapterTitle: "Chapter 2" },
  recentCaptions: ["Today's card told me to pick up a penny today", "I did not want to do this one"],
  recentCtas: ["Try this today."],
  rawNotes: "trader joe's, guy teared up",
};

describe("buildSystemPrompt", () => {
  it("carries the one story", () => {
    expect(buildSystemPrompt(CTX)).toContain("I spent years consuming personal development.");
  });

  it("names the bucket and what it is not", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("I'M LIVING IT");
    expect(p).toContain("Not teaching. Documenting.");
  });

  it("includes the series skeleton and its examples", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("Assignment → resistance");
    expect(p).toContain("Today's card told me to ______.");
  });

  it("includes every voice rule and every prohibition", () => {
    const p = buildSystemPrompt(CTX);
    for (const r of CTX.profile.voiceRules) expect(p).toContain(r);
    for (const d of CTX.profile.doNotList) expect(p).toContain(d);
  });

  it("names the chosen CTA and excludes the one just used", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("Show me your proof.");
    expect(p).not.toContain('Use this call to action, word for word: "Try this today."');
  });

  it("lists recent openers as shapes to avoid", () => {
    const p = buildSystemPrompt(CTX);
    expect(p).toContain("I did not want to");
    expect(p).toMatch(/do not (re)?use|avoid/i);
  });

  it("states the consumer lens", () => {
    expect(buildSystemPrompt(CTX)).toMatch(/something (you|they) can LIVE/i);
  });

  it("switches the invitation when the lens is creator", () => {
    const p = buildSystemPrompt({ ...CTX, lens: "creator" });
    expect(p).toMatch(/YOUR audience could LIVE/i);
  });
});

describe("buildUserMessage", () => {
  it("includes the raw notes", () => {
    expect(buildUserMessage(CTX)).toContain("trader joe's, guy teared up");
  });

  it("includes the real card text and where it came from", () => {
    const m = buildUserMessage(CTX);
    expect(m).toContain("Compliment a stranger");
    expect(m).toContain("Love Your Person");
    expect(m).toContain("Chapter 2");
  });

  it("omits the card section entirely when there is no card", () => {
    expect(buildUserMessage({ ...CTX, card: null })).not.toContain("Love Your Person");
  });
});

describe("anti-fabrication guardrails", () => {
  it("puts the invention ban inside the numbered prohibitions, not in trailing prose", () => {
    const p = buildSystemPrompt(CTX);
    const prohibitions = p.slice(p.indexOf("# Absolute prohibitions"), p.indexOf("# Call to action"));
    expect(prohibitions).toMatch(/invent|made up|did not say/i);
  });

  it("states the invention ban early, not buried at the end", () => {
    const p = buildSystemPrompt(CTX);
    const idx = p.search(/invent|did not say/i);
    expect(idx / p.length).toBeLessThan(0.75);
  });

  it("tells the model that ______ in an example is a blank for a real detail", () => {
    const withBlank = {
      ...CTX,
      series: { ...CTX.series, examples: ["Today's card told me to ______."] },
    };
    const p = buildSystemPrompt(withBlank);
    expect(p).toMatch(/______/);
    expect(p).toMatch(/blank|placeholder/i);
    expect(p).toMatch(/never fill it with|not in her notes|she did not say/i);
  });

  it("does not mention blanks when no example contains one", () => {
    const noBlank = { ...CTX, series: { ...CTX.series, examples: ["Did it anyway."] } };
    expect(buildSystemPrompt(noBlank)).not.toMatch(/is a blank/i);
  });
});
