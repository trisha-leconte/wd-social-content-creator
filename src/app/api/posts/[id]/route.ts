import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { markPosted, placeCaptured } from "@/lib/posts";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  await dbConnect();

  if (body.action === "mark_posted") {
    return NextResponse.json({ post: await markPosted(id, body.platforms ?? ["instagram"]) });
  }
  if (body.action === "place") {
    return NextResponse.json({ post: await placeCaptured(id, body.slotKey, new Date(body.date)) });
  }

  const allowed = ["rawNotes", "chosenCaption", "lens", "status", "seriesKey", "sourceCardRef"] as const;
  const update = Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
  return NextResponse.json({ post: await Post.findByIdAndUpdate(id, update, { new: true }) });
}
