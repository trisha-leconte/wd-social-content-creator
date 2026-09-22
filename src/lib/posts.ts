import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import StrategyProfile from "@/models/StrategyProfile";
import type { DraftContext } from "@/lib/agent/prompt";
import type { PlatformKey } from "@/types";

type PostLike = {
  bucketKey: string;
  seriesKey?: string;
  lens?: "consumer" | "creator";
  rawNotes?: string;
  sourceCardRef?: DraftContext["card"];
};

export async function buildDraftContext(post: PostLike): Promise<DraftContext> {
  await dbConnect();

  const profile = await StrategyProfile.findOne({ singleton: "the-one" }).lean();
  if (!profile) throw new Error("The strategy has not been seeded yet. Run: npm run seed");

  const bucket = await Bucket.findOne({ key: post.bucketKey }).lean();
  if (!bucket) throw new Error(`Unknown bucket ${post.bucketKey}. Run: npm run seed`);

  const series = await Series.findOne({ key: post.seriesKey }).lean();
  if (!series) throw new Error(`Unknown series ${post.seriesKey}. Run: npm run seed`);

  const recent = await Post.find({ status: "posted" }).sort({ postedAt: -1 }).limit(8).lean();

  return {
    profile: {
      oneStory: profile.oneStory,
      voiceRules: profile.voiceRules ?? [],
      doNotList: profile.doNotList ?? [],
      ctaRotation: profile.ctaRotation ?? [],
    },
    bucket: {
      key: bucket.key,
      name: bucket.name,
      description: bucket.description ?? "",
      whatItIsNot: bucket.whatItIsNot ?? "",
    },
    series: {
      key: series.key,
      name: series.name,
      structureSkeleton: series.structureSkeleton ?? "",
      examples: series.examples ?? [],
    },
    lens: post.lens ?? "consumer",
    card: post.sourceCardRef ?? null,
    recentCaptions: recent.map((p) => p.chosenCaption ?? "").filter(Boolean),
    recentCtas: recent.map((p) => p.cta ?? "").filter(Boolean),
    rawNotes: post.rawNotes ?? "",
  };
}

export async function placeCaptured(postId: string, slotKey: string, date: Date) {
  await dbConnect();
  return Post.findByIdAndUpdate(postId, { slotKey, date, status: "drafted" }, { new: true });
}

export async function markPosted(postId: string, platforms: PlatformKey[]) {
  await dbConnect();
  return Post.findByIdAndUpdate(
    postId,
    { status: "posted", postedAt: new Date(), platforms },
    { new: true }
  );
}

/** Product ids already referenced by a post, for the coverage screen. */
export async function postedProductIds(): Promise<string[]> {
  await dbConnect();
  const posts = await Post.find({ "sourceCardRef.productId": { $exists: true } }).lean();
  return posts.map((p) => p.sourceCardRef?.productId).filter(Boolean) as string[];
}
