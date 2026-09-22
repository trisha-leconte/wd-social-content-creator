import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import StrategyProfile from "@/models/StrategyProfile";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await dbConnect();
  const [buckets, series, profile] = await Promise.all([
    Bucket.find().sort({ targetPercent: -1 }).lean(),
    Series.find().lean(),
    StrategyProfile.findOne({ singleton: "the-one" }).lean(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mb-8 mt-4 text-2xl font-bold tracking-tight">Library</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Buckets</h2>
      <div className="mb-10 flex flex-col gap-4">
        {buckets.map((b) => (
          <div key={b.key} className="rounded border border-stone-200 p-4">
            <p className="font-bold">{b.name} <span className="text-stone-400">· {b.targetPercent}%</span></p>
            <p className="mt-1 text-sm text-stone-600">{b.description}</p>
            <p className="mt-2 text-xs text-stone-500">NOT: {b.whatItIsNot}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Series</h2>
      <div className="mb-10 flex flex-col gap-4">
        {series.map((s) => (
          <div key={s.key} className="rounded border border-stone-200 p-4">
            <p className="font-bold">{s.name}</p>
            <p className="mt-1 text-xs text-stone-500">{s.structureSkeleton}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-stone-600">
              {s.promptQuestions?.map((q) => <li key={q}>{q}</li>)}
            </ul>
            {s.examples?.map((e, i) => (
              <p key={i} className="mt-3 whitespace-pre-line border-l-2 border-stone-200 pl-3 text-sm">{e}</p>
            ))}
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Pinned posts</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {profile?.pinnedPosts?.map((p) => (
          <div key={p.title} className="rounded border border-stone-200 p-4">
            <p className="text-sm font-bold">{p.title}</p>
            <p className="mt-1 text-xs text-stone-600">{p.brief}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-stone-500">Bio</h2>
      <p className="text-sm text-stone-700">{profile?.profileBio}</p>
    </main>
  );
}
