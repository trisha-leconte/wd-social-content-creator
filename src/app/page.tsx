import Link from "next/link";
import { todayView } from "@/lib/today";
import { MixBar } from "@/components/MixBar";
import { SlotCard } from "@/components/SlotCard";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await requireUserId();
  const view = await todayView();
  const today = new Date();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-stone-600">
        {["captured", "blog", "proof", "coverage", "library", "calendar", "strategy"].map((r) => (
          <Link key={r} href={`/${r}`} className="capitalize hover:text-stone-900">{r}</Link>
        ))}
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">
        {view.todaySlot
          ? `Today you're posting ${view.todaySlot.bucketKey.replace(/_/g, " ")}`
          : "Nothing scheduled today"}
      </h1>
      {view.storyPrompt && (
        <p className="mt-3 rounded bg-stone-100 p-3 text-sm text-stone-700">Stories idea: {view.storyPrompt}</p>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-widest text-stone-500">This week</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {view.week.map((row) => (
          <SlotCard key={row.slot.key} row={row} isToday={row.date.toDateString() === today.toDateString()} />
        ))}
      </div>

      {view.captured.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-widest text-stone-500">
            Captured ({view.captured.length})
          </h2>
          <ul className="divide-y divide-stone-200 rounded border border-stone-200">
            {view.captured.map((p) => (
              <li key={String(p._id)} className="p-3">
                <Link href={`/post/${String(p._id)}`} className="text-sm hover:underline">
                  <span className="mr-2 text-xs uppercase tracking-wider text-stone-500">
                    {String(p.bucketKey).replace(/_/g, " ")}
                  </span>
                  {String(p.rawNotes ?? "").slice(0, 90)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-widest text-stone-500">Your mix</h2>
      <MixBar rows={view.mix} />
    </main>
  );
}
