"use client";

import { useState } from "react";
import { buildFieldPayload } from "@/lib/fieldPayload";

export function EditableList({ label, field, initial }: { label: string; field: string; initial: string[] }) {
  const [lines, setLines] = useState(initial.join("\n"));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setState("saving");
    const value = lines.split("\n").map((l) => l.trim()).filter(Boolean);
    const payload = buildFieldPayload(field, value);
    await fetch("/api/strategy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setState("saved");
  }

  return (
    <section className="mb-8">
      <label className="text-xs font-semibold uppercase tracking-widest text-stone-500">{label}</label>
      <textarea
        value={lines}
        onChange={(e) => { setLines(e.target.value); setState("idle"); }}
        rows={Math.min(16, initial.length + 3)}
        className="mt-2 w-full rounded border border-stone-300 p-3 font-mono text-xs"
      />
      <button onClick={save} disabled={state === "saving"} className="mt-2 rounded bg-stone-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save"}
      </button>
      <p className="mt-1 text-xs text-stone-500">One per line. Every future draft uses these.</p>
    </section>
  );
}
