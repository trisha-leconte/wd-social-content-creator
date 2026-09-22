import mongoose, { Schema, type Model } from "mongoose";
import {
  BUCKET_KEYS,
  SERIES_KEYS,
  POST_STATUSES,
  PLATFORM_KEYS,
  type BucketKey,
  type CardCandidate,
  type Lens,
  type PlatformKey,
  type PostStatus,
  type SeriesKey,
} from "@/types";

export interface IGeneration {
  createdAt: Date;
  captions: string[];
  hooks: string[];
  cta: string;
  platformVariants: Record<PlatformKey, string>;
  suggestedVisual: string;
  storyVersion: string;
}

export interface IPost {
  date?: Date;
  slotKey?: string;
  bucketKey: BucketKey;
  seriesKey?: SeriesKey;
  lens: Lens;
  rawNotes: string;
  sourceCardRef?: CardCandidate;
  generations: IGeneration[];
  chosenCaption?: string;
  platformVariants?: Record<PlatformKey, string>;
  suggestedVisual?: string;
  storyVersion?: string;
  cta?: string;
  status: PostStatus;
  postedAt?: Date;
  platforms?: PlatformKey[];
}

const GenerationSchema = new Schema<IGeneration>(
  {
    createdAt: { type: Date, default: Date.now },
    captions: [String],
    hooks: [String],
    cta: String,
    platformVariants: { type: Object },
    suggestedVisual: String,
    storyVersion: String,
  },
  { _id: false }
);

const CardRefSchema = new Schema<CardCandidate>(
  {
    activityId: String,
    productId: String,
    text: String,
    productTitle: String,
    chapterTitle: String,
  },
  { _id: false }
);

const PostSchema = new Schema<IPost>(
  {
    date: Date,
    slotKey: String,
    bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
    seriesKey: { type: String, enum: SERIES_KEYS },
    lens: { type: String, enum: ["consumer", "creator"], default: "consumer" },
    rawNotes: { type: String, default: "" },
    sourceCardRef: { type: CardRefSchema, default: undefined },
    generations: { type: [GenerationSchema], default: [] },
    chosenCaption: String,
    platformVariants: { type: Object, default: undefined },
    suggestedVisual: String,
    storyVersion: String,
    cta: String,
    status: { type: String, enum: POST_STATUSES, default: "idea" },
    postedAt: Date,
    platforms: [{ type: String, enum: PLATFORM_KEYS }],
  },
  { timestamps: true }
);

export default (mongoose.models.Post as Model<IPost>) || mongoose.model<IPost>("Post", PostSchema);
