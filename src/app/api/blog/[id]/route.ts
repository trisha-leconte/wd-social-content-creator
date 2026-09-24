import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { draftPost, outlinePost } from "@/lib/blog/service";
import { slugify } from "@/lib/blog/slug";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "outline") return NextResponse.json({ post: await outlinePost(id) });
    if (body.action === "draft") return NextResponse.json({ post: await draftPost(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await dbConnect();
  const allowed = ["chosenTitle", "metaDescription", "outline", "bodyMarkdown", "status", "audience", "targetKeyword"] as const;
  const update: Record<string, unknown> = Object.fromEntries(
    allowed.filter((k) => k in body).map((k) => [k, body[k]])
  );
  if (typeof body.chosenTitle === "string") update.slug = slugify(body.chosenTitle);

  return NextResponse.json({ post: await BlogPost.findByIdAndUpdate(id, update, { new: true }) });
}
