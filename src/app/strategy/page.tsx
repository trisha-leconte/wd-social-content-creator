import Link from "next/link";
import { dbConnect } from "@/lib/db";
import StrategyProfile from "@/models/StrategyProfile";
import BlogProfile from "@/models/BlogProfile";
import { EditableList } from "@/components/EditableList";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  await requireUserId();
  await dbConnect();
  const [profile, blog] = await Promise.all([
    StrategyProfile.findOne({ singleton: "the-one" }).lean(),
    BlogProfile.findOne({ singleton: "the-one" }).lean(),
  ]);
  if (!profile) {
    return <main className="p-10 text-sm">Run <code>npm run seed</code> first.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Today</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Strategy</h1>
      <p className="mb-8 text-sm text-stone-500">
        This is what the agent knows. Change it here and every future draft changes with it.
      </p>

      <section className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">The one story</p>
        <p className="mt-2 rounded border-l-2 border-living bg-white p-4 text-sm">{profile.oneStory}</p>
      </section>

      <EditableList label="Voice rules" field="voiceRules" initial={profile.voiceRules ?? []} />
      <EditableList label="Never do this" field="doNotList" initial={profile.doNotList ?? []} />
      <EditableList label="CTA rotation" field="ctaRotation" initial={profile.ctaRotation ?? []} />
      <EditableList label="Opener bank" field="openerBank" initial={profile.openerBank ?? []} />

      <h2 className="mb-4 mt-12 border-t border-stone-200 pt-8 text-sm font-semibold uppercase tracking-widest text-stone-500">
        Blog rules
      </h2>
      <p className="mb-6 text-sm text-stone-500">
        These shape articles, not captions. Your voice above is shared by both.
      </p>
      <EditableList label="How a post is built" field="blog.structureRules" initial={blog?.structureRules ?? []} />
      <EditableList label="What goes in it" field="blog.contentRules" initial={blog?.contentRules ?? []} />
      <EditableList label="Never in an article" field="blog.doNotList" initial={blog?.doNotList ?? []} />
    </main>
  );
}
