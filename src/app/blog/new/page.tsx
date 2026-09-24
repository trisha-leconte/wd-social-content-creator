import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import type { BlogAudience } from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function NewBlogPost({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; audience?: string }>;
}) {
  await requireUserId();
  const { topic, audience } = await searchParams;
  if (!topic?.trim()) redirect("/blog");

  await dbConnect();
  const post = await BlogPost.create({
    topic: topic.trim(),
    audience: (audience as BlogAudience) ?? "reader",
    status: "idea",
  });
  redirect(`/blog/${String(post._id)}`);
}
