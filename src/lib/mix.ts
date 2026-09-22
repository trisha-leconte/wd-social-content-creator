import { BUCKET_KEYS, type BucketKey } from "@/types";

export type MixRow = {
  bucketKey: BucketKey;
  count: number;
  actualPercent: number;
  targetPercent: number;
  gap: number;
};

export function computeMix(
  posts: { bucketKey: BucketKey }[],
  targets: Record<BucketKey, number>
): MixRow[] {
  const total = posts.length;
  return BUCKET_KEYS.map((bucketKey) => {
    const count = posts.filter((p) => p.bucketKey === bucketKey).length;
    const actualPercent = total === 0 ? 0 : Math.round((count / total) * 100);
    const targetPercent = targets[bucketKey];
    return { bucketKey, count, actualPercent, targetPercent, gap: actualPercent - targetPercent };
  }).sort((a, b) => b.targetPercent - a.targetPercent);
}
