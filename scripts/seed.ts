/**
 * Seed the site with real people from data/seed-people.json.
 *   npm run seed            -> scrape (cached) + analyze everyone not yet in people.json
 *   npm run seed -- --only "Bill Gates"   -> just one
 *   npm run seed -- --limit 5             -> first N entries
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { promises as fs } from "fs";
import path from "path";
import { scrapeInstagramBatch, scrapeLinkedInBatch, scrapeInstagram, scrapeLinkedIn, parseInstagramUsername, parseLinkedInUsername } from "../src/lib/apify";
import { analyzePerson, personIdFrom } from "../src/lib/analyze";
import { getPeople, savePerson } from "../src/lib/store";
import type { Person } from "../src/lib/types";

type Seed = { name: string; linkedin: string; instagram: string };

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

async function main() {
  const raw = await fs.readFile(path.join(process.cwd(), "data", "seed-people.json"), "utf8");
  let seeds = JSON.parse(raw) as Seed[];
  const only = arg("--name") ?? arg("--only");
  const limit = arg("--limit");
  if (only) seeds = seeds.filter((s) => s.name.toLowerCase().includes(only.toLowerCase()));
  if (limit) seeds = seeds.slice(0, Number(limit));

  const existing = new Set((await getPeople()).map((p) => p.id));
  const todo = seeds.filter((s) => !existing.has(personIdFrom(s.linkedin, s.instagram)));
  console.log(`${seeds.length} seeds, ${existing.size} already built, ${todo.length} to do.`);
  if (!todo.length) return;

  // 1) Instagram in one batch run (cheap, cached).
  console.log("Scraping Instagram profiles in one batch…");
  const ig = await scrapeInstagramBatch(todo.map((s) => s.instagram));
  for (const [u, why] of Object.entries(ig.failed)) console.log(`  ✗ IG @${u}: ${why}`);
  console.log(`  ✓ ${ig.ok.length} Instagram profiles available`);

  // 2) LinkedIn per person + analysis.
  console.log("Scraping LinkedIn profiles in one batch…");
  const li = await scrapeLinkedInBatch(todo.map((s) => s.linkedin));
  for (const [u, why] of Object.entries(li.failed)) console.log(`  ✗ LI ${u}: ${why}`);
  console.log(`  ✓ ${li.ok.length} LinkedIn profiles available`);

  const okIg = new Set(ig.ok);
  const okLi = new Set(li.ok);
  const results = await mapLimit(todo, 4, async (s) => {
    const igUser = parseInstagramUsername(s.instagram);
    const liUser = parseLinkedInUsername(s.linkedin).toLowerCase();
    if (!okIg.has(igUser)) return { s, ok: false as const, why: `instagram @${igUser} unavailable` };
    if (!okLi.has(liUser)) return { s, ok: false as const, why: `linkedin ${liUser} unavailable` };
    try {
      const igData = await scrapeInstagram(s.instagram); // from cache
      const liData = await scrapeLinkedIn(s.linkedin);
      const analysis = await analyzePerson(liData, igData);
      const person: Person = {
        id: personIdFrom(s.linkedin, s.instagram),
        name: liData.fullName ?? igData.fullName ?? s.name,
        headline: liData.headline ?? igData.biography?.split("\n")[0] ?? "",
        location: liData.location,
        photo: igData.photo ?? liData.photo,
        links: { linkedin: liData.url, instagram: igData.url },
        linkedin: liData,
        instagram: igData,
        analysis,
        createdAt: new Date().toISOString(),
      };
      await savePerson(person);
      console.log(`  ✓ ${person.name} — ${analysis.hobbies.slice(0, 3).join(", ")}`);
      return { s, ok: true as const };
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      console.log(`  ✗ ${s.name}: ${why}`);
      return { s, ok: false as const, why };
    }
  });

  const failed = results.filter((r) => !r.ok);
  const total = (await getPeople()).length;
  console.log(`\nDone. ${total} people in data/people.json. ${failed.length} failed:`);
  for (const f of failed) console.log(`  - ${f.s.name}: ${"why" in f ? f.why : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
