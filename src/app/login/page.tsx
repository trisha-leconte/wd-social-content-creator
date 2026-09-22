"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) router.push("/");
    else setError((await res.json()).error ?? "Sign in failed.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold tracking-tight">LIVE IT Engine</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" autoComplete="username" required
          className="rounded border border-stone-300 px-3 py-2"
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" autoComplete="current-password" required
          className="rounded border border-stone-300 px-3 py-2"
        />
        <button type="submit" disabled={busy} className="rounded bg-living px-3 py-2 font-medium text-white disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
