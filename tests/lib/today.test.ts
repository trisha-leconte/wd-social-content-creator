import { describe, it, expect } from "vitest";
import { withPosts } from "@/lib/today";

const WEEK = [
  { date: new Date("2026-09-21T00:00:00"), slot: { key: "mon", dayOfWeek: 1, bucketKey: "LIVING_IT" as const, defaultSeriesKey: "TODAY_I_LIVED_IT" as const } },
  { date: new Date("2026-09-22T00:00:00"), slot: { key: "tue", dayOfWeek: 2, bucketKey: "THE_IDEA" as const, defaultSeriesKey: "TRY_THIS" as const } },
];

describe("withPosts", () => {
  it("attaches the post that matches a slot on its date", () => {
    const posts = [{ slotKey: "mon", date: new Date("2026-09-21T09:00:00"), status: "posted" }];
    const rows = withPosts(WEEK, posts as never);
    expect(rows[0].post?.status).toBe("posted");
    expect(rows[1].post).toBeNull();
  });

  it("ignores a post with the right slot key but a different week", () => {
    const posts = [{ slotKey: "mon", date: new Date("2026-09-14T09:00:00"), status: "posted" }];
    expect(withPosts(WEEK, posts as never)[0].post).toBeNull();
  });

  it("marks a slot empty when nothing has been written for it", () => {
    expect(withPosts(WEEK, [] as never).every((r) => r.post === null)).toBe(true);
  });
});
