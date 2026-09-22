import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS, POST_STATUSES, PLATFORM_KEYS } from "@/types";

const GenerationSchema = new Schema(
  {
    createdAt: { type: Date, default: Date.now },
    captions: [String],
    hooks: [String],
    cta: String,
    platformVariants: { type: Map, of: String },
    suggestedVisual: String,
    storyVersion: String,
  },
  { _id: false }
);

const PostSchema = new Schema(
  {
    date: Date,
    slotKey: String,
    bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
    seriesKey: { type: String, enum: SERIES_KEYS },
    lens: { type: String, enum: ["consumer", "creator"], default: "consumer" },
    rawNotes: { type: String, default: "" },
    sourceCardRef: {
      type: new Schema(
        { activityId: String, productId: String, text: String, productTitle: String, chapterTitle: String },
        { _id: false }
      ),
      default: undefined,
    },
    generations: { type: [GenerationSchema], default: [] },
    chosenCaption: String,
    platformVariants: { type: Map, of: String, default: undefined },
    suggestedVisual: String,
    storyVersion: String,
    cta: String,
    status: { type: String, enum: POST_STATUSES, default: "idea" },
    postedAt: Date,
    platforms: [{ type: String, enum: PLATFORM_KEYS }],
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
