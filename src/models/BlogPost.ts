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
