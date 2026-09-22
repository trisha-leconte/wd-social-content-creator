import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string;
  name?: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
  },
  { timestamps: true }
);

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
