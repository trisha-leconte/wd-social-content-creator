import Link from "next/link";
import type { WeekRow } from "@/lib/today";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SlotCard({ row, isToday }: { row: WeekRow; isToday: boolean }) {
  const status = row.post?.status ?? "not started";
  return (
    <div className={`rounded border p-4 ${isToday ? "border-living ring-1 ring-living" : "border-stone-200"}`}>
      <p className="text-xs uppercase tracking-widest text-stone-500">
        {DAY[row.date.getDay()]} {row.date.getDate()}
      </p>
      <p className="mt-1 font-bold">{row.slot.bucketKey.replace(/_/g, " ")}</p>
      <p className="mt-0.5 text-xs text-stone-500">{row.slot.defaultSeriesKey.replace(/_/g, " ")}</p>
      <p className="mt-3 text-xs font-medium text-stone-600">{status}</p>
      {row.post ? (
        <Link href={`/post/${String(row.post._id)}`} className="mt-2 inline-block text-sm font-medium text-living underline">
          Open
        </Link>
      ) : (
        <Link
          href={`/post/new?slot=${row.slot.key}&date=${row.date.toISOString()}`}
          className="mt-2 inline-block text-sm font-medium text-living underline"
        >
          Write it
        </Link>
      )}
    </div>
  );
}
