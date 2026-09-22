import mongoose, { Schema, type Model } from "mongoose";
import { BUCKET_KEYS, SERIES_KEYS, type BucketKey, type SeriesKey } from "@/types";

export interface IWeeklySlot {
  key: string;
  dayOfWeek: number;
  label?: string;
  bucketKey: BucketKey;
  defaultSeriesKey: SeriesKey;
}

const WeeklySlotSchema = new Schema<IWeeklySlot>({
  key: { type: String, required: true, unique: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  label: String,
  bucketKey: { type: String, enum: BUCKET_KEYS, required: true },
  defaultSeriesKey: { type: String, enum: SERIES_KEYS, required: true },
});

export default (mongoose.models.WeeklySlot as Model<IWeeklySlot>) ||
  mongoose.model<IWeeklySlot>("WeeklySlot", WeeklySlotSchema);
