import "dotenv/config";
import { isConnected } from "@/lib/wealthdaily/client";
import * as source from "@/lib/wealthdaily/source";

const PROBES: [string, () => Promise<unknown>][] = [
  ["getTodaysCardCandidates", () => source.getTodaysCardCandidates(1)],
  ["getDeckCatalogue", () => source.getDeckCatalogue()],
  ["getRecentlyShipped", () => source.getRecentlyShipped()],
  ["getProofCandidates", () => source.getProofCandidates()],
  ["getAuthorSignals", () => source.getAuthorSignals()],
];

async function main() {
  if (!isConnected()) {
    console.log("WEALTH_DAILY_DATABASE_URL is not set — nothing to check.");
    process.exit(0);
  }

  let failed = 0;
  for (const [name, run] of PROBES) {
    try {
      const rows = await run();
      console.log(`  ok    ${name} (${Array.isArray(rows) ? rows.length : 0} rows)`);
    } catch (e) {
      failed += 1;
      console.log(`  BROKE ${name}: ${(e as Error).message}`);
    }
  }
  console.log(failed === 0 ? "\nAll source queries still work." : `\n${failed} query/queries need updating.`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
