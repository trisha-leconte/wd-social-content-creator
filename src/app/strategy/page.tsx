import Link from "next/link";
import { dbConnect } from "@/lib/db";
import StrategyProfile from "@/models/StrategyProfile";
import { EditableList } from "@/components/EditableList";

export const dynamic = "force-dynamic";

export default async function StrategyPage() {
  await dbConnect();
  const profile = await StrategyProfile.findOne({ singleton: "the-one" }).lean();
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
    </main>
  );
}
