"use client";

import { useState } from "react";

type OutlineItem = { heading: string; level: number; notes: string };
type Post = {
  _id: string;
  topic: string;
  status: string;
  targetKeyword?: string;
  searchIntent?: string;
  titleOptions?: string[];
  chosenTitle?: string;
  slug?: string;
  metaDescription?: string;
  outline?: OutlineItem[];
  sourceRefs?: { title: string; detail: string }[];
  bodyMarkdown?: string;
  wordCount?: number;
};

export function BlogComposer({ initial }: { initial: Post }) {
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState<null | "outline" | "draft">(null);
  const [error, setError] = useState<string | null>(null);

  async function parseJson(res: Response): Promise<{ error?: string; post?: Post } | null> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function run(action: "outline" | "draft") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/blog/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setError(
          body?.error ??
            "The server returned an unreadable response. Wait a moment and try again."
        );
        return;
      }
      setPost(body!.post!);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function save(patch: Partial<Post>) {
    setError(null);
    try {
      const res = await fetch(`/api/blog/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        setError(
          body?.error
            ? `Your change wasn't saved: ${body.error}`
            : "Your change wasn't saved — the server returned an unreadable response. Try again."
        );
        return;
      }
      setPost(body!.post!);
    } catch {
      setError("Your change wasn't saved — could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => run("outline")}
        disabled={busy !== null}
        className="self-start rounded bg-living px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy === "outline" ? "Thinking…" : post.outline?.length ? "Outline it again" : "Outline it"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {post.outline?.length ? (
        <>
          <section className="rounded border border-stone-200 p-4 text-sm">
            <p className="text-xs uppercase tracking-widest text-stone-500">Targeting</p>
            <p className="mt-1">
              <strong>{post.targetKeyword}</strong>{" "}
              <span className="text-stone-500">· {post.searchIntent}</span>
            </p>
            <p className="mt-2 text-xs text-stone-500">
              No search volume — there is no keyword tool connected. This is the agent&apos;s judgement.
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Title</p>
            <div className="mt-2 flex flex-col gap-2">
              {post.titleOptions?.map((t) => (
                <button
                  key={t}
                  onClick={() => save({ chosenTitle: t })}
                  className={`rounded border p-3 text-left text-sm ${
                    post.chosenTitle === t ? "border-living bg-green-50" : "border-stone-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">/{post.slug}</p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Meta description ({post.metaDescription?.length ?? 0} chars)
            </p>
            <textarea
              defaultValue={post.metaDescription}
              onBlur={(e) => save({ metaDescription: e.target.value })}
              rows={3}
              className="mt-2 w-full rounded border border-stone-300 p-3 text-sm"
            />
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Outline</p>
            <ul className="mt-2 flex flex-col gap-2">
              {post.outline.map((o, i) => (
                <li key={i} className={`text-sm ${o.level === 3 ? "ml-5" : ""}`}>
                  <strong>{o.heading}</strong>
                  <span className="block text-xs text-stone-500">{o.notes}</span>
                </li>
              ))}
            </ul>
          </section>

          {post.sourceRefs?.length ? (
            <section className="rounded bg-stone-100 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-stone-500">Citing your real content</p>
              <ul className="mt-1">
                {post.sourceRefs.map((s, i) => (
                  <li key={i}>
                    {s.title} <span className="text-stone-500">— {s.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <button
            onClick={() => run("draft")}
            disabled={busy !== null}
            className="self-start rounded bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy === "draft" ? "Writing…" : post.bodyMarkdown ? "Write it again" : "Write the article"}
          </button>
        </>
      ) : null}

      {post.bodyMarkdown ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Draft ({post.wordCount} words)
          </p>
          <textarea
            defaultValue={post.bodyMarkdown}
            onBlur={(e) => save({ bodyMarkdown: e.target.value })}
            rows={28}
            className="mt-2 w-full rounded border border-stone-300 p-3 font-mono text-xs"
          />
        </section>
      ) : null}
    </div>
  );
}
