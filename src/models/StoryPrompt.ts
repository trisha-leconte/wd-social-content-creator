import mongoose, { Schema, type Model } from "mongoose";

export interface IStoryPrompt {
  text: string;
}

const StoryPromptSchema = new Schema<IStoryPrompt>({ text: { type: String, required: true } });

export default (mongoose.models.StoryPrompt as Model<IStoryPrompt>) ||
  mongoose.model<IStoryPrompt>("StoryPrompt", StoryPromptSchema);
