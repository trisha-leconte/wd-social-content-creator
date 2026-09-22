import Link from "next/link";
import { getCoverageGaps, getDeckCatalogue } from "@/lib/wealthdaily/source";
import { isConnected } from "@/lib/wealthdaily/client";
import { postedProductIds } from "@/lib/posts";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  await requireUserId();
  const [all, gaps] = await Promise.all([getDeckCatalogue(), getCoverageGaps(await postedProductIds())]);
  const gapIds = new Set(gaps.map((g) => g.productId));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Coverage</h1>
      <p className="mb-8 text-sm text-stone-500">
        Everything you&apos;ve made, and whether you&apos;ve ever posted about it.
      </p>

      {!isConnected() && (
        <p className="mb-6 rounded border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Wealth Daily isn&apos;t connected. Set WEALTH_DAILY_DATABASE_URL to see your decks here.
        </p>
      )}

      <ul className="divide-y divide-stone-200 rounded border border-stone-200">
        {all.map((d) => (
          <li key={d.productId} className="flex items-center justify-between p-3 text-sm">
            <span>{d.title} <span className="text-stone-400">· {d.cardCount} cards</span></span>
            <span className={gapIds.has(d.productId) ? "text-red-700" : "text-living"}>
              {gapIds.has(d.productId) ? "never posted" : "covered"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
