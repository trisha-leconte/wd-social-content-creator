import { describe, it, expect } from "vitest";
import { computeMix } from "@/lib/mix";

const TARGETS = { LIVING_IT: 40, PEOPLE_LIVING_IT: 25, THE_IDEA: 20, BEHIND_THE_WORLD: 15 } as const;

describe("computeMix", () => {
  it("returns every bucket at zero when there are no posts", () => {
    const rows = computeMix([], TARGETS);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.actualPercent === 0 && r.count === 0)).toBe(true);
  });

  it("computes the percentage of posts in each bucket", () => {
    const posts = [
      { bucketKey: "LIVING_IT" as const },
      { bucketKey: "LIVING_IT" as const },
      { bucketKey: "THE_IDEA" as const },
      { bucketKey: "BEHIND_THE_WORLD" as const },
    ];
    const rows = computeMix(posts, TARGETS);
    expect(rows.find((r) => r.bucketKey === "LIVING_IT")?.actualPercent).toBe(50);
    expect(rows.find((r) => r.bucketKey === "THE_IDEA")?.actualPercent).toBe(25);
    expect(rows.find((r) => r.bucketKey === "PEOPLE_LIVING_IT")?.actualPercent).toBe(0);
  });

  it("reports the signed gap against target", () => {
    const rows = computeMix([{ bucketKey: "LIVING_IT" as const }], TARGETS);
    expect(rows.find((r) => r.bucketKey === "LIVING_IT")?.gap).toBe(60);
    expect(rows.find((r) => r.bucketKey === "THE_IDEA")?.gap).toBe(-20);
  });

  it("orders rows by descending target so the bar always reads the same way", () => {
    expect(computeMix([], TARGETS).map((r) => r.bucketKey)).toEqual([
      "LIVING_IT",
      "PEOPLE_LIVING_IT",
      "THE_IDEA",
      "BEHIND_THE_WORLD",
    ]);
  });
});
