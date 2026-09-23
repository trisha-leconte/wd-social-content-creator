# SEO Blog Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second agent in the LIVE IT Engine that writes keyword-targeted blog drafts in Trisha's voice, grounded in her real Wealth Daily catalogue.

**Architecture:** Shares the existing belief profile, Wealth Daily source, auth and model patterns; replaces only the craft rules. Generation is two-stage — an outline she edits, then a draft written from the approved outline. The voice block is extracted from the social prompt into a shared module so one edit to her beliefs changes both agents.

**Tech Stack:** Next.js 15 · Mongoose 8 · `@anthropic-ai/sdk` 0.128 (`messages.parse` + `zodOutputFormat`) · zod 4 · Vitest 3

**Spec:** `docs/superpowers/specs/2026-09-23-seo-blog-agent-design.md`

## Global Constraints

- Model is exactly `claude-opus-5`, `thinking: { type: "adaptive" }`, never `budget_tokens`.
- Structured output via `client.messages.parse()` + `zodOutputFormat`. Never a hand-rolled tool definition.
- System prompt carries `cache_control: { type: "ephemeral" }`.
- No test touches the Anthropic API, MongoDB, or Postgres. Mock at the module boundary.
- Voice comes from `StrategyProfile` only. `BlogProfile` must never duplicate beliefs, vocabulary or the one story.
- Post statuses are exactly: `idea`, `outlined`, `drafted`, `ready`, `published`.
- Audiences are exactly: `reader`, `creator`, `book_searcher`.
- Search intents are exactly: `informational`, `commercial`, `navigational`.
- Every protected page calls `requireUserId()` from `@/lib/session`; every API route calls `currentUserId(request)`.
- Every screen must render with `WEALTH_DAILY_DATABASE_URL` unset.
- Commit after every task. Conventional prefixes (`feat:`, `test:`, `refactor:`).

---

## File Structure

```
src/
  lib/
    agent/
      voice.ts          renderVoice() — shared belief block      (extracted)
      prompt.ts         social prompt, now importing voice.ts    (modified)
    blog/
      slug.ts           title → slug                             (pure)
      rules.ts          blog craft rules, seeded                 (data)
      prompt.ts         outline + draft prompt assembly          (pure)
      schema.ts         zod contracts
      generate.ts       the two Anthropic calls
      ideas.ts          catalogue → article suggestions
      service.ts        create / outline / draft / list
  models/
    BlogPost.ts
    BlogProfile.ts
  app/
    blog/page.tsx  blog/[id]/page.tsx  blog/ideas/page.tsx
    api/blog/route.ts  api/blog/[id]/route.ts
  components/
    OutlineEditor.tsx  ArticleEditor.tsx
tests/ mirrors src/
```

---

### Task 1: Extract the shared voice block

The belief profile currently renders inside `src/lib/agent/prompt.ts` as a private `whoSheIs()`. Both agents need it, so it moves to its own module first.

**Files:**
- Create: `src/lib/agent/voice.ts`
- Modify: `src/lib/agent/prompt.ts`
- Test: `tests/lib/agent/voice.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `VoiceProfile` type and `renderVoice(profile: VoiceProfile): string` from `@/lib/agent/voice`

- [ ] **Step 1: Write the failing test**

`tests/lib/agent/voice.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderVoice, type VoiceProfile } from "@/lib/agent/voice";

const FULL: VoiceProfile = {
  whyItExists: "I built the thing I needed to start trusting myself again.",
  beliefs: ["Stop trying to convince yourself to believe. Build evidence."],
  enemy: "Passive consumption. Knowing without doing.",
  reader: "9pm on a bad Tuesday.",
  whyMine: "I stayed behind other people's brands.",
  wordsSheUses: ["Show up", "Proof"],
  wordsSheNeverUses: ["unlock your potential", "quantum leap"],
};

describe("renderVoice", () => {
  it("renders every section it is given", () => {
    const v = renderVoice(FULL);
    expect(v).toContain("I built the thing I needed");
    expect(v).toContain("Build evidence.");
    expect(v).toContain("Knowing without doing.");
    expect(v).toContain("9pm on a bad Tuesday");
    expect(v).toContain("behind other people's brands");
    expect(v).toContain("Show up · Proof");
    expect(v).toContain("unlock your potential · quantum leap");
  });

  it("returns an empty string when the profile is empty", () => {
    expect(renderVoice({})).toBe("");
  });

  it("omits absent sections without leaving blank gaps", () => {
    const v = renderVoice({ enemy: "Passive consumption." });
    expect(v).toContain("Passive consumption.");
    expect(v).not.toContain("# What she believes");
    expect(v).not.toMatch(/\n\n\n/);
  });

  it("puts why-it-exists before the vocabulary lists", () => {
    const v = renderVoice(FULL);
    expect(v.indexOf("Why this exists")).toBeLessThan(v.indexOf("Her vocabulary"));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/agent/voice.test.ts`
Expected: FAIL — cannot resolve `@/lib/agent/voice`.

- [ ] **Step 3: Write the module**

`src/lib/agent/voice.ts`:

```typescript
export type VoiceProfile = {
  whyItExists?: string;
  beliefs?: string[];
  enemy?: string;
  reader?: string;
  whyMine?: string;
  wordsSheUses?: string[];
  wordsSheNeverUses?: string[];
};

/**
 * Who Trisha is, before any rule about how to write. Shared by the social
 * and blog agents so one edit to her beliefs changes both. Every section is
 * optional and an absent one contributes nothing — no stray blank lines.
 */
export function renderVoice(p: VoiceProfile): string {
  const sections: string[] = [];

  if (p.whyItExists) sections.push(`# Why this exists at all\n${p.whyItExists}`);
  if (p.beliefs?.length)
    sections.push(`# What she believes\n${p.beliefs.map((b) => `- ${b}`).join("\n")}`);
  if (p.enemy) sections.push(`# What the movement is against\n${p.enemy}`);
  if (p.reader) sections.push(`# Who she is writing to\n${p.reader}`);
  if (p.whyMine) sections.push(`# Why this is hers to build\n${p.whyMine}`);
  if (p.wordsSheUses?.length)
    sections.push(`# Her vocabulary — reach for these\n${p.wordsSheUses.join(" · ")}`);
  if (p.wordsSheNeverUses?.length)
    sections.push(
      `# Never these — she closes the tab on them\n${p.wordsSheNeverUses.join(" · ")}`
    );

  return sections.join("\n\n");
}
```

- [ ] **Step 4: Point the social prompt at it**

In `src/lib/agent/prompt.ts`, delete the private `whoSheIs()` function entirely and replace its call site. Add at the top:

```typescript
import { renderVoice } from "./voice";
```

Replace `${whoSheIs(ctx)}` in the template with:

```typescript
${(() => {
  const v = renderVoice(ctx.profile);
  return v ? `\n${v}\n` : "";
})()}
```

- [ ] **Step 5: Run the whole suite to prove nothing regressed**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all existing tests still pass, including the social prompt's belief-profile tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: extract the shared voice block for both agents"
```

---

### Task 2: Slug generation

**Files:**
- Create: `src/lib/blog/slug.ts`
- Test: `tests/lib/blog/slug.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `slugify(title: string): string` from `@/lib/blog/slug`

- [ ] **Step 1: Write the failing test**

`tests/lib/blog/slug.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/slug.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/slug`.

- [ ] **Step 3: Write the implementation**

`src/lib/blog/slug.ts`:

```typescript
// Dropped so a slug reads as keywords rather than a sentence. Deliberately
// short — removing too much makes slugs ambiguous.
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how",
  "if", "in", "into", "is", "it", "of", "on", "or", "our", "that", "the",
  "their", "then", "there", "these", "this", "to", "was", "were", "will",
  "with", "your",
]);

const MAX_LENGTH = 60;

export function slugify(title: string): string {
  const words = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // fold accents
    .toLowerCase()
    .replace(/['’]/g, "") // don't -> dont, not don-t
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  let slug = "";
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > MAX_LENGTH) break;
    slug = next;
  }
  return slug;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/blog/slug.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add blog slug generation"
```

---

### Task 3: Blog craft rules and models

**Files:**
- Create: `src/lib/blog/rules.ts`, `src/models/BlogProfile.ts`, `src/models/BlogPost.ts`
- Modify: `scripts/seed.ts`
- Test: `tests/lib/blog/rules.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `BLOG_RULES` from `@/lib/blog/rules`; models `BlogProfile` (with `IBlogProfile`) and `BlogPost` (with `IBlogPost`, `BLOG_STATUSES`, `BLOG_AUDIENCES`, `SEARCH_INTENTS`)

- [ ] **Step 1: Write the failing test**

`tests/lib/blog/rules.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { BLOG_RULES } from "@/lib/blog/rules";

describe("blog craft rules", () => {
  it("bans fabricated statistics as the first prohibition", () => {
    expect(BLOG_RULES.doNotList[0]).toMatch(/statistic|study|percentage/i);
  });

  it("bans invented detail about her life", () => {
    expect(BLOG_RULES.doNotList.join(" ")).toMatch(/never say|did not say|invent/i);
  });

  it("bans the AI tells", () => {
    const joined = BLOG_RULES.doNotList.join(" ").toLowerCase();
    expect(joined).toContain("fast-paced world");
    expect(joined).toContain("dive in");
    expect(joined).toContain("in conclusion");
  });

  it("requires the query answered in the first hundred words", () => {
    expect(BLOG_RULES.structureRules.join(" ")).toMatch(/first 100 words/i);
  });

  it("carries no voice rules — those live on the StrategyProfile", () => {
    const all = JSON.stringify(BLOG_RULES).toLowerCase();
    expect(all).not.toContain("i spent years consuming");
    expect(all).not.toContain("unlock your potential");
  });

  it("sets a word count range rather than a single number", () => {
    expect(BLOG_RULES.targetWordCount.min).toBeGreaterThan(800);
    expect(BLOG_RULES.targetWordCount.max).toBeLessThanOrEqual(2500);
    expect(BLOG_RULES.targetWordCount.min).toBeLessThan(BLOG_RULES.targetWordCount.max);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/rules.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/rules`.

- [ ] **Step 3: Write the rules**

`src/lib/blog/rules.ts`:

```typescript
export const BLOG_RULES = {
  siteUrl: "https://wealthdailyapp.com",
  targetWordCount: { min: 1200, max: 2000 },

  structureRules: [
    "Answer the query in the first 100 words. No throat-clearing, no 'in this article we will explore'.",
    "Phrase every H2 as a question someone would actually type, not as a label.",
    "One idea per section. Someone skimming only the H2s should still get the answer.",
    "Never pad to hit a word count. If the topic is genuinely shorter, write it shorter.",
    "Close by resolving the question, then one call to action tied to a real deck or book.",
  ],

  contentRules: [
    "Follow every abstract claim with a concrete instance — ideally one of her real cards or exercises. That specificity is the thing Google cannot find anywhere else.",
    "Write from her point of view. A post with no opinion gets indexed and ignored.",
    "Link internally to real products by their real slug, but only where the link genuinely helps the reader.",
    "The target keyword belongs in the title, the first paragraph, one H2 and the meta description — and nowhere it does not read naturally.",
  ],

  doNotList: [
    "NEVER write a statistic, a percentage, a study, a survey or a named researcher. Not one. If a claim needs a number she has not supplied, make the claim qualitatively or leave it out. An invented '73% of readers' would damage her more than any missed ranking.",
    "NEVER write a detail about Trisha's life she did not say. No invented timeline, no invented job, no invented struggle.",
    "Never use AI tells: 'In today's fast-paced world', \"Let's dive in\", 'It's important to note', 'In conclusion', 'Moreover', 'Furthermore'.",
    "Never pad a list. No '10 ways' where only four are real.",
    "Never stuff the keyword. If a sentence exists to hold the keyword, delete the sentence.",
    "Never write a meta description that is a summary of the article. Write one that makes the answer sound worth reading.",
  ],
};
```

- [ ] **Step 4: Write the models**

`src/models/BlogProfile.ts`:

```typescript
import mongoose, { Schema, type Model } from "mongoose";

export interface IBlogProfile {
  singleton: string;
  siteUrl: string;
  targetWordCount: { min: number; max: number };
  structureRules: string[];
  contentRules: string[];
  doNotList: string[];
}

const BlogProfileSchema = new Schema<IBlogProfile>(
  {
    singleton: { type: String, default: "the-one", unique: true },
    siteUrl: String,
    targetWordCount: { min: Number, max: Number },
    structureRules: [String],
    contentRules: [String],
    doNotList: [String],
  },
  { timestamps: true }
);

export default (mongoose.models.BlogProfile as Model<IBlogProfile>) ||
  mongoose.model<IBlogProfile>("BlogProfile", BlogProfileSchema);
```

`src/models/BlogPost.ts`:

```typescript
import mongoose, { Schema, type Model } from "mongoose";

export const BLOG_STATUSES = ["idea", "outlined", "drafted", "ready", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const BLOG_AUDIENCES = ["reader", "creator", "book_searcher"] as const;
export type BlogAudience = (typeof BLOG_AUDIENCES)[number];

export const SEARCH_INTENTS = ["informational", "commercial", "navigational"] as const;
export type SearchIntent = (typeof SEARCH_INTENTS)[number];

export interface IOutlineItem {
  heading: string;
  level: number;
  notes: string;
}

export interface ISourceRef {
  kind: "card" | "product";
  title: string;
  detail: string;
}

export interface IInternalLink {
  label: string;
  url: string;
}

export interface IBlogPost {
  topic: string;
  audience: BlogAudience;
  targetKeyword?: string;
  secondaryKeywords?: string[];
  searchIntent?: SearchIntent;
  titleOptions?: string[];
  chosenTitle?: string;
  slug?: string;
  metaDescription?: string;
  outline?: IOutlineItem[];
  sourceRefs?: ISourceRef[];
  internalLinks?: IInternalLink[];
  bodyMarkdown?: string;
  wordCount?: number;
  status: BlogStatus;
  generations?: unknown[];
}

const OutlineItemSchema = new Schema<IOutlineItem>(
  { heading: String, level: Number, notes: String },
  { _id: false }
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    topic: { type: String, required: true },
    audience: { type: String, enum: BLOG_AUDIENCES, default: "reader" },
    targetKeyword: String,
    secondaryKeywords: [String],
    searchIntent: { type: String, enum: SEARCH_INTENTS },
    titleOptions: [String],
    chosenTitle: String,
    slug: String,
    metaDescription: String,
    outline: { type: [OutlineItemSchema], default: undefined },
    sourceRefs: { type: [new Schema<ISourceRef>({ kind: String, title: String, detail: String }, { _id: false })], default: undefined },
    internalLinks: { type: [new Schema<IInternalLink>({ label: String, url: String }, { _id: false })], default: undefined },
    bodyMarkdown: String,
    wordCount: Number,
    status: { type: String, enum: BLOG_STATUSES, default: "idea" },
    generations: { type: [Object], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.BlogPost as Model<IBlogPost>) ||
  mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
```

- [ ] **Step 5: Seed the blog profile**

In `scripts/seed.ts`, add these imports:

```typescript
import BlogProfile from "@/models/BlogProfile";
import { BLOG_RULES } from "@/lib/blog/rules";
```

and this line, immediately after the `StrategyProfile.updateOne(...)` call:

```typescript
  await BlogProfile.updateOne({ singleton: "the-one" }, BLOG_RULES, { upsert: true });
```

and extend the final `console.log` to mention it:

```typescript
  console.log(
    `Seeded ${BUCKETS.length} buckets, ${SERIES.length} series, ${WEEKLY_SLOTS.length} slots, ${STORY_PROMPTS.length} story prompts, and the blog rules.`
  );
```

- [ ] **Step 6: Run the tests and the seed**

Run: `npx vitest run tests/lib/blog/rules.test.ts && npx tsc --noEmit && npm run seed`
Expected: 6 tests pass, no type errors, seed prints the new line.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add blog craft rules and models"
```

---

### Task 4: Blog prompt assembly

The heart of the feature, and pure, so it is fully tested without the API.

**Files:**
- Create: `src/lib/blog/prompt.ts`
- Test: `tests/lib/blog/prompt.test.ts`

**Interfaces:**
- Consumes: `renderVoice`, `VoiceProfile` from `@/lib/agent/voice`; `CardCandidate` from `@/types`
- Produces from `@/lib/blog/prompt`: `BlogContext` type, `buildOutlinePrompt(ctx)`, `buildOutlineMessage(ctx)`, `buildDraftPrompt(ctx)`, `buildDraftMessage(ctx, outline)`

- [ ] **Step 1: Write the failing test**

`tests/lib/blog/prompt.test.ts`:

```typescript
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
  products: [{ productId: "p1", title: "The Science of Getting Rich", cardCount: 84 }],
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/prompt.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/prompt`.

- [ ] **Step 3: Write the prompt builder**

`src/lib/blog/prompt.ts`:

```typescript
import { renderVoice, type VoiceProfile } from "@/lib/agent/voice";
import type { CardCandidate } from "@/types";
import type { BlogAudience } from "@/models/BlogPost";

export type BlogRules = {
  siteUrl: string;
  targetWordCount: { min: number; max: number };
  structureRules: string[];
  contentRules: string[];
  doNotList: string[];
};

export type BlogContext = {
  voice: VoiceProfile;
  rules: BlogRules;
  topic: string;
  audience: BlogAudience;
  cards: CardCandidate[];
  products: { productId: string; title: string; cardCount: number }[];
};

export type OutlineResult = {
  targetKeyword: string;
  secondaryKeywords: string[];
  searchIntent: "informational" | "commercial" | "navigational";
  titleOptions: string[];
  metaDescription: string;
  outline: { heading: string; level: number; notes: string }[];
  sourceRefs: { kind: "card" | "product"; title: string; detail: string }[];
  internalLinks: { label: string; url: string }[];
  estimatedWords: number;
};

const AUDIENCE_LINE: Record<BlogAudience, string> = {
  reader:
    "Someone who reads personal development and wants it to actually change something. They are the 9pm-on-a-bad-Tuesday person.",
  creator:
    "An author or coach wondering what could be built from their own book. Never switch into corporate B2B register to reach them.",
  book_searcher:
    "Someone searching for a specific book — a summary, the exercises, how to actually use it. Give them the real exercises, not a recap.",
};

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

/** Shared by both stages so voice and prohibitions cannot drift between them. */
function foundation(ctx: BlogContext): string {
  const voice = renderVoice(ctx.voice);
  return `You write blog posts as Trisha, who is building Wealth Daily.

${voice}

# Who this post is for
${AUDIENCE_LINE[ctx.audience]}

# How a blog post is built
${numbered(ctx.rules.structureRules)}

# What goes in it
${numbered(ctx.rules.contentRules)}

# Absolute prohibitions — breaking any of these makes the post unusable
${numbered(ctx.rules.doNotList)}

# Length
${ctx.rules.targetWordCount.min}–${ctx.rules.targetWordCount.max} words, unless the topic is honestly shorter.`;
}

export function buildOutlinePrompt(ctx: BlogContext): string {
  return `${foundation(ctx)}

# This step: the outline only. Do not write the article.
Decide what this post targets and how it is shaped. Give three title options, a meta description of 150 to 160 characters, and an outline of at least three H2 sections. Name which of her real cards or books each section should cite. Suggest internal links only where they genuinely help.

There is no keyword tool. Choose the target keyword from what a real person would type, and say honestly what you think the search intent is.`;
}

export function buildOutlineMessage(ctx: BlogContext): string {
  const cards = ctx.cards.length
    ? `Real cards she can cite:\n${ctx.cards
        .slice(0, 30)
        .map((c) => `- "${c.text}" — ${c.productTitle}${c.chapterTitle ? ` · ${c.chapterTitle}` : ""}`)
        .join("\n")}`
    : "";

  const products = ctx.products.length
    ? `Her books and decks:\n${ctx.products
        .map((p) => `- ${p.title} (${p.cardCount} cards)`)
        .join("\n")}`
    : "";

  const catalogue =
    cards || products
      ? [cards, products].filter(Boolean).join("\n\n")
      : "Her catalogue is not connected right now, so there is nothing real to cite. Write the outline without citing specific cards, and do not invent any.";

  return `Topic: ${ctx.topic}

${catalogue}`;
}

export function buildDraftPrompt(ctx: BlogContext): string {
  return `${foundation(ctx)}

# This step: write the article
Write it as Markdown. Use the approved headings exactly as given — same wording, same order, same levels. Do not add headings of your own and do not drop any.

Do not repeat the title as an H1; the page renders it separately. Start with the opening paragraph that answers the query.`;
}

export function buildDraftMessage(ctx: BlogContext, outline: OutlineResult): string {
  const headings = outline.outline
    .map((o) => `${"#".repeat(o.level)} ${o.heading}\n   → ${o.notes}`)
    .join("\n");

  const sources = outline.sourceRefs.length
    ? `\n\nCite these, and nothing you cannot see here:\n${outline.sourceRefs
        .map((s) => `- ${s.title} (${s.detail})`)
        .join("\n")}`
    : "";

  const links = outline.internalLinks.length
    ? `\n\nInternal links to place where they help:\n${outline.internalLinks
        .map((l) => `- [${l.label}](${l.url})`)
        .join("\n")}`
    : "";

  return `Title: ${outline.titleOptions[0]}
Target keyword: ${outline.targetKeyword}
Meta description: ${outline.metaDescription}
Search intent: ${outline.searchIntent}

Use exactly these headings, in this order. Do not add any:
${headings}${sources}${links}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/blog/prompt.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: assemble the blog outline and draft prompts"
```

---

### Task 5: Blog schemas and generation

**Files:**
- Create: `src/lib/blog/schema.ts`, `src/lib/blog/generate.ts`
- Test: `tests/lib/blog/generate.test.ts`

**Interfaces:**
- Consumes: `BlogContext`, `OutlineResult`, the four prompt builders from `@/lib/blog/prompt`
- Produces: `OutlineSchema`, `ArticleSchema`, `Article` from `@/lib/blog/schema`; `generateOutline(ctx)`, `generateArticle(ctx, outline)` from `@/lib/blog/generate`

- [ ] **Step 1: Write the schemas**

`src/lib/blog/schema.ts`:

```typescript
import { z } from "zod";
import { SEARCH_INTENTS } from "@/models/BlogPost";

export const OutlineSchema = z.object({
  targetKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string()),
  searchIntent: z.enum(SEARCH_INTENTS),
  titleOptions: z.array(z.string()).length(3),
  // Google truncates around 160; under 120 wastes the slot.
  metaDescription: z.string().min(120).max(165),
  outline: z
    .array(
      z.object({
        heading: z.string().min(3),
        level: z.union([z.literal(2), z.literal(3)]),
        notes: z.string(),
      })
    )
    .min(3),
  sourceRefs: z.array(
    z.object({ kind: z.enum(["card", "product"]), title: z.string(), detail: z.string() })
  ),
  internalLinks: z.array(z.object({ label: z.string(), url: z.string() })),
  estimatedWords: z.number().int().positive(),
});

export const ArticleSchema = z.object({
  bodyMarkdown: z.string().min(400),
  wordCount: z.number().int().positive(),
});

export type Article = z.infer<typeof ArticleSchema>;
```

- [ ] **Step 2: Write the failing test**

`tests/lib/blog/generate.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlogContext, OutlineResult } from "@/lib/blog/prompt";

const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse };
  },
}));

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
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns the markdown body", async () => {
    parse.mockResolvedValue({ parsed_output: { bodyMarkdown: "# x\n" + "word ".repeat(300), wordCount: 300 } });
    const { generateArticle } = await import("@/lib/blog/generate");
    expect((await generateArticle(CTX, OUTLINE)).wordCount).toBe(300);
  });

  it("sends the approved headings in the user message", async () => {
    parse.mockResolvedValue({ parsed_output: { bodyMarkdown: "x".repeat(500), wordCount: 100 } });
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    const content = parse.mock.calls[0][0].messages[0].content;
    expect(content).toContain("Why nothing changes");
    expect(content).toContain("Collect proof");
  });

  it("streams is not required, but max_tokens is large enough for 2000 words", async () => {
    parse.mockResolvedValue({ parsed_output: { bodyMarkdown: "x".repeat(500), wordCount: 100 } });
    const { generateArticle } = await import("@/lib/blog/generate");
    await generateArticle(CTX, OUTLINE);
    expect(parse.mock.calls[0][0].max_tokens).toBeGreaterThanOrEqual(16000);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/generate.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/generate`.

- [ ] **Step 4: Write the generator**

`src/lib/blog/generate.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  buildOutlinePrompt,
  buildOutlineMessage,
  buildDraftPrompt,
  buildDraftMessage,
  type BlogContext,
  type OutlineResult,
} from "./prompt";
import { ArticleSchema, OutlineSchema, type Article } from "./schema";

const MODEL = "claude-opus-5";

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

export async function generateOutline(ctx: BlogContext): Promise<OutlineResult> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: buildOutlinePrompt(ctx), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildOutlineMessage(ctx) }],
    output_config: { format: zodOutputFormat(OutlineSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into an outline. Try again.");
  }
  return response.parsed_output as OutlineResult;
}

export async function generateArticle(
  ctx: BlogContext,
  outline: OutlineResult
): Promise<Article> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: buildDraftPrompt(ctx), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildDraftMessage(ctx, outline) }],
    output_config: { format: zodOutputFormat(ArticleSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("The model's response could not be parsed into an article. Try again.");
  }
  return response.parsed_output;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/lib/blog/generate.test.ts && npx tsc --noEmit`
Expected: PASS, 7 tests, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add blog outline and article generation"
```

---

### Task 6: Idea mining from the catalogue

**Files:**
- Create: `src/lib/blog/ideas.ts`
- Test: `tests/lib/blog/ideas.test.ts`

**Interfaces:**
- Consumes: `Deck` from `@/lib/wealthdaily/source`
- Produces: `BlogIdea` type and `mineIdeas(decks: Deck[]): BlogIdea[]` from `@/lib/blog/ideas`

- [ ] **Step 1: Write the failing test**

`tests/lib/blog/ideas.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/ideas.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/ideas`.

- [ ] **Step 3: Write the miner**

`src/lib/blog/ideas.ts`:

```typescript
import type { Deck } from "@/lib/wealthdaily/source";
import type { BlogAudience } from "@/models/BlogPost";

export type BlogIdea = {
  productId: string;
  topic: string;
  audience: BlogAudience;
  why: string;
};

/**
 * There is no keyword tool, so the idea source is the catalogue itself.
 * These angles map to searches people demonstrably make about books —
 * summaries, exercises, whether it is worth reading — and Trisha is one of
 * very few people who can answer them with the actual exercises.
 */
const ANGLES: {
  topic: (title: string) => string;
  audience: BlogAudience;
  why: (d: Deck) => string;
}[] = [
  {
    topic: (t) => `${t}: a summary that ends with something to do`,
    audience: "book_searcher",
    why: (d) =>
      `People search for summaries of ${d.title} constantly. Almost every result recaps it. You have ${d.cardCount} real exercises to end on instead.`,
  },
  {
    topic: (t) => `The exercises in ${t}, and what happens when you actually do them`,
    audience: "book_searcher",
    why: (d) =>
      `Nobody ranking for ${d.title} has the exercises. You have ${d.cardCount} of them, already written.`,
  },
  {
    topic: (t) => `What changed when I spent 30 days practising ${t}`,
    audience: "reader",
    why: (d) => `Your own evidence from ${d.title}. First-hand, which no summary site can copy.`,
  },
  {
    topic: (t) => `How I turned ${t} into a daily practice`,
    audience: "creator",
    why: (d) =>
      `Shows authors exactly what you do with a book. ${d.title} is a worked example they can picture their own book inside.`,
  },
];

export function mineIdeas(decks: Deck[]): BlogIdea[] {
  return decks
    .filter((d) => d.cardCount > 0)
    .flatMap((d) =>
      ANGLES.map((a) => ({
        productId: d.productId,
        topic: a.topic(d.title),
        audience: a.audience,
        why: a.why(d),
      }))
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/blog/ideas.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mine blog ideas from the real catalogue"
```

---

### Task 7: Blog service and API

**Files:**
- Create: `src/lib/blog/service.ts`, `src/app/api/blog/route.ts`, `src/app/api/blog/[id]/route.ts`
- Test: `tests/lib/blog/service.test.ts`

**Interfaces:**
- Consumes: models, `generateOutline`, `generateArticle`, `slugify`
- Produces from `@/lib/blog/service`: `buildBlogContext(topic, audience)`, `outlinePost(postId)`, `draftPost(postId)`

- [ ] **Step 1: Write the failing test**

`tests/lib/blog/service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const strategyFindOne = vi.fn();
const blogFindOne = vi.fn();
const getTodaysCardCandidates = vi.fn();
const getDeckCatalogue = vi.fn();

vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOne: strategyFindOne } }));
vi.mock("@/models/BlogProfile", () => ({ default: { findOne: blogFindOne } }));
vi.mock("@/lib/wealthdaily/source", () => ({ getTodaysCardCandidates, getDeckCatalogue }));

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/lib/blog/service.test.ts`
Expected: FAIL — cannot resolve `@/lib/blog/service`.

- [ ] **Step 3: Write the service**

`src/lib/blog/service.ts`:

```typescript
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import BlogProfile from "@/models/BlogProfile";
import StrategyProfile from "@/models/StrategyProfile";
import { getDeckCatalogue, getTodaysCardCandidates } from "@/lib/wealthdaily/source";
import { generateArticle, generateOutline } from "./generate";
import { slugify } from "./slug";
import type { BlogContext } from "./prompt";
import type { BlogAudience } from "@/models/BlogPost";

export async function buildBlogContext(
  topic: string,
  audience: BlogAudience
): Promise<BlogContext> {
  await dbConnect();

  const strategy = await StrategyProfile.findOne({ singleton: "the-one" }).lean();
  const rules = await BlogProfile.findOne({ singleton: "the-one" }).lean();
  if (!rules) throw new Error("The blog rules have not been seeded yet. Run: npm run seed");

  const [cards, products] = await Promise.all([getTodaysCardCandidates(30), getDeckCatalogue()]);

  return {
    voice: {
      whyItExists: strategy?.whyItExists,
      beliefs: strategy?.beliefs,
      enemy: strategy?.enemy,
      reader: strategy?.reader,
      whyMine: strategy?.whyMine,
      wordsSheUses: strategy?.wordsSheUses,
      wordsSheNeverUses: strategy?.wordsSheNeverUses,
    },
    rules: {
      siteUrl: rules.siteUrl,
      targetWordCount: rules.targetWordCount,
      structureRules: rules.structureRules ?? [],
      contentRules: rules.contentRules ?? [],
      doNotList: rules.doNotList ?? [],
    },
    topic,
    audience,
    cards,
    products,
  };
}

export async function outlinePost(postId: string) {
  await dbConnect();
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("That post no longer exists.");

  const ctx = await buildBlogContext(post.topic, post.audience);
  const outline = await generateOutline(ctx);

  post.targetKeyword = outline.targetKeyword;
  post.secondaryKeywords = outline.secondaryKeywords;
  post.searchIntent = outline.searchIntent;
  post.titleOptions = outline.titleOptions;
  post.chosenTitle = post.chosenTitle ?? outline.titleOptions[0];
  post.slug = slugify(post.chosenTitle);
  post.metaDescription = outline.metaDescription;
  post.outline = outline.outline;
  post.sourceRefs = outline.sourceRefs;
  post.internalLinks = outline.internalLinks;
  post.generations?.push({ stage: "outline", at: new Date(), outline });
  if (post.status === "idea") post.status = "outlined";
  await post.save();

  return post;
}

export async function draftPost(postId: string) {
  await dbConnect();
  const post = await BlogPost.findById(postId);
  if (!post) throw new Error("That post no longer exists.");
  if (!post.outline?.length) throw new Error("Write the outline first.");

  const ctx = await buildBlogContext(post.topic, post.audience);
  const article = await generateArticle(ctx, {
    targetKeyword: post.targetKeyword ?? "",
    secondaryKeywords: post.secondaryKeywords ?? [],
    searchIntent: post.searchIntent ?? "informational",
    titleOptions: [post.chosenTitle ?? post.titleOptions?.[0] ?? post.topic],
    metaDescription: post.metaDescription ?? "",
    outline: post.outline,
    sourceRefs: post.sourceRefs ?? [],
    internalLinks: post.internalLinks ?? [],
    estimatedWords: ctx.rules.targetWordCount.min,
  });

  post.bodyMarkdown = article.bodyMarkdown;
  post.wordCount = article.wordCount;
  post.generations?.push({ stage: "draft", at: new Date(), wordCount: article.wordCount });
  if (post.status === "outlined") post.status = "drafted";
  await post.save();

  return post;
}
```

- [ ] **Step 4: Write the API routes**

`src/app/api/blog/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const { topic, audience } = await request.json();
  if (!String(topic ?? "").trim()) {
    return NextResponse.json({ error: "Give it a topic to write about." }, { status: 400 });
  }

  const post = await BlogPost.create({
    topic: String(topic).trim(),
    audience: audience ?? "reader",
    status: "idea",
  });
  return NextResponse.json({ post }, { status: 201 });
}
```

`src/app/api/blog/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { draftPost, outlinePost } from "@/lib/blog/service";
import { slugify } from "@/lib/blog/slug";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "outline") return NextResponse.json({ post: await outlinePost(id) });
    if (body.action === "draft") return NextResponse.json({ post: await draftPost(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await dbConnect();
  const allowed = ["chosenTitle", "metaDescription", "outline", "bodyMarkdown", "status", "audience", "targetKeyword"] as const;
  const update: Record<string, unknown> = Object.fromEntries(
    allowed.filter((k) => k in body).map((k) => [k, body[k]])
  );
  if (typeof body.chosenTitle === "string") update.slug = slugify(body.chosenTitle);

  return NextResponse.json({ post: await BlogPost.findByIdAndUpdate(id, update, { new: true }) });
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add blog service and API routes"
```

---

### Task 8: The blog screens

**Files:**
- Create: `src/app/blog/page.tsx`, `src/app/blog/[id]/page.tsx`, `src/app/blog/ideas/page.tsx`, `src/components/BlogComposer.tsx`
- Modify: `src/app/page.tsx` (add `blog` to the nav array)
- Test: none beyond the suite — UI over tested logic, verified in the browser.

**Interfaces:**
- Consumes: `/api/blog`, `/api/blog/[id]`, `mineIdeas`, `getDeckCatalogue`, `isConnected`
- Produces: nothing other tasks consume.

- [ ] **Step 1: Write the composer**

`src/components/BlogComposer.tsx`:

```tsx
"use client";

import { useState } from "react";

type OutlineItem = { heading: string; level: number; notes: string };
type Post = {
  _id: string;
  topic: string;
  status: string;
  targetKeyword?: string;
  searchIntent?: string;
  titleOptions?: string[];
  chosenTitle?: string;
  slug?: string;
  metaDescription?: string;
  outline?: OutlineItem[];
  sourceRefs?: { title: string; detail: string }[];
  bodyMarkdown?: string;
  wordCount?: number;
};

export function BlogComposer({ initial }: { initial: Post }) {
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState<null | "outline" | "draft">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "outline" | "draft") {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/blog/${post._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    const body = await res.json();
    if (!res.ok) return setError(body.error);
    setPost(body.post);
  }

  async function save(patch: Partial<Post>) {
    const res = await fetch(`/api/blog/${post._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (res.ok) setPost(body.post);
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => run("outline")}
        disabled={busy !== null}
        className="self-start rounded bg-living px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy === "outline" ? "Thinking…" : post.outline?.length ? "Outline it again" : "Outline it"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {post.outline?.length ? (
        <>
          <section className="rounded border border-stone-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-widest text-stone-500">Targeting</p>
            <p className="mt-1">
              <strong>{post.targetKeyword}</strong>{" "}
              <span className="text-stone-500">· {post.searchIntent}</span>
            </p>
            <p className="mt-2 text-xs text-stone-500">
              No search volume — there is no keyword tool connected. This is the agent&apos;s judgement.
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Title</p>
            <div className="mt-2 flex flex-col gap-2">
              {post.titleOptions?.map((t) => (
                <button
                  key={t}
                  onClick={() => save({ chosenTitle: t })}
                  className={`rounded border p-3 text-left text-sm ${
                    post.chosenTitle === t ? "border-living bg-green-50" : "border-stone-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">/{post.slug}</p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Meta description ({post.metaDescription?.length ?? 0} chars)
            </p>
            <textarea
              defaultValue={post.metaDescription}
              onBlur={(e) => save({ metaDescription: e.target.value })}
              rows={3}
              className="mt-2 w-full rounded border border-stone-300 p-3 text-sm"
            />
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Outline</p>
            <ul className="mt-2 flex flex-col gap-2">
              {post.outline.map((o, i) => (
                <li key={i} className={`text-sm ${o.level === 3 ? "ml-5" : ""}`}>
                  <strong>{o.heading}</strong>
                  <span className="block text-xs text-stone-500">{o.notes}</span>
                </li>
              ))}
            </ul>
          </section>

          {post.sourceRefs?.length ? (
            <section className="rounded bg-stone-100 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-stone-500">Citing your real content</p>
              <ul className="mt-1">
                {post.sourceRefs.map((s, i) => (
                  <li key={i}>
                    {s.title} <span className="text-stone-500">— {s.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <button
            onClick={() => run("draft")}
            disabled={busy !== null}
            className="self-start rounded bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy === "draft" ? "Writing…" : post.bodyMarkdown ? "Write it again" : "Write the article"}
          </button>
        </>
      ) : null}

      {post.bodyMarkdown ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Draft ({post.wordCount} words)
          </p>
          <textarea
            defaultValue={post.bodyMarkdown}
            onBlur={(e) => save({ bodyMarkdown: e.target.value })}
            rows={28}
            className="mt-2 w-full rounded border border-stone-300 p-3 font-mono text-xs"
          />
        </section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Write the three pages**

`src/app/blog/page.tsx`:

```tsx
import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  await requireUserId();
  await dbConnect();
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Blog</h1>
      <p className="mb-8 text-sm text-stone-500">
        Drafts you copy out. <Link href="/blog/ideas" className="text-living underline">Ideas from your catalogue →</Link>
      </p>

      <form action="/blog/new" className="mb-8 flex gap-2">
        <input
          name="topic"
          placeholder="What should it be about?"
          required
          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-living px-4 py-2 text-sm font-medium text-white">Start</button>
      </form>

      {posts.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-sm text-stone-500">
          Nothing yet. Type a topic above, or take one from your catalogue.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded border border-stone-200">
          {posts.map((p) => (
            <li key={String(p._id)} className="p-3">
              <Link href={`/blog/${String(p._id)}`} className="text-sm hover:underline">
                <span className="mr-2 text-xs uppercase tracking-wider text-stone-500">{p.status}</span>
                {p.chosenTitle ?? p.topic}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

`src/app/blog/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import type { BlogAudience } from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function NewBlogPost({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; audience?: string }>;
}) {
  await requireUserId();
  const { topic, audience } = await searchParams;
  if (!topic?.trim()) redirect("/blog");

  await dbConnect();
  const post = await BlogPost.create({
    topic: topic.trim(),
    audience: (audience as BlogAudience) ?? "reader",
    status: "idea",
  });
  redirect(`/blog/${String(post._id)}`);
}
```

`src/app/blog/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { BlogComposer } from "@/components/BlogComposer";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  await dbConnect();
  const post = await BlogPost.findById(id).lean();
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/blog" className="text-sm text-stone-500 hover:underline">← Blog</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{post.chosenTitle ?? post.topic}</h1>
      <p className="mb-8 text-sm text-stone-500">{post.audience.replace("_", " ")}</p>
      <BlogComposer initial={JSON.parse(JSON.stringify({ ...post, _id: String(post._id) }))} />
    </main>
  );
}
```

`src/app/blog/ideas/page.tsx`:

```tsx
import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getDeckCatalogue } from "@/lib/wealthdaily/source";
import { isConnected } from "@/lib/wealthdaily/client";
import { mineIdeas } from "@/lib/blog/ideas";

export const dynamic = "force-dynamic";

export default async function BlogIdeasPage() {
  await requireUserId();
  const ideas = mineIdeas(await getDeckCatalogue());

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/blog" className="text-sm text-stone-500 hover:underline">← Blog</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Ideas from your catalogue</h1>
      <p className="mb-2 text-sm text-stone-500">
        Articles only you can write, because you have the actual exercises.
      </p>
      <p className="mb-8 text-xs text-stone-500">
        No search volume behind these — there&apos;s no keyword tool connected. They come from what
        you&apos;ve made.
      </p>

      {!isConnected() && (
        <p className="mb-6 rounded border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Wealth Daily isn&apos;t connected, so there&apos;s no catalogue to mine. Set
          WEALTH_DAILY_DATABASE_URL, or type a topic on the Blog screen.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {ideas.map((idea, i) => (
          <li key={i} className="rounded border border-stone-200 p-4">
            <p className="font-medium">{idea.topic}</p>
            <p className="mt-1 text-xs text-stone-500">{idea.why}</p>
            <Link
              href={`/blog/new?topic=${encodeURIComponent(idea.topic)}&audience=${idea.audience}`}
              className="mt-3 inline-block text-sm font-medium text-living underline"
            >
              Write this one
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Add blog to the Today nav**

In `src/app/page.tsx`, change the nav array from:

```tsx
{["captured", "proof", "coverage", "library", "calendar", "strategy"].map((r) => (
```

to:

```tsx
{["captured", "blog", "proof", "coverage", "library", "calendar", "strategy"].map((r) => (
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, then sign in and visit `/blog/ideas`.
Expected: at least five ideas naming real books. Click "Write this one", press "Outline it", confirm the outline cites a real card. Press "Write the article", confirm the H2s match the outline exactly and no statistic appears.

- [ ] **Step 5: Run the suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add the blog screens"
```

---

### Task 9: Blog rules on the Strategy screen, and deploy

**Files:**
- Modify: `src/app/strategy/page.tsx`, `src/app/api/strategy/route.ts`
- Test: `tests/api/strategy-blog.test.ts`

**Interfaces:**
- Consumes: `BlogProfile`, `EditableList`
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

`tests/api/strategy-blog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const findOneAndUpdate = vi.fn();
vi.mock("@/lib/db", () => ({ dbConnect: vi.fn().mockResolvedValue(null) }));
vi.mock("@/models/StrategyProfile", () => ({ default: { findOneAndUpdate: vi.fn() } }));
vi.mock("@/models/BlogProfile", () => ({ default: { findOneAndUpdate } }));
vi.mock("@/lib/auth", () => ({ currentUserId: () => "u1" }));

describe("PATCH /api/strategy with blog fields", () => {
  beforeEach(() => findOneAndUpdate.mockReset());

  it("routes blog rule fields to the BlogProfile", async () => {
    findOneAndUpdate.mockResolvedValue({ structureRules: ["x"] });
    const { PATCH } = await import("@/app/api/strategy/route");
    const res = await PATCH(
      new Request("http://x/api/strategy", {
        method: "PATCH",
        body: JSON.stringify({ blog: { structureRules: ["x"], doNotList: ["y"] } }),
      })
    );
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { singleton: "the-one" },
      expect.objectContaining({ structureRules: ["x"], doNotList: ["y"] }),
      expect.anything()
    );
  });

  it("ignores blog fields that are not editable rules", async () => {
    findOneAndUpdate.mockResolvedValue({});
    const { PATCH } = await import("@/app/api/strategy/route");
    await PATCH(
      new Request("http://x/api/strategy", {
        method: "PATCH",
        body: JSON.stringify({ blog: { siteUrl: "http://evil", structureRules: ["x"] } }),
      })
    );
    const sent = findOneAndUpdate.mock.calls[0][1];
    expect(sent.siteUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/api/strategy-blog.test.ts`
Expected: FAIL — the route does not handle `blog`.

- [ ] **Step 3: Extend the strategy route**

In `src/app/api/strategy/route.ts`, add the import:

```typescript
import BlogProfile from "@/models/BlogProfile";
```

and insert this block inside `PATCH`, immediately after `const body = await request.json();`:

```typescript
  if (body.blog) {
    const blogAllowed = ["structureRules", "contentRules", "doNotList"] as const;
    const blogUpdate = Object.fromEntries(
      blogAllowed.filter((k) => k in body.blog).map((k) => [k, body.blog[k]])
    );
    const blog = await BlogProfile.findOneAndUpdate({ singleton: "the-one" }, blogUpdate, {
      new: true,
    });
    return NextResponse.json({ blog });
  }
```

- [ ] **Step 4: Add the section to the Strategy screen**

In `src/app/strategy/page.tsx`, add the import:

```typescript
import BlogProfile from "@/models/BlogProfile";
```

change the profile fetch to also load the blog rules:

```typescript
  const [profile, blog] = await Promise.all([
    StrategyProfile.findOne({ singleton: "the-one" }).lean(),
    BlogProfile.findOne({ singleton: "the-one" }).lean(),
  ]);
```

and add this at the end of the returned JSX, just before `</main>`:

```tsx
      <h2 className="mb-4 mt-12 border-t border-stone-200 pt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">
        Blog rules
      </h2>
      <p className="mb-6 text-sm text-stone-500">
        These shape articles, not captions. Your voice above is shared by both.
      </p>
      <EditableList label="How a post is built" field="blog.structureRules" initial={blog?.structureRules ?? []} />
      <EditableList label="What goes in it" field="blog.contentRules" initial={blog?.contentRules ?? []} />
      <EditableList label="Never in an article" field="blog.doNotList" initial={blog?.doNotList ?? []} />
```

- [ ] **Step 5: Teach EditableList to send nested fields**

In `src/components/EditableList.tsx`, replace the body of `save()` with:

```typescript
  async function save() {
    setState("saving");
    const value = lines.split("\n").map((l) => l.trim()).filter(Boolean);
    // "blog.structureRules" becomes { blog: { structureRules: [...] } } so one
    // endpoint can serve both profiles.
    const [head, tail] = field.split(".");
    const payload = tail ? { [head]: { [tail]: value } } : { [head]: value };
    await fetch("/api/strategy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setState("saved");
  }
```

- [ ] **Step 6: Run everything and verify in the browser**

Run: `npx vitest run && npx tsc --noEmit`, then `npm run dev` and open `/strategy`.
Expected: all tests pass; the Blog rules section appears, edits save, and the existing voice lists still save correctly.

- [ ] **Step 7: Walk the spec's success criteria**

Confirm each of the six criteria in spec §11:

1. A topic typed into `/blog` returns an outline naming a real card or product.
2. An approved outline produces a draft whose H2s match it.
3. No draft contains a statistic, study, or named researcher.
4. No draft contains a phrase from `wordsSheNeverUses`.
5. `/blog/ideas` proposes at least five articles from real products.
6. Comment out `WEALTH_DAILY_DATABASE_URL`, restart, and confirm `/blog`, `/blog/ideas` and the composer all still render.

- [ ] **Step 8: Commit and deploy**

```bash
git add -A
git commit -m "feat: edit blog rules from the Strategy screen"
git push origin main
npx vercel --prod --yes
```

---

## Self-Review

**Spec coverage.** §3 catalogue-as-keyword-source → Task 6. §4 craft rules → Task 3 (seeded) and Task 4 (rendered). §5 two stages → Tasks 4, 5, 7. §6 reuse → Task 1 extracts the shared voice; Tasks 5 and 7 reuse the generate and service patterns. §7 data model → Task 3. §8 screens → Tasks 8 and 9. §9 out-of-scope items appear in no task, correctly. §10 testing → every listed test exists. §11 success criteria → Task 9 Step 7. §12 the stated limitation → surfaced in the UI in Task 8 (`/blog/ideas` and the composer's targeting panel). No gap found.

**Placeholders.** None. Every code step carries real content.

**Type consistency.** `VoiceProfile` is defined in Task 1 and consumed in Tasks 4 and 7. `BlogContext` and `OutlineResult` are defined in Task 4 and consumed in Tasks 5 and 7. `BlogAudience`, `BlogStatus` and `SEARCH_INTENTS` are defined in Task 3 and used in Tasks 4, 5, 6 and 7. `Deck` comes from the existing `@/lib/wealthdaily/source`. `slugify` is defined in Task 2 and used in Task 7. `mineIdeas` is defined in Task 6 and used in Task 8. `buildBlogContext` keeps one signature across Tasks 7 and its callers.

**One thing worth flagging to the reviewer:** Task 9 changes `EditableList`, which the existing voice lists already use. Its Step 6 explicitly re-verifies that the old lists still save, because a regression there would silently break the social agent's editing rather than the blog's.
