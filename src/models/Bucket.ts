import mongoose, { Schema, type Model } from "mongoose";
import { BUCKET_KEYS, type BucketKey } from "@/types";

export interface IBucket {
  key: BucketKey;
  name: string;
  targetPercent: number;
  description?: string;
  whatItIsNot?: string;
  color?: string;
}

const BucketSchema = new Schema<IBucket>({
  key: { type: String, enum: BUCKET_KEYS, required: true, unique: true },
  name: { type: String, required: true },
  targetPercent: { type: Number, required: true },
  description: String,
  whatItIsNot: String,
  color: String,
});

export default (mongoose.models.Bucket as Model<IBucket>) ||
  mongoose.model<IBucket>("Bucket", BucketSchema);
