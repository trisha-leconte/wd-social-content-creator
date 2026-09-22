import { describe, it, expect } from "vitest";
import Post from "@/models/Post";

describe("Post model", () => {
  it("rejects a status outside the allowed set", () => {
    const doc = new Post({ bucketKey: "LIVING_IT", status: "publishd" });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it("rejects an unknown bucket key", () => {
    const doc = new Post({ bucketKey: "NONSENSE", status: "idea" });
    const err = doc.validateSync();
    expect(err?.errors.bucketKey).toBeDefined();
  });

  it("defaults a new post to status idea with an empty generations list", () => {
    const doc = new Post({ bucketKey: "THE_IDEA" });
    expect(doc.status).toBe("idea");
    expect(doc.generations).toEqual([]);
  });

  it("accepts a captured post that has no slotKey", () => {
    const doc = new Post({ bucketKey: "LIVING_IT", seriesKey: "TODAY_I_LIVED_IT", status: "captured", rawNotes: "penny" });
    expect(doc.validateSync()).toBeUndefined();
  });
});
