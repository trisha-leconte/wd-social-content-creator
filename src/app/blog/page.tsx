import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { dbConnect } from "@/lib/db";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  await requireUserId();
  await dbConnect();
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Blog</h1>
      <p className="mb-8 text-sm text-stone-500">
        Drafts you copy out. <Link href="/blog/ideas" className="text-living underline">Ideas from your catalogue →</Link>
      </p>

      <form action="/blog/new" className="mb-8 flex gap-2">
        <input
          name="topic"
          placeholder="What should it be about?"
          required
          className="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-living px-4 py-2 text-sm font-medium text-white">Start</button>
      </form>

      {posts.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-sm text-stone-500">
          Nothing yet. Type a topic above, or take one from your catalogue.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded border border-stone-200">
          {posts.map((p) => (
            <li key={String(p._id)} className="p-3">
              <Link href={`/blog/${String(p._id)}`} className="text-sm hover:underline">
                <span className="mr-2 text-xs uppercase tracking-wider text-stone-500">{p.status}</span>
                {p.chosenTitle ?? p.topic}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
