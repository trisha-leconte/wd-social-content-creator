import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";

export async function GET(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const status = new URL(request.url).searchParams.get("status");
  const posts = await Post.find(status ? { status } : {}).sort({ updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await dbConnect();

  const body = await request.json();
  const post = await Post.create({
    date: body.date ? new Date(body.date) : new Date(),
    slotKey: body.slotKey,
    bucketKey: body.bucketKey,
    seriesKey: body.seriesKey,
    lens: body.lens ?? "consumer",
    status: "idea",
  });
  return NextResponse.json({ post }, { status: 201 });
}
