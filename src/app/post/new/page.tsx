import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import WeeklySlot from "@/models/WeeklySlot";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; date?: string }>;
}) {
  await requireUserId();
  const { slot, date } = await searchParams;
  if (!slot) redirect("/");

  await dbConnect();
  const weeklySlot = await WeeklySlot.findOne({ key: slot }).lean();
  if (!weeklySlot) redirect("/");

  const post = await Post.create({
    slotKey: slot,
    date: date ? new Date(date) : new Date(),
    bucketKey: weeklySlot.bucketKey,
    seriesKey: weeklySlot.defaultSeriesKey,
    lens: weeklySlot.bucketKey === "BEHIND_THE_WORLD" ? "creator" : "consumer",
    status: "idea",
  });

  redirect(`/post/${String(post._id)}`);
}
