import type { MixRow } from "@/lib/mix";

const COLOR: Record<string, string> = {
  LIVING_IT: "bg-living",
  PEOPLE_LIVING_IT: "bg-people",
  THE_IDEA: "bg-idea",
  BEHIND_THE_WORLD: "bg-build",
};

export function MixBar({ rows }: { rows: MixRow[] }) {
  const any = rows.some((r) => r.count > 0);
  return (
    <div>
      <div className="flex h-9 overflow-hidden rounded">
        {rows.map((r) => (
          <div
            key={r.bucketKey}
            className={`${COLOR[r.bucketKey]} flex items-center justify-center text-xs font-semibold text-white`}
            style={{ flexGrow: any ? r.actualPercent || 0.5 : r.targetPercent }}
            title={`${r.bucketKey}: ${r.actualPercent}% of the last 30 days (target ${r.targetPercent}%)`}
          >
            {any ? `${r.actualPercent}%` : `${r.targetPercent}%`}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {any ? "Your last 30 days against the 40/25/20/15 target." : "Target mix — nothing posted yet."}
      </p>
    </div>
  );
}
