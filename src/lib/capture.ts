import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { buildDraftContext } from "@/lib/posts";
import { classifyAndDraft } from "@/lib/agent/generate";

export async function captureStory(story: string) {
  const rawNotes = story.trim();
  if (!rawNotes) throw new Error("Tell me what happened — the story is empty.");

  await dbConnect();

  // Classification needs a bucket to build a context from; LIVING_IT is the
  // most common and the model overrides it in its own response.
  const ctx = await buildDraftContext({
    bucketKey: "LIVING_IT",
    seriesKey: "TODAY_I_LIVED_IT",
    lens: "consumer",
    rawNotes,
  });

  const draft = await classifyAndDraft(ctx);

  const post = await Post.create({
    bucketKey: draft.bucketKey,
    seriesKey: draft.seriesKey,
    lens: draft.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
    rawNotes,
    status: "captured",
    cta: draft.cta,
    suggestedVisual: draft.suggestedVisual,
    storyVersion: draft.storyVersion,
    platformVariants: draft.platformVariants,
    generations: [{ ...draft, createdAt: new Date() }],
  });

  return {
    postId: String(post._id),
    bucketKey: draft.bucketKey,
    seriesKey: draft.seriesKey,
    reason: draft.classificationReason,
    caption: draft.captions[0],
  };
}
