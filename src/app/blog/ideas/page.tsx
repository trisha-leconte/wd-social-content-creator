import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getDeckCatalogue } from "@/lib/wealthdaily/source";
import { isConnected } from "@/lib/wealthdaily/client";
import { mineIdeas } from "@/lib/blog/ideas";

export const dynamic = "force-dynamic";

export default async function BlogIdeasPage() {
  await requireUserId();
  const ideas = mineIdeas(await getDeckCatalogue());

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/blog" className="text-sm text-stone-500 hover:underline">← Blog</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Ideas from your catalogue</h1>
      <p className="mb-2 text-sm text-stone-500">
        Articles only you can write, because you have the actual exercises.
      </p>
      <p className="mb-8 text-xs text-stone-500">
        No search volume behind these — there&apos;s no keyword tool connected. They come from what
        you&apos;ve made.
      </p>

      {!isConnected() && (
        <p className="mb-6 rounded border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Wealth Daily isn&apos;t connected, so there&apos;s no catalogue to mine. Set
          WEALTH_DAILY_DATABASE_URL, or type a topic on the Blog screen.
        </p>
      )}

      {isConnected() && ideas.length === 0 ? (
        <p className="rounded border border-dashed border-stone-300 p-6 text-sm text-stone-500">
          Your catalogue is connected, but no product has cards yet, so there&apos;s nothing to mine
          for ideas. Add cards to a product, or type a topic on the Blog screen.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ideas.map((idea, i) => (
            <li key={i} className="rounded border border-stone-200 p-4">
              <p className="font-medium">{idea.topic}</p>
              <p className="mt-1 text-xs text-stone-500">{idea.why}</p>
              <Link
                href={`/blog/new?topic=${encodeURIComponent(idea.topic)}&audience=${idea.audience}`}
                className="mt-3 inline-block text-sm font-medium text-living underline"
              >
                Write this one
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
