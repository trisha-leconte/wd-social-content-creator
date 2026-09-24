import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { draftPost, outlinePost, OutlineRequiredError, PostNotFoundError } from "@/lib/blog/service";
import { slugify } from "@/lib/blog/slug";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "outline") return NextResponse.json({ post: await outlinePost(id) });
    if (body.action === "draft") return NextResponse.json({ post: await draftPost(id) });
  } catch (e) {
    // PostNotFoundError and OutlineRequiredError are user-fixable — a stale
    // id, or drafting before outlining — not upstream generation faults, so
    // they get their own status codes rather than falling into the generic
    // "the model/API failed" 502.
    if (e instanceof PostNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof OutlineRequiredError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await dbConnect();
  const allowed = ["chosenTitle", "metaDescription", "outline", "bodyMarkdown", "status", "audience", "targetKeyword"] as const;
  const update: Record<string, unknown> = Object.fromEntries(
    allowed.filter((k) => k in body).map((k) => [k, body[k]])
  );
  if (typeof body.chosenTitle === "string") update.slug = slugify(body.chosenTitle);

  try {
    const post = await BlogPost.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    return NextResponse.json({ post });
  } catch (e) {
    // Only a Mongoose ValidationError means the request itself was bad
    // input — everything else (a dropped connection, a replica-set
    // failover, any other transient Mongo failure) is a server problem,
    // not something the caller can fix by sending different data.
    if ((e as Error).name === "ValidationError") {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
