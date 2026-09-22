import { describe, it, expect } from "vitest";
import { slotForDate, weekSlots } from "@/lib/schedule";

const SLOTS = [
  { key: "mon", dayOfWeek: 1, bucketKey: "LIVING_IT" as const, defaultSeriesKey: "TODAY_I_LIVED_IT" as const },
  { key: "tue", dayOfWeek: 2, bucketKey: "THE_IDEA" as const, defaultSeriesKey: "TRY_THIS" as const },
  { key: "thu", dayOfWeek: 4, bucketKey: "PEOPLE_LIVING_IT" as const, defaultSeriesKey: "SOMEONE_LIVED_IT" as const },
  { key: "sat", dayOfWeek: 6, bucketKey: "BEHIND_THE_WORLD" as const, defaultSeriesKey: "BUILDING_WEALTH_DAILY" as const },
];

describe("slotForDate", () => {
  it("returns the Monday slot for a Monday", () => {
    expect(slotForDate(new Date("2026-09-21T12:00:00"), SLOTS)?.key).toBe("mon");
  });

  it("returns null on a day with no slot", () => {
    expect(slotForDate(new Date("2026-09-23T12:00:00"), SLOTS)).toBeNull();
  });
});

describe("weekSlots", () => {
  it("returns the four slots of the containing Monday-to-Sunday week, in order", () => {
    const week = weekSlots(new Date("2026-09-23T12:00:00"), SLOTS);
    expect(week.map((w) => w.slot.key)).toEqual(["mon", "tue", "thu", "sat"]);
  });

  it("dates each slot to the correct day of that week", () => {
    const week = weekSlots(new Date("2026-09-23T12:00:00"), SLOTS);
    expect(week[0].date.getDate()).toBe(21);
    expect(week[3].date.getDate()).toBe(26);
  });

  it("uses the same week when given the Sunday that ends it", () => {
    const week = weekSlots(new Date("2026-09-27T12:00:00"), SLOTS);
    expect(week[0].date.getDate()).toBe(21);
  });
});
