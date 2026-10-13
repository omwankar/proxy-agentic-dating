import { chatJson } from "./claude";
import type { DateRecord, Person, PreScore, RankingEntry } from "./types";
import { getDates, getPeople, getPreScores, pairKey, savePreScores } from "./store";
import { runDate } from "./dating";

const MATCHMAKER_SYSTEM = `You are an experienced, candid matchmaker. You are given dating analyses of two people (each derived only from their public LinkedIn and Instagram). Estimate romantic compatibility before they meet: shared values, complementary needs, lifestyle fit, energy match, and any dealbreaker conflicts. Be discriminating: most pairs should land 30-65; reserve 80+ for genuinely strong fits and go below 30 when dealbreakers clash.`;

function brief(p: Person): string {
  const a = p.analysis;
  return `${p.name} — ${p.headline}${p.location ? ` (${p.location})` : ""}
Summary: ${a.summary}
Needs: ${a.needs.join("; ")}
Hobbies: ${a.hobbies.join(", ")}
Values: ${a.values.join(", ")}
Personality: ${a.personality.join(", ")}
Dealbreakers: ${a.dealbreakers.join("; ")}
Dating style: ${a.datingStyle}
Ideal partner: ${a.idealPartner}`;
}

export async function prescorePair(a: Person, b: Person): Promise<PreScore> {
  const res = await chatJson<{ score: number; reasons: string[] }>({
    system: MATCHMAKER_SYSTEM,
    user: `PERSON A:\n${brief(a)}\n\nPERSON B:\n${brief(b)}\n\nOutput JSON: { "score": <integer 0-100>, "reasons": ["3 short, specific reasons for the score, mixing positives and frictions"] }`,
    maxTokens: 400,
    temperature: 0.3,
  });
  return {
    aId: a.id,
    bId: b.id,
    score: Math.max(0, Math.min(100, Math.round(Number(res.score) || 0))),
    reasons: Array.isArray(res.reasons) ? res.reasons.map(String).slice(0, 4) : [],
    createdAt: new Date().toISOString(),
  };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface RunProgress {
  total: number;
  done: number;
  failed: number;
}

/** Pre-score all pairs that have no prescore yet. */
export async function runMatchmaking(onProgress?: (p: RunProgress) => void, concurrency = 6): Promise<RunProgress> {
  const people = await getPeople();
  const existing = await getPreScores();
  const pairs: [Person, Person][] = [];
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++)
      if (!existing[pairKey(people[i].id, people[j].id)]) pairs.push([people[i], people[j]]);

  const progress: RunProgress = { total: pairs.length, done: 0, failed: 0 };
  onProgress?.(progress);
  const buffer: PreScore[] = [];
  const flush = async () => {
    if (buffer.length) {
      const batch = buffer.splice(0, buffer.length);
      await savePreScores(batch);
    }
  };
  await mapLimit(pairs, concurrency, async ([a, b]) => {
    try {
      buffer.push(await prescorePair(a, b));
    } catch {
      progress.failed++;
    }
    progress.done++;
    if (buffer.length >= 10) await flush();
    onProgress?.(progress);
  });
  await flush();
  return progress;
}

/** For each person, pick their top-K prescored candidates who they have not dated yet; dedupe pairs; run dates. */
export async function runDates(k = 4, onProgress?: (p: RunProgress) => void, concurrency = 4): Promise<RunProgress> {
  const people = await getPeople();
  const prescores = await getPreScores();
  const dates = await getDates();
  const dated = new Set(dates.map((d) => pairKey(d.aId, d.bId)));
  const chosen = new Map<string, [Person, Person]>();

  for (const p of people) {
    const candidates = people
      .filter((q) => q.id !== p.id)
      .map((q) => ({ q, score: prescores[pairKey(p.id, q.id)]?.score ?? -1 }))
      .filter((c) => c.score >= 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
    for (const c of candidates) {
      const key = pairKey(p.id, c.q.id);
      if (!dated.has(key) && !chosen.has(key)) chosen.set(key, [p, c.q]);
    }
  }

  const pairs = [...chosen.values()];
  const progress: RunProgress = { total: pairs.length, done: 0, failed: 0 };
  onProgress?.(progress);
  let creditOut = false;
  await mapLimit(pairs, concurrency, async ([a, b]) => {
    if (creditOut) {
      progress.failed++;
      progress.done++;
      return;
    }
    try {
      await runDate(a, b);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/credit balance is too low|insufficient.?balance|quota|payment required/i.test(msg)) creditOut = true;
      progress.failed++;
    }
    progress.done++;
    onProgress?.(progress);
  });
  if (creditOut) throw new Error("LLM credit/quota is exhausted. Add credits, then run this again — finished dates are kept.");
  return progress;
}

export async function rankingsFor(personId: string, people?: Person[], dates?: DateRecord[], prescores?: Record<string, PreScore>): Promise<RankingEntry[]> {
  people = people ?? (await getPeople());
  dates = dates ?? (await getDates());
  prescores = prescores ?? (await getPreScores());
  const byId = new Map(people.map((p) => [p.id, p]));
  const me = byId.get(personId);
  if (!me) return [];

  const entries: RankingEntry[] = [];
  for (const other of people) {
    if (other.id === personId) continue;
    const key = pairKey(personId, other.id);
    const myDates = dates.filter((d) => pairKey(d.aId, d.bId) === key);
    if (myDates.length) {
      // Latest date wins. Rank from THIS person's perspective: weight own debrief more.
      const d = myDates[myDates.length - 1];
      const mine = d.aId === personId ? d.debriefA : d.debriefB;
      const theirs = d.aId === personId ? d.debriefB : d.debriefA;
      const score = Math.round((mine.score * 0.6 + theirs.score * 0.4) * 10 + (mine.wouldSeeAgain && theirs.wouldSeeAgain ? 3 : 0));
      entries.push({
        personId: other.id,
        name: other.name,
        photo: other.photo,
        headline: other.headline,
        score: Math.min(100, score),
        basis: "date",
        dateId: d.id,
        reasons: [...mine.highlights.slice(0, 2), ...mine.concerns.slice(0, 1)],
      });
    } else {
      const ps = prescores[key];
      if (!ps) continue;
      entries.push({
        personId: other.id,
        name: other.name,
        photo: other.photo,
        headline: other.headline,
        score: ps.score,
        basis: "prescore",
        reasons: ps.reasons,
      });
    }
  }
  // Dated candidates first (they carry real evidence), then prescored.
  return entries.sort((x, y) => (x.basis === y.basis ? y.score - x.score : x.basis === "date" ? -1 : 1));
}

export async function allRankings(): Promise<{ person: Person; ranking: RankingEntry[] }[]> {
  const people = await getPeople();
  const dates = await getDates();
  const prescores = await getPreScores();
  const out = [];
  for (const p of people) out.push({ person: p, ranking: await rankingsFor(p.id, people, dates, prescores) });
  return out;
}
