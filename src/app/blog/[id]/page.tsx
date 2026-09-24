import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { BlogComposer } from "@/components/BlogComposer";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  await dbConnect();
  const post = await BlogPost.findById(id).lean();
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/blog" className="text-sm text-stone-500 hover:underline">← Blog</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{post.chosenTitle ?? post.topic}</h1>
      <p className="mb-8 text-sm text-stone-500">{post.audience.replace("_", " ")}</p>
      <BlogComposer initial={JSON.parse(JSON.stringify({ ...post, _id: String(post._id) }))} />
    </main>
  );
}
