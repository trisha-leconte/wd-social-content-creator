import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CapturedPage() {
  await requireUserId();
  await dbConnect();
  const posts = await Post.find({ status: "captured" }).sort({ createdAt: -1 }).lean();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Captured</h1>
      <p className="mb-8 text-sm text-stone-500">
        Stories you sent from the command line. Nothing here is scheduled until you place it in a slot.
      </p>

      {posts.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-sm text-stone-500">
          Nothing captured yet. Try: <code>npm run live-it -- &quot;what just happened&quot;</code>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={String(p._id)} className="rounded border border-stone-200 p-4">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                {String(p.bucketKey).replace(/_/g, " ")} · {String(p.seriesKey ?? "").replace(/_/g, " ")}
              </p>
              <p className="mt-2 text-sm text-stone-700">{p.rawNotes}</p>
              <p className="mt-3 whitespace-pre-line border-l-2 border-stone-200 pl-3 text-sm">
                {p.generations?.[0]?.captions?.[0] ?? ""}
              </p>
              <Link href={`/post/${String(p._id)}`} className="mt-3 inline-block text-sm font-medium text-living underline">
                Open and place it
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
