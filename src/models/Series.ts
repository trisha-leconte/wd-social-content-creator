import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

const SeriesSchema = new Schema({
  key: { type: String, enum: SERIES_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  promptQuestions: [String],
  structureSkeleton: String,
  examples: [String],
});

export default mongoose.models.Series || mongoose.model("Series", SeriesSchema);
