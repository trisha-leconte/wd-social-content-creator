import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlogContext, OutlineResult } from "@/lib/blog/prompt";

const parse = vi.fn();
const stream = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse, stream };
  },
}));

/** Mirrors the SDK: stream() returns a handle whose finalMessage() resolves. */
function streamReturning(parsed: unknown) {
  return { finalMessage: async () => ({ parsed_output: parsed }) };
}

const CTX: BlogContext = {
  voice: { enemy: "Passive consumption." },
  rules: {
    siteUrl: "https://wealthdailyapp.com",
    targetWordCount: { min: 1200, max: 2000 },
    structureRules: ["Answer the query in the first 100 words."],
    contentRules: ["Be concrete."],
    doNotList: ["NEVER write a statistic."],
  },
  topic: "how to apply what you read",
  audience: "reader",
  cards: [],
  products: [],
};

const OUTLINE: OutlineResult = {
  targetKeyword: "apply what you read",
  secondaryKeywords: [],
  searchIntent: "informational",
  titleOptions: ["A", "B", "C"],
  metaDescription: "m".repeat(150),
  outline: [
    { heading: "Why nothing changes", level: 2, notes: "n" },
    { heading: "Do one thing", level: 2, notes: "n" },
    { heading: "Collect proof", level: 2, notes: "n" },
  ],
  sourceRefs: [],
  internalLinks: [],
  estimatedWords: 1500,
};

describe("generateOutline", () => {
  beforeEach(() => {
    parse.mockReset();
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the parsed outline", async () => {
    parse.mockResolvedValue({ parsed_output: OUTLINE });
    const { generateOutline } = await import("@/lib/blog/generate");
    expect((await generateOutline(CTX)).titleOptions).toHaveLength(3);
  });

  it("uses the model and settings from the spec", async () => {
    parse.mockResolvedValue({ parsed_output: OUTLINE });
    const { generateOutline } = await import("@/lib/blog/generate");
    await generateOutline(CTX);
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5");
    expect(args.thinking).toEqual({ type: "adaptive" });
    expect(args.budget_tokens).toBeUndefined();
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws a clear error when nothing parses", async () => {
    parse.mockResolvedValue({ parsed_output: null });
    const { generateOutline } = await import("@/lib/blog/generate");
    await expect(generateOutline(CTX)).rejects.toThrow("outline");
  });

  it("throws a clear error when there is no API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { generateOutline } = await import("@/lib/blog/generate");
    await expect(generateOutline(CTX)).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});

describe("generateArticle", () => {
  beforeEach(() => {
    parse.mockReset();
    stream.mockReset();
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("STREAMS rather than using the non-streaming path", async () => {
    // The SDK throws "Streaming is required for operations that may take
    // longer than 10 minutes" when a non-streaming request asks for more than
    // 128000/6 ≈ 21333 max_tokens. An article needs the headroom, so this
    // call must stream. A non-streaming article call is a production outage.
    stream.mockReturnValue(streamReturning({ bodyMarkdown: "x".repeat(500), wordCount: 100 }));
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(parse).not.toHaveBeenCalled();
  });

  it("keeps max_tokens above the non-streaming ceiling, which only streaming allows", async () => {
    stream.mockReturnValue(streamReturning({ bodyMarkdown: "x".repeat(500), wordCount: 100 }));
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    expect(stream.mock.calls[0][0].max_tokens).toBeGreaterThan(21333);
  });

  it("carries the same model, thinking and cache settings as the outline call", async () => {
    stream.mockReturnValue(streamReturning({ bodyMarkdown: "x".repeat(500), wordCount: 100 }));
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    const args = stream.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5");
    expect(args.thinking).toEqual({ type: "adaptive" });
    expect(args.budget_tokens).toBeUndefined();
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("returns the markdown body", async () => {
    stream.mockReturnValue(streamReturning({ bodyMarkdown: "# x\n" + "word ".repeat(300), wordCount: 300 }));
    const { generateArticle } = await import("@/lib/blog/generate");
    expect((await generateArticle(CTX, OUTLINE)).wordCount).toBe(300);
  });

  it("sends the approved headings in the user message", async () => {
    stream.mockReturnValue(streamReturning({ bodyMarkdown: "x".repeat(500), wordCount: 100 }));
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    const content = stream.mock.calls[0][0].messages[0].content;
    expect(content).toContain("Why nothing changes");
    expect(content).toContain("Collect proof");
  });

  it("throws a clear error when the stream yields nothing parseable", async () => {
    stream.mockReturnValue(streamReturning(null));
    const { generateArticle } = await import("@/lib/blog/generate");
    await expect(generateArticle(CTX, OUTLINE)).rejects.toThrow("article");
  });
});
