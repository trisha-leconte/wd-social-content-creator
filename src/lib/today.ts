import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import Bucket from "@/models/Bucket";
import WeeklySlot from "@/models/WeeklySlot";
import StoryPrompt from "@/models/StoryPrompt";
import { slotForDate, weekSlots, startOfWeek, type SlotLike } from "@/lib/schedule";
import { computeMix } from "@/lib/mix";
import type { BucketKey } from "@/types";

type PostLike = { slotKey?: string; date?: Date; status: string; _id?: unknown };
export type WeekRow = { date: Date; slot: SlotLike; post: PostLike | null };

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function withPosts(
  week: { date: Date; slot: SlotLike }[],
  posts: PostLike[]
): WeekRow[] {
  return week.map(({ date, slot }) => ({
    date,
    slot,
    post: posts.find((p) => p.slotKey === slot.key && p.date && sameDay(new Date(p.date), date)) ?? null,
  }));
}

export async function todayView(now = new Date()) {
  await dbConnect();

  const slots = (await WeeklySlot.find().lean()) as unknown as SlotLike[];
  const buckets = await Bucket.find().sort({ targetPercent: -1 }).lean();
  const targets = Object.fromEntries(buckets.map((b) => [b.key, b.targetPercent])) as Record<BucketKey, number>;

  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekPosts = (await Post.find({ date: { $gte: weekStart, $lt: weekEnd } }).lean()) as unknown as PostLike[];

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = await Post.find({ status: "posted", postedAt: { $gte: thirtyDaysAgo } }).lean();

  const prompts = await StoryPrompt.find().lean();

  return {
    todaySlot: slotForDate(now, slots),
    week: withPosts(weekSlots(now, slots), weekPosts),
    mix: computeMix(recent as { bucketKey: BucketKey }[], targets),
    buckets,
    captured: await Post.find({ status: "captured" }).sort({ createdAt: -1 }).lean(),
    storyPrompt: prompts.length ? prompts[Math.floor(Math.random() * prompts.length)].text : null,
  };
}
