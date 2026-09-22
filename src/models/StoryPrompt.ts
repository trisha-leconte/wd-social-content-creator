import mongoose, { Schema } from "mongoose";

const StoryPromptSchema = new Schema({ text: { type: String, required: true } });

export default mongoose.models.StoryPrompt || mongoose.model("StoryPrompt", StoryPromptSchema);
