import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { buildDraftContext } from "@/lib/posts";
import { classifyStory, generateDraft } from "@/lib/agent/generate";

export async function captureStory(story: string) {
  const rawNotes = story.trim();
  if (!rawNotes) throw new Error("Tell me what happened — the story is empty.");

  await dbConnect();

  // Sort first, write second. Building the writing prompt before the series
  // is known primes the wrong skeleton — the model is told to produce beats
  // the note does not contain, and invents them to satisfy the shape.
  const sorted = await classifyStory(rawNotes);

  const ctx = await buildDraftContext({
    bucketKey: sorted.bucketKey,
    seriesKey: sorted.seriesKey,
    lens: sorted.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
    rawNotes,
  });

  const draft = await generateDraft(ctx);

  const post = await Post.create({
    bucketKey: sorted.bucketKey,
    seriesKey: sorted.seriesKey,
    lens: sorted.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
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
    bucketKey: sorted.bucketKey,
    seriesKey: sorted.seriesKey,
    reason: sorted.reason,
    caption: draft.captions[0],
  };
}
