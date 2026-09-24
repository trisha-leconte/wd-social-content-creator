import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const { topic, audience } = await request.json();
  if (!String(topic ?? "").trim()) {
    return NextResponse.json({ error: "Give it a topic to write about." }, { status: 400 });
  }

  const post = await BlogPost.create({
    topic: String(topic).trim(),
    audience: audience ?? "reader",
    status: "idea",
  });
  return NextResponse.json({ post }, { status: 201 });
}
