import mongoose, { Schema } from "mongoose";

const StrategyProfileSchema = new Schema(
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
  },
  { timestamps: true }
);

export default mongoose.models.StrategyProfile ||
  mongoose.model("StrategyProfile", StrategyProfileSchema);
