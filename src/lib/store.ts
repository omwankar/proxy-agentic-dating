import { promises as fs } from "fs";
import path from "path";
import type { DateRecord, Person, PreScore } from "./types";

/** Seed JSON shipped with the deployment. Readable on Vercel, not writable. */
const BUNDLED_DIR = path.join(process.cwd(), "data");
/**
 * Vercel lambdas can only create files under /tmp. Locally this is the same
 * folder as the seed data, so `npm run dev` keeps writing data/*.json.
 */
const WRITABLE_DIR = process.env.VERCEL ? path.join("/tmp", "proxy-data") : BUNDLED_DIR;
const RAW_DIR = path.join(WRITABLE_DIR, "raw");

/** Same-request cache so a scrape still finishes if the disk write fails. */
const memoryRaw = new Map<string, unknown>();

export function imageCacheDir() {
  return path.join(WRITABLE_DIR, "img");
}

async function ensureDirs() {
  await fs.mkdir(RAW_DIR, { recursive: true });
}

// Simple per-file async mutex so concurrent writes don't clobber each other.
const locks = new Map<string, Promise<void>>();
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  locks.set(key, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === next) locks.delete(key);
  }
}

async function readFileJson<T>(file: string): Promise<T | undefined> {
  try {
    const txt = await fs.readFile(file, "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return undefined;
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  // On Vercel, anything added in this instance lives under /tmp. Otherwise read the bundled seed.
  if (WRITABLE_DIR !== BUNDLED_DIR) {
    const overlay = await readFileJson<T>(path.join(WRITABLE_DIR, file));
    if (overlay !== undefined) return overlay;
  }
  const bundled = await readFileJson<T>(path.join(BUNDLED_DIR, file));
  return bundled ?? fallback;
}

async function writeJson(file: string, value: unknown) {
  await ensureDirs();
  const full = path.join(WRITABLE_DIR, file);
  const tmp = full + ".tmp";
  const body = JSON.stringify(value, null, 2);
  await fs.writeFile(tmp, body, "utf8");
  try {
    await fs.rename(tmp, full);
  } catch {
    // OneDrive sometimes locks the destination during rename.
    await fs.writeFile(full, body, "utf8");
    await fs.unlink(tmp).catch(() => {});
  }
}

// ---------- People ----------
export async function getPeople(): Promise<Person[]> {
  return readJson<Person[]>("people.json", []);
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const people = await getPeople();
  return people.find((p) => p.id === id);
}

export async function savePerson(person: Person): Promise<void> {
  await withLock("people", async () => {
    const people = await getPeople();
    const idx = people.findIndex((p) => p.id === person.id);
    if (idx >= 0) people[idx] = person;
    else people.push(person);
    await writeJson("people.json", people);
  });
}

export async function deletePerson(id: string): Promise<void> {
  await withLock("people", async () => {
    const people = await getPeople();
    await writeJson(
      "people.json",
      people.filter((p) => p.id !== id)
    );
  });
}

// ---------- Raw scrape cache ----------
export async function getRaw<T>(key: string): Promise<T | undefined> {
  if (memoryRaw.has(key)) return memoryRaw.get(key) as T;
  const writable = await readFileJson<T>(path.join(RAW_DIR, `${key}.json`));
  if (writable !== undefined) return writable;
  return readFileJson<T>(path.join(BUNDLED_DIR, "raw", `${key}.json`));
}

export async function saveRaw(key: string, value: unknown): Promise<void> {
  memoryRaw.set(key, value);
  try {
    await ensureDirs();
    await fs.writeFile(path.join(RAW_DIR, `${key}.json`), JSON.stringify(value), "utf8");
  } catch (err) {
    console.error("raw cache write skipped", err);
  }
}

// ---------- Dates ----------
export async function getDates(): Promise<DateRecord[]> {
  return readJson<DateRecord[]>("dates.json", []);
}

export async function getDate(id: string): Promise<DateRecord | undefined> {
  const dates = await getDates();
  return dates.find((d) => d.id === id);
}

export async function saveDate(date: DateRecord): Promise<void> {
  await withLock("dates", async () => {
    const dates = await getDates();
    const idx = dates.findIndex((d) => d.id === date.id);
    if (idx >= 0) dates[idx] = date;
    else dates.push(date);
    await writeJson("dates.json", dates);
  });
}

// ---------- PreScores ----------
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export async function getPreScores(): Promise<Record<string, PreScore>> {
  return readJson<Record<string, PreScore>>("prescores.json", {});
}

export async function savePreScore(ps: PreScore): Promise<void> {
  await withLock("prescores", async () => {
    const all = await getPreScores();
    all[pairKey(ps.aId, ps.bId)] = ps;
    await writeJson("prescores.json", all);
  });
}

export async function savePreScores(list: PreScore[]): Promise<void> {
  await withLock("prescores", async () => {
    const all = await getPreScores();
    for (const ps of list) all[pairKey(ps.aId, ps.bId)] = ps;
    await writeJson("prescores.json", all);
  });
}
