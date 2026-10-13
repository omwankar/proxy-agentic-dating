import { NextRequest, NextResponse } from "next/server";
import { runDates, runMatchmaking, type RunProgress } from "@/lib/matchmaker";
import { getDates, getPeople, getPreScores } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// In-memory job state (single server process).
type Job = { kind: "matchmake" | "dates"; progress: RunProgress; status: "running" | "done" | "error"; error?: string; startedAt: string };
const g = globalThis as unknown as { __jobs?: Record<string, Job> };
g.__jobs ??= {};
const jobs = g.__jobs;

export async function GET() {
  const [people, dates, prescores] = await Promise.all([getPeople(), getDates(), getPreScores()]);
  const n = people.length;
  return NextResponse.json({
    people: n,
    totalPairs: (n * (n - 1)) / 2,
    prescored: Object.keys(prescores).length,
    dates: dates.length,
    jobs,
  });
}

/** POST /api/run { kind: "matchmake" | "dates", k? } — starts a background job */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { kind?: "matchmake" | "dates"; k?: number };
  const kind = body.kind;
  if (kind !== "matchmake" && kind !== "dates") return NextResponse.json({ error: "kind must be matchmake|dates" }, { status: 400 });
  if (jobs[kind]?.status === "running") return NextResponse.json({ ok: true, alreadyRunning: true, job: jobs[kind] });

  const job: Job = { kind, progress: { total: 0, done: 0, failed: 0 }, status: "running", startedAt: new Date().toISOString() };
  jobs[kind] = job;
  const onProgress = (p: RunProgress) => (job.progress = { ...p });
  const run = kind === "matchmake" ? runMatchmaking(onProgress) : runDates(body.k ?? 4, onProgress);
  run
    .then(() => (job.status = "done"))
    .catch((e) => {
      job.status = "error";
      job.error = e instanceof Error ? e.message : String(e);
    });
  return NextResponse.json({ ok: true, job });
}
