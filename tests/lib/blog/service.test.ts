import { describe, it, expect, vi, beforeEach } from "vitest";

const strategyFindOne = vi.fn();
const blogFindOne = vi.fn();
const getTodaysCardCandidates = vi.fn();
const getDeckCatalogue = vi.fn();
const postFindById = vi.fn();
const generateOutline = vi.fn();
const generateArticle = vi.fn();

vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOne: strategyFindOne } }));
vi.mock("@/models/BlogProfile", () => ({ default: { findOne: blogFindOne } }));
vi.mock("@/models/BlogPost", () => ({ default: { findById: postFindById } }));
vi.mock("@/lib/wealthdaily/source", () => ({ getTodaysCardCandidates, getDeckCatalogue }));
vi.mock("@/lib/blog/generate", () => ({ generateOutline, generateArticle }));

describe("buildBlogContext", () => {
  beforeEach(() => {
    strategyFindOne.mockReset();
    blogFindOne.mockReset();
    getTodaysCardCandidates.mockReset();
    getDeckCatalogue.mockReset();
    getTodaysCardCandidates.mockResolvedValue([]);
    getDeckCatalogue.mockResolvedValue([]);
  });

  it("takes voice from the StrategyProfile and rules from the BlogProfile", async () => {
    strategyFindOne.mockReturnValue({
      lean: () => ({ enemy: "Passive consumption.", wordsSheNeverUses: ["quantum leap"] }),
    });
    blogFindOne.mockReturnValue({
      lean: () => ({
        siteUrl: "https://wealthdailyapp.com",
        targetWordCount: { min: 1200, max: 2000 },
        structureRules: ["r"],
        contentRules: ["c"],
        doNotList: ["d"],
      }),
    });

    const { buildBlogContext } = await import("@/lib/blog/service");
    const ctx = await buildBlogContext("a topic", "reader");

    expect(ctx.voice.enemy).toBe("Passive consumption.");
    expect(ctx.voice.wordsSheNeverUses).toEqual(["quantum leap"]);
    expect(ctx.rules.structureRules).toEqual(["r"]);
    expect(ctx.topic).toBe("a topic");
  });

  it("works with an empty catalogue rather than throwing", async () => {
    strategyFindOne.mockReturnValue({ lean: () => ({}) });
    blogFindOne.mockReturnValue({
      lean: () => ({ siteUrl: "", targetWordCount: { min: 1200, max: 2000 }, structureRules: [], contentRules: [], doNotList: [] }),
    });
    const { buildBlogContext } = await import("@/lib/blog/service");
    const ctx = await buildBlogContext("a topic", "reader");
    expect(ctx.cards).toEqual([]);
    expect(ctx.products).toEqual([]);
  });

  it("tells you to seed when the blog rules are missing", async () => {
    strategyFindOne.mockReturnValue({ lean: () => ({}) });
    blogFindOne.mockReturnValue({ lean: () => null });
    const { buildBlogContext } = await import("@/lib/blog/service");
    await expect(buildBlogContext("a topic", "reader")).rejects.toThrow("npm run seed");
  });
});

describe("draftPost", () => {
  const OUTLINE = [
    { heading: "Why nothing changes", level: 2, notes: "n" },
    { heading: "Do one thing", level: 2, notes: "n" },
  ];

  function makePost(overrides: Record<string, unknown> = {}) {
    return {
      topic: "a topic",
      audience: "reader",
      outline: OUTLINE,
      targetKeyword: "keyword",
      secondaryKeywords: [],
      searchIntent: "informational",
      titleOptions: ["Title"],
      chosenTitle: "Title",
      metaDescription: "meta",
      sourceRefs: [],
      internalLinks: [],
      status: "outlined",
      generations: [] as unknown[],
      save: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  beforeEach(() => {
    strategyFindOne.mockReset();
    blogFindOne.mockReset();
    getTodaysCardCandidates.mockReset().mockResolvedValue([]);
    getDeckCatalogue.mockReset().mockResolvedValue([]);
    postFindById.mockReset();
    generateArticle.mockReset();

    strategyFindOne.mockReturnValue({ lean: () => ({}) });
    blogFindOne.mockReturnValue({
      lean: () => ({
        siteUrl: "https://wealthdailyapp.com",
        targetWordCount: { min: 1200, max: 2000 },
        structureRules: [],
        contentRules: [],
        doNotList: [],
      }),
    });
  });

  it("saves the draft when every outline heading appears in the body", async () => {
    const post = makePost();
    postFindById.mockResolvedValue(post);
    generateArticle.mockResolvedValue({
      bodyMarkdown: "##   Why nothing changes\ntext here.\n## do one thing \nmore text.",
      wordCount: 500,
    });

    const { draftPost } = await import("@/lib/blog/service");
    const result = await draftPost("post1");

    expect(result.bodyMarkdown).toContain("Why nothing changes");
    expect(post.save).toHaveBeenCalledTimes(1);
    expect(post.status).toBe("drafted");
  });

  it("throws naming the missing heading and does not save", async () => {
    const post = makePost();
    postFindById.mockResolvedValue(post);
    generateArticle.mockResolvedValue({
      bodyMarkdown: "## Why nothing changes\nOnly this section is here.",
      wordCount: 500,
    });

    const { draftPost } = await import("@/lib/blog/service");
    await expect(draftPost("post1")).rejects.toThrow('"Do one thing"');
    expect(post.save).not.toHaveBeenCalled();
  });
});
