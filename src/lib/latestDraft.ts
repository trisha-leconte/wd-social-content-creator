import type { PlatformKey } from "@/types";

export type Draft = {
  captions: string[];
  hooks: string[];
  cta: string;
  platformVariants: Record<PlatformKey, string>;
  suggestedVisual: string;
  storyVersion: string;
};

type GenerationLike = Partial<Draft> & { createdAt?: string | Date };

/**
 * The most recent generation on a post, so reopening it restores what was
 * written rather than showing an empty composer while the captions sit
 * invisible in the database.
 *
 * Sorted by `createdAt` rather than trusting array order, because a
 * regenerate appends and the array order has no guarantee once documents
 * round-trip through Mongo. A generation with no captions is treated as
 * absent — restoring it would hand back an empty editor.
 */
export function latestDraft(generations?: GenerationLike[] | null): Draft | null {
  if (!generations?.length) return null;

  const usable = generations.filter((g) => (g.captions?.length ?? 0) > 0);
  if (!usable.length) return null;

  const newest = usable.reduce((best, g) => {
    const t = g.createdAt ? new Date(g.createdAt).getTime() : NaN;
    const bestT = best.createdAt ? new Date(best.createdAt).getTime() : NaN;
    if (Number.isNaN(t)) return best;
    if (Number.isNaN(bestT)) return g;
    return t >= bestT ? g : best;
  }, usable[usable.length - 1]);

  return {
    captions: newest.captions ?? [],
    hooks: newest.hooks ?? [],
    cta: newest.cta ?? "",
    platformVariants: (newest.platformVariants ?? {}) as Record<PlatformKey, string>,
    suggestedVisual: newest.suggestedVisual ?? "",
    storyVersion: newest.storyVersion ?? "",
  };
}
