import "./env";
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
  let totalRows = 0;
  for (const [name, run] of PROBES) {
    try {
      const rows = await run();
      const n = Array.isArray(rows) ? rows.length : 0;
      totalRows += n;
      console.log(`  ok    ${name} (${n} rows)`);
    } catch (e) {
      failed += 1;
      console.log(`  BROKE ${name}: ${(e as Error).message}`);
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} query/queries need updating.`);
    process.exit(1);
  }

  // A query that runs but returns nothing looks identical to a healthy one.
  // It usually means the dev database is empty, or row-level security is
  // hiding every row from this role. Say so rather than reporting success.
  if (totalRows === 0) {
    console.log(
      "\nEvery query ran but returned nothing. Either the dev database has no\n" +
        "content (run npm run db:setup in wealth-daily-landing-v2), or RLS is\n" +
        "hiding it from this role (it needs BYPASSRLS, or explicit SELECT policies)."
    );
    process.exit(1);
  }

  console.log("\nAll source queries still work.");
  process.exit(0);
}

main();
