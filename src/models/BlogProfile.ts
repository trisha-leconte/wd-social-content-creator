import mongoose, { Schema, type Model } from "mongoose";

export interface IBlogProfile {
  singleton: string;
  siteUrl: string;
  targetWordCount: { min: number; max: number };
  structureRules: string[];
  contentRules: string[];
  doNotList: string[];
}

const BlogProfileSchema = new Schema<IBlogProfile>(
  {
    singleton: { type: String, default: "the-one", unique: true },
    siteUrl: String,
    targetWordCount: { min: Number, max: Number },
    structureRules: [String],
    contentRules: [String],
    doNotList: [String],
  },
  { timestamps: true }
);

export default (mongoose.models.BlogProfile as Model<IBlogProfile>) ||
  mongoose.model<IBlogProfile>("BlogProfile", BlogProfileSchema);
