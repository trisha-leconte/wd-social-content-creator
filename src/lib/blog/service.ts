import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import BlogProfile from "@/models/BlogProfile";
import StrategyProfile from "@/models/StrategyProfile";
import { getDeckCatalogue, getTodaysCardCandidates } from "@/lib/wealthdaily/source";
import { generateArticle, generateOutline } from "./generate";
import { slugify } from "./slug";
import type { BlogContext } from "./prompt";
import type { BlogAudience } from "@/models/BlogPost";

/**
 * Thrown when a postId does not resolve to a document. User-fixable in the
 * sense that it means a stale link/bad id, not a generation failure — the
 * API route maps this to 404.
 */
export class PostNotFoundError extends Error {
  constructor(message = "That post no longer exists.") {
    super(message);
    this.name = "PostNotFoundError";
  }
}

/**
 * Thrown when draftPost is asked to write a post that has not been
 * outlined yet. User-fixable (run the outline step first, then draft) —
 * the API route maps this to 400, not 502.
 */
export class OutlineRequiredError extends Error {
  constructor(message = "Write the outline first.") {
    super(message);
    this.name = "OutlineRequiredError";
  }
}

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
  if (!post) throw new PostNotFoundError();

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

/**
 * The design spec requires that every H2 in the approved outline appears in
 * the body. Nothing upstream enforces this — the model can silently drop or
 * rename a section — so this is the last line of defence before a draft is
 * saved. Matches on heading text appearing anywhere in the body, not on
 * exact Markdown formatting (the model may render `## Heading` with
 * different spacing around the hashes), case-insensitively and trimmed.
 */
function findMissingHeadings(outline: { heading: string }[], bodyMarkdown: string): string[] {
  const normalizedBody = bodyMarkdown.toLowerCase();
  return outline
    .map((item) => item.heading)
    .filter((heading) => !normalizedBody.includes(heading.trim().toLowerCase()));
}

export async function draftPost(postId: string) {
  await dbConnect();
  const post = await BlogPost.findById(postId);
  if (!post) throw new PostNotFoundError();
  if (!post.outline?.length) throw new OutlineRequiredError();

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

  const missingHeadings = findMissingHeadings(post.outline, article.bodyMarkdown);
  if (missingHeadings.length) {
    throw new Error(
      `The draft is missing sections the outline asked for: ${missingHeadings
        .map((heading) => `"${heading}"`)
        .join(", ")}. Try again.`
    );
  }

  post.bodyMarkdown = article.bodyMarkdown;
  post.wordCount = article.wordCount;
  post.generations?.push({ stage: "draft", at: new Date(), wordCount: article.wordCount });
  if (post.status === "outlined") post.status = "drafted";
  await post.save();

  return post;
}
