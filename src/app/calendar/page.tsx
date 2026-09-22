import Link from "next/link";
import { dbConnect } from "@/lib/db";
import Post from "@/models/Post";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = {
  LIVING_IT: "bg-living",
  PEOPLE_LIVING_IT: "bg-people",
  THE_IDEA: "bg-idea",
  BEHIND_THE_WORLD: "bg-build",
};

export default async function CalendarPage() {
  await dbConnect();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const posts = await Post.find({ date: { $gte: start, $lt: end } }).lean();
  const daysInMonth = new Date(end.getTime() - 1).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = (start.getDay() + 6) % 7;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mb-8 mt-4 text-2xl font-bold tracking-tight">
        {start.toLocaleString("en", { month: "long", year: "numeric" })}
      </h1>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider text-stone-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const post = posts.find((p) => p.date && new Date(p.date).getDate() === day);
          return (
            <div key={day} className="aspect-square rounded border border-stone-200 p-1 text-xs">
              <span className="text-stone-400">{day}</span>
              {post && (
                <Link href={`/post/${String(post._id)}`}>
                  <span className={`mt-1 block h-2 rounded ${COLOR[String(post.bucketKey)] ?? "bg-stone-400"}`} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
