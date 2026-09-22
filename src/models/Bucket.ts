import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS } from "@/types";

const BucketSchema = new Schema({
  key: { type: String, enum: BUCKET_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  targetPercent: { type: Number, required: true },
  description: String,
  whatItIsNot: String,
  color: String,
});

export default mongoose.models.Bucket || mongoose.model("Bucket", BucketSchema);
