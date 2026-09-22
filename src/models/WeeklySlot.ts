import mongoose, { Schema } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS } from "@/types";

const WeeklySlotSchema = new Schema({
  key: { type: String, required: true, unique: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  label: String,
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  defaultSeriesKey: { type: String, enum: SERIES_KEYS, required: true },
});

export default mongoose.models.WeeklySlot || mongoose.model("WeeklySlot", WeeklySlotSchema);
