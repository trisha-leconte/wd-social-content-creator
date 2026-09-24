import { describe, it, expect, vi, beforeEach } from "vitest";

const currentUserId = vi.fn();
const dbConnect = vi.fn().mockResolvedValue(null);
const findByIdAndUpdate = vi.fn();
const outlinePost = vi.fn();
const draftPost = vi.fn();
const slugify = vi.fn((s: string) => `slug-of-${s}`);

vi.mock("@/lib/auth", () => ({ currentUserId }));
vi.mock("@/lib/db", () => ({ dbConnect }));
// Keep the real named exports (BLOG_STATUSES etc.) — service.ts's own
// dependency chain (generate.ts -> schema.ts) needs SEARCH_INTENTS from
// this module — and only swap out the default model object the route uses.
vi.mock("@/models/BlogPost", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/models/BlogPost")>();
  return { ...actual, default: { findByIdAndUpdate } };
});
vi.mock("@/lib/blog/slug", () => ({ slugify }));

// Only outlinePost/draftPost are stubbed here — PostNotFoundError and
// OutlineRequiredError come from the real module so the route's
// `instanceof` checks are exercised against the actual classes it imports.
vi.mock("@/lib/blog/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blog/service")>();
  return { ...actual, outlinePost, draftPost };
});

// Mirrors BLOG_STATUSES in src/models/BlogPost.ts — kept as a local literal
// (rather than a static import of the mocked module) so this file's own
// top-level import graph stays out of the way of the hoisted vi.mock calls
// above, which run before any of this file's `const` bindings are ready.
const BLOG_STATUSES = ["idea", "outlined", "drafted", "ready", "published"];

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/blog/post1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = { params: Promise.resolve({ id: "post1" }) };

describe("PATCH /api/blog/[id]", () => {
  beforeEach(() => {
    currentUserId.mockReset();
    currentUserId.mockReturnValue("user1");
    dbConnect.mockClear();
    findByIdAndUpdate.mockReset();
    outlinePost.mockReset();
    draftPost.mockReset();
    slugify.mockClear();
  });

  it("returns 401 when not signed in", async () => {
    currentUserId.mockReturnValue(null);
    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ action: "outline" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the post does not exist", async () => {
    const { PostNotFoundError } = await import("@/lib/blog/service");
    outlinePost.mockRejectedValue(new PostNotFoundError());

    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ action: "outline" }), PARAMS);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("That post no longer exists.");
  });

  it("returns 400 when drafting a post that has not been outlined yet", async () => {
    const { OutlineRequiredError } = await import("@/lib/blog/service");
    draftPost.mockRejectedValue(new OutlineRequiredError());

    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ action: "draft" }), PARAMS);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Write the outline first.");
  });

  it("returns 502 for a genuine generation failure, not 404 or 400", async () => {
    draftPost.mockRejectedValue(
      new Error("The draft is missing sections the outline asked for: \"Do one thing\". Try again.")
    );

    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ action: "draft" }), PARAMS);

    expect(res.status).toBe(502);
  });

  it("rejects an invalid status rather than persisting it", async () => {
    findByIdAndUpdate.mockImplementation(async (id: string, update: Record<string, unknown>, opts: Record<string, unknown>) => {
      if (opts?.runValidators && "status" in update && !BLOG_STATUSES.includes(update.status as string)) {
        throw new Error("BlogPost validation failed: status: `bogus` is not a valid enum value for path `status`.");
      }
      return { _id: id, ...update };
    });

    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ status: "bogus" }), PARAMS);

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      "post1",
      expect.objectContaining({ status: "bogus" }),
      expect.objectContaining({ runValidators: true })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not a valid enum value/);
  });

  it("still persists a valid status update with runValidators on", async () => {
    findByIdAndUpdate.mockImplementation(async (id: string, update: Record<string, unknown>, opts: Record<string, unknown>) => {
      if (opts?.runValidators && "status" in update && !BLOG_STATUSES.includes(update.status as string)) {
        throw new Error("invalid status");
      }
      return { _id: id, ...update };
    });

    const { PATCH } = await import("@/app/api/blog/[id]/route");
    const res = await PATCH(patchRequest({ status: "drafted" }), PARAMS);

    expect(res.status).toBe(200);
    expect((await res.json()).post.status).toBe("drafted");
  });
});
