import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { Composer } from "@/components/Composer";
import type { Lens } from "@/types";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  await dbConnect();
  const post = await Post.findById(id).lean();
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {String(post.bucketKey).replace(/_/g, " ")}
      </h1>
      <p className="mb-8 text-sm text-stone-500">{String(post.seriesKey ?? "").replace(/_/g, " ")}</p>
      <Composer
        postId={id}
        initialNotes={post.rawNotes ?? ""}
        initialLens={(post.lens as Lens) ?? "consumer"}
      />
    </main>
  );
}
