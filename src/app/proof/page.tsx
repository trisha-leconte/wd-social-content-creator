import Link from "next/link";
import { getProofCandidates } from "@/lib/wealthdaily/source";
import { isConnected } from "@/lib/wealthdaily/client";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProofPage() {
  await requireUserId();
  const proof = await getProofCandidates();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Proof</h1>
      <p className="mb-8 text-sm text-stone-500">
        Published testimonials — people gave these to you to publish. Thursday&apos;s material.
      </p>

      {!isConnected() && (
        <p className="mb-6 rounded border border-stone-300 bg-stone-100 p-4 text-sm text-stone-600">
          Wealth Daily isn&apos;t connected, so there&apos;s nothing to list. Set WEALTH_DAILY_DATABASE_URL.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {proof.map((p, i) => (
          <li key={i} className="rounded border border-stone-200 p-4">
            <p className="text-sm">“{p.quote}”</p>
            <p className="mt-2 text-xs text-stone-500">{p.name}{p.detail ? ` · ${p.detail}` : ""}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
