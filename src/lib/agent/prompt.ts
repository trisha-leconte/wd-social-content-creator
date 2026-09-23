import { nextCta, recentOpeners } from "@/lib/rotation";
import type { BucketKey, CardCandidate, Lens, SeriesKey } from "@/types";

export type DraftContext = {
  profile: {
    oneStory: string;
    voiceRules: string[];
    doNotList: string[];
    ctaRotation: string[];
    whyItExists?: string;
    beliefs?: string[];
    enemy?: string;
    reader?: string;
    whyMine?: string;
    wordsSheUses?: string[];
    wordsSheNeverUses?: string[];
  };
  bucket: { key: BucketKey; name: string; description: string; whatItIsNot: string };
  series: { key: SeriesKey; name: string; structureSkeleton: string; examples: string[] };
  lens: Lens;
  card: CardCandidate | null;
  recentCaptions: string[];
  recentCtas: string[];
  rawNotes: string;
};

const LENS_LINE: Record<Lens, string> = {
  consumer:
    "Write it for a reader who could do this themselves. The invitation is: here's something you can LIVE.",
  creator:
    "Write it for an author or coach reading over the reader's shoulder. The invitation is: here's what YOUR audience could LIVE. Never switch into corporate B2B register to do it.",
};

function numbered(lines: string[]): string {
  return lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
}

/**
 * The single most damaging failure mode: writing a detail Trisha never said.
 * Her whole movement rests on the evidence being real, so this is prohibition
 * number one, inside the enforced list rather than trailing prose.
 */
const NO_INVENTION =
  "NEVER write a detail she did not say. No invented card, no invented weather, no invented feeling, no invented place, no invented time of day, no invented object. If her notes do not contain a beat the structure asks for, leave that beat out and write a shorter caption. A short true caption is always better than a longer one with something made up in it.";

/**
 * Two of the seeded examples are shape templates containing "______".
 * Without this, "match their rhythm" reads as an instruction to fill the
 * blank — which is exactly how a fabricated card got into a caption.
 */
const BLANK_RULE =
  "Some examples contain ______. That is a blank standing for a real detail, shown so you can see the shape of the sentence. Fill it only from her notes. If her notes do not say what goes there, do not use that sentence at all — never fill it with something she did not say.";

/**
 * Who Trisha is, before any rule about how to write. Every section is
 * optional and an absent one contributes nothing — no stray blank lines.
 */
function whoSheIs(ctx: DraftContext): string {
  const p = ctx.profile;
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

  return sections.length ? `\n${sections.join("\n\n")}\n` : "";
}

export function buildSystemPrompt(ctx: DraftContext): string {
  const cta = nextCta(ctx.profile.ctaRotation, ctx.recentCtas);
  const openers = recentOpeners(ctx.recentCaptions);

  return `You write social media captions as Trisha, who is building Wealth Daily.

# The one story every post tells
${ctx.profile.oneStory}
${whoSheIs(ctx)}

# This post's bucket: ${ctx.bucket.name}
${ctx.bucket.description}
What this bucket is NOT: ${ctx.bucket.whatItIsNot}

# This post's series: ${ctx.series.name}
Structure: ${ctx.series.structureSkeleton}

Examples of this series, written by Trisha. Match their rhythm and line breaks, never their exact words:
${ctx.series.examples.map((e) => `---\n${e}`).join("\n")}
${ctx.series.examples.some((e) => e.includes("___")) ? `\n${BLANK_RULE}` : ""}

# Lens
${LENS_LINE[ctx.lens]}

# Voice rules — follow every one
${numbered(ctx.profile.voiceRules)}

# Absolute prohibitions — breaking any of these makes the post unusable
${numbered([NO_INVENTION, ...ctx.profile.doNotList])}

# Call to action
Use this call to action, word for word: "${cta}"
It is an invitation, not an instruction. Place it on its own line at the end.

# Openers to avoid
These are how Trisha's recent posts opened. Do not reuse their shape or wording:
${openers.length > 0 ? openers.map((o) => `- ${o}`).join("\n") : "- (no recent posts yet)"}

# What to produce
Three complete captions, each taking a genuinely different structural angle on the same true story — not three rewordings of one caption. Three alternative opening lines. Platform variants: Instagram (as written), LinkedIn (same story, slightly more context, no hashtags), Facebook/Threads (shorter, punchier). A suggested visual describing what Trisha should photograph or record. A Stories version: one or two messy lines she could put over a photo.

If her notes are thin, keep the caption short rather than padding it out.`;
}

export function buildUserMessage(ctx: DraftContext): string {
  const card = ctx.card
    ? `The card she did:
"${ctx.card.text}"
From: ${ctx.card.productTitle}${ctx.card.chapterTitle ? ` · ${ctx.card.chapterTitle}` : ""}

`
    : "";

  return `${card}Her notes on what actually happened:
${ctx.rawNotes.trim() || "(none yet — write from the card alone and keep it short)"}`;
}
