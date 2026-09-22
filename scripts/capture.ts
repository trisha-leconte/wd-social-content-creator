import "./env";
import { captureStory } from "@/lib/capture";

async function main() {
  const story = process.argv.slice(2).join(" ");
  try {
    const out = await captureStory(story);
    console.log(`\n  bucket: ${out.bucketKey.replace(/_/g, " ")}`);
    console.log(`  series: ${out.seriesKey.replace(/_/g, " ")}`);
    console.log(`  why:    ${out.reason}\n`);
    console.log(out.caption);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    console.log(`\n  ✓ saved to Captured — open ${base}/post/${out.postId}\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n  ${(e as Error).message}\n`);
    process.exit(1);
  }
}

main();
