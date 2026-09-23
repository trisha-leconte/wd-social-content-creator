import mongoose, { Schema, type Model } from "mongoose";

export interface IStrategyProfile {
  singleton: string;
  oneStory: string;
  audiences?: { who: string; thought: string }[];
  voiceRules?: string[];
  doNotList?: string[];
  ctaRotation?: string[];
  openerBank?: string[];
  profileBio?: string;
  pinnedPosts?: { title: string; brief: string }[];
  whyItExists?: string;
  beliefs?: string[];
  enemy?: string;
  reader?: string;
  whyMine?: string;
  wordsSheUses?: string[];
  wordsSheNeverUses?: string[];
}

const StrategyProfileSchema = new Schema<IStrategyProfile>(
  {
    singleton: { type: String, default: "the-one", unique: true },
    oneStory: { type: String, required: true },
    audiences: [{ who: String, thought: String }],
    voiceRules: [String],
    doNotList: [String],
    ctaRotation: [String],
    openerBank: [String],
    profileBio: String,
    pinnedPosts: [{ title: String, brief: String }],
    whyItExists: String,
    beliefs: [String],
    enemy: String,
    reader: String,
    whyMine: String,
    wordsSheUses: [String],
    wordsSheNeverUses: [String],
  },
  { timestamps: true }
);

export default (mongoose.models.StrategyProfile as Model<IStrategyProfile>) ||
  mongoose.model<IStrategyProfile>("StrategyProfile", StrategyProfileSchema);
