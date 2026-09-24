import { describe, it, expect } from "vitest";
import { buildFieldPayload } from "@/lib/fieldPayload";

describe("buildFieldPayload", () => {
  it("builds a flat payload for an undotted field", () => {
    expect(buildFieldPayload("voiceRules", ["a", "b"])).toEqual({ voiceRules: ["a", "b"] });
  });

  it("builds a flat payload for another undotted field", () => {
    expect(buildFieldPayload("doNotList", ["x"])).toEqual({ doNotList: ["x"] });
  });

  it("builds a nested payload for a dotted field", () => {
    expect(buildFieldPayload("blog.structureRules", ["a"])).toEqual({ blog: { structureRules: ["a"] } });
  });

  it("builds a nested payload with an empty array", () => {
    expect(buildFieldPayload("blog.doNotList", [])).toEqual({ blog: { doNotList: [] } });
  });

  it("treats everything after the first dot as the nested key, pinning multi-dot behavior", () => {
    expect(buildFieldPayload("a.b.c", ["z"])).toEqual({ a: { "b.c": ["z"] } });
  });
});
