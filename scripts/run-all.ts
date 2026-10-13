/**
 * Run the matchmaker over every pair, then send each agent on its top-K dates.
 *   npm run run-all            (K = 4)
 *   npm run run-all -- --k 3
 *   npm run run-all -- --skip-dates
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { runDates, runMatchmaking } from "../src/lib/matchmaker";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const k = Number(arg("--k") ?? 4);
  console.log("Matchmaker pre-scoring all pairs…");
  let last = -1;
  const m = await runMatchmaking((p) => {
    const pct = p.total ? Math.floor((p.done / p.total) * 10) : 10;
    if (pct !== last) {
      last = pct;
      console.log(`  ${p.done}/${p.total} pairs (${p.failed} failed)`);
    }
  });
  console.log(`Pre-scored ${m.done - m.failed}/${m.total} pairs.`);

  if (process.argv.includes("--skip-dates")) return;
  console.log(`\nSending agents on dates (top-${k} per person)…`);
  const d = await runDates(k, (p) => console.log(`  ${p.done}/${p.total} dates (${p.failed} failed)`));
  console.log(`Completed ${d.done - d.failed}/${d.total} dates.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
