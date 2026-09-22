import mongoose, { Schema, type Model } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS, type BucketKey, type SeriesKey } from "@/types";

export interface ISeries {
  key: SeriesKey;
  name: string;
  bucketKey: BucketKey;
  promptQuestions?: string[];
  structureSkeleton?: string;
  examples?: string[];
}

const SeriesSchema = new Schema<ISeries>({
  key: { type: String, enum: SERIES_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  promptQuestions: [String],
  structureSkeleton: String,
  examples: [String],
});

export default (mongoose.models.Series as Model<ISeries>) ||
  mongoose.model<ISeries>("Series", SeriesSchema);
