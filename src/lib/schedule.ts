import type { BucketKey, SeriesKey } from "@/types";

export type SlotLike = {
  key: string;
  dayOfWeek: number;
  bucketKey: BucketKey;
  defaultSeriesKey: SeriesKey;
};

/** Midnight on the Monday of the week containing `date` (weeks run Mon–Sun). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // Sunday (0) is 6 days after Monday
  d.setDate(d.getDate() - shift);
  return d;
}

export function slotForDate(date: Date, slots: SlotLike[]): SlotLike | null {
  return slots.find((s) => s.dayOfWeek === date.getDay()) ?? null;
}

export function weekSlots(date: Date, slots: SlotLike[]): { date: Date; slot: SlotLike }[] {
  const monday = startOfWeek(date);
  return slots
    .map((slot) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + ((slot.dayOfWeek + 6) % 7));
      return { date: d, slot };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
