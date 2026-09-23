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
