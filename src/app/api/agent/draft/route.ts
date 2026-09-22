import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { buildDraftContext } from "@/lib/posts";
import { generateDraft } from "@/lib/agent/generate";

export async function POST(request: Request) {
  if (!currentUserId(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { postId, rawNotes, lens, card } = await request.json();
  await dbConnect();

  const post = await Post.findById(postId);
  if (!post) return NextResponse.json({ error: "That post no longer exists." }, { status: 404 });

  post.rawNotes = rawNotes ?? post.rawNotes;
  if (lens) post.lens = lens;
  if (card) post.sourceCardRef = card;

  try {
    const draft = await generateDraft(await buildDraftContext(post));
    post.generations.push({ ...draft, createdAt: new Date() });
    post.cta = draft.cta;
    post.suggestedVisual = draft.suggestedVisual;
    post.storyVersion = draft.storyVersion;
    post.platformVariants = draft.platformVariants;
    if (post.status === "idea" || post.status === "captured") post.status = "drafted";
    await post.save();
    return NextResponse.json({ draft, postId: String(post._id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
