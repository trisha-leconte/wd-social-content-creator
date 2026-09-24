import "./env";
import { dbConnect } from "@/lib/db";
import Bucket from "@/models/Bucket";
import Series from "@/models/Series";
import WeeklySlot from "@/models/WeeklySlot";
import StrategyProfile from "@/models/StrategyProfile";
import StoryPrompt from "@/models/StoryPrompt";
import BlogProfile from "@/models/BlogProfile";
import { BUCKETS, SERIES, WEEKLY_SLOTS, STRATEGY_PROFILE, BELIEF_PROFILE, STORY_PROMPTS } from "@/seed/strategy";
import { BLOG_RULES } from "@/lib/blog/rules";

async function main() {
  await dbConnect();

  for (const b of BUCKETS) await Bucket.updateOne({ key: b.key }, b, { upsert: true });
  for (const s of SERIES) await Series.updateOne({ key: s.key }, s, { upsert: true });
  for (const w of WEEKLY_SLOTS) await WeeklySlot.updateOne({ key: w.key }, w, { upsert: true });

  await StrategyProfile.updateOne(
    { singleton: "the-one" },
    { ...STRATEGY_PROFILE, ...BELIEF_PROFILE },
    { upsert: true }
  );

  await BlogProfile.updateOne({ singleton: "the-one" }, BLOG_RULES, { upsert: true });

  await StoryPrompt.deleteMany({});
  await StoryPrompt.insertMany(STORY_PROMPTS.map((text) => ({ text })));

  console.log(
    `Seeded ${BUCKETS.length} buckets, ${SERIES.length} series, ${WEEKLY_SLOTS.length} slots, ${STORY_PROMPTS.length} story prompts, and the blog rules.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
