"use client";

import { useEffect, useState } from "react";
import type { CardCandidate, Lens, PlatformKey } from "@/types";

type Draft = {
  captions: string[];
  hooks: string[];
  cta: string;
  platformVariants: Record<PlatformKey, string>;
  suggestedVisual: string;
  storyVersion: string;
};

export function Composer({
  postId,
  initialNotes,
  initialLens,
}: {
  postId: string;
  initialNotes: string;
  initialLens: Lens;
}) {
  const [cards, setCards] = useState<CardCandidate[]>([]);
  const [card, setCard] = useState<CardCandidate | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [lens, setLens] = useState<Lens>(initialLens);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/agent/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, rawNotes: notes, lens, card }),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setDraft(body.draft);
    setChosen(body.draft.captions[0]);
  }

  async function markPosted() {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chosenCaption: chosen }),
    });
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_posted", platforms: ["instagram"] }),
    });
    location.href = "/";
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">The card you did</label>
        <select
          className="mt-2 w-full rounded border border-stone-300 p-2 text-sm"
          value={card?.activityId ?? ""}
          onChange={(e) => setCard(cards.find((c) => c.activityId === e.target.value) ?? null)}
        >
          <option value="">— no card, just a story —</option>
          {cards.map((c) => (
            <option key={c.activityId} value={c.activityId}>
              {c.productTitle}: {c.text.slice(0, 70)}
            </option>
          ))}
        </select>
        {cards.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">
            No card list — Wealth Daily isn&apos;t connected. Write from scratch below.
          </p>
        )}
      </section>

      <section>
        <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">What happened?</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="really didn't want to · trader joe's · guy teared up"
          className="mt-2 w-full rounded border border-stone-300 p-3 text-sm"
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">Lens</span>
        {(["consumer", "creator"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLens(l)}
            className={`rounded px-3 py-1 text-sm ${lens === l ? "bg-stone-900 text-white" : "bg-stone-100"}`}
          >
            {l === "consumer" ? "Something you can LIVE" : "What YOUR audience could LIVE"}
          </button>
        ))}
      </section>

      <button
        onClick={generate}
        disabled={busy}
        className="rounded bg-living px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Writing…" : draft ? "Write it again" : "Write the caption"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {draft && (
        <>
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Pick one, then edit it</p>
            <div className="mt-2 flex flex-col gap-2">
              {draft.captions.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setChosen(c)}
                  className={`whitespace-pre-line rounded border p-3 text-left text-sm ${
                    chosen === c ? "border-living bg-green-50" : "border-stone-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              rows={10}
              className="mt-3 w-full whitespace-pre-line rounded border border-stone-300 p-3 text-sm"
            />
          </section>

          <section className="grid gap-3 text-sm sm:grid-cols-3">
            {(Object.keys(draft.platformVariants) as PlatformKey[]).map((p) => (
              <div key={p} className="rounded border border-stone-200 p-3">
                <p className="mb-1 text-xs uppercase tracking-wider text-stone-500">{p.replace("_", " / ")}</p>
                <p className="whitespace-pre-line">{draft.platformVariants[p]}</p>
              </div>
            ))}
          </section>

          <section className="rounded bg-stone-100 p-3 text-sm">
            <p><strong>Shoot this:</strong> {draft.suggestedVisual}</p>
            <p className="mt-2"><strong>Stories version:</strong> {draft.storyVersion}</p>
            <p className="mt-2"><strong>Ask:</strong> {draft.cta}</p>
          </section>

          <button onClick={markPosted} className="rounded bg-stone-900 px-4 py-2 font-medium text-white">
            Mark posted
          </button>
        </>
      )}
    </div>
  );
}
