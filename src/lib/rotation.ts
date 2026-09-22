/**
 * Pick the least recently used CTA. `recent` is newest-first; a CTA absent
 * from it has never been used and wins outright.
 */
export function nextCta(rotation: string[], recent: string[]): string {
  if (rotation.length === 0) throw new Error("CTA rotation is empty");
  const scored = rotation.map((cta) => {
    const idx = recent.indexOf(cta);
    return { cta, staleness: idx === -1 ? Number.POSITIVE_INFINITY : idx };
  });
  scored.sort((a, b) => b.staleness - a.staleness);
  return scored[0].cta;
}

export function firstWords(caption: string, n = 6): string {
  return caption.trim().split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

/** Openers of the most recent captions, newest first, blanks removed. */
export function recentOpeners(captions: string[], n = 8): string[] {
  return captions
    .filter((c) => c.trim().length > 0)
    .slice(-n)
    .reverse()
    .map((c) => firstWords(c));
}
