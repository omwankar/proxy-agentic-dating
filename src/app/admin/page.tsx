"use client";

import { useEffect, useState } from "react";

type Job = { kind: string; progress: { total: number; done: number; failed: number }; status: string; error?: string; startedAt: string };
type Status = { people: number; totalPairs: number; prescored: number; dates: number; jobs: Record<string, Job> };

export default function AdminPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [k, setK] = useState(4);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/run", { cache: "no-store" });
    setStatus(await res.json());
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  async function start(kind: "matchmake" | "dates") {
    setMsg(null);
    const res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, k }) });
    const j = await res.json();
    setMsg(j.alreadyRunning ? `${kind} already running` : `${kind} started`);
    refresh();
  }

  const running = (kind: string) => status?.jobs?.[kind]?.status === "running";

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Run the <span className="gradient-text">whole room</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Pre-score everyone against everyone with the matchmaker, then send each agent on its top-K dates.</p>
      </div>

      <section className="fade-up delay-1 grid gap-3 sm:grid-cols-4">
        <Stat label="people" value={status?.people} />
        <Stat label="possible pairs" value={status?.totalPairs} />
        <Stat label="pairs pre-scored" value={status?.prescored} />
        <Stat label="dates completed" value={status?.dates} />
      </section>

      <section className="fade-up delay-2 grid gap-4 md:grid-cols-2">
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="label">Step 1</div>
          <h2 className="text-lg font-semibold tracking-tight">Matchmaker pre-score</h2>
          <p className="mt-1 text-sm text-zinc-400">One matchmaker call per unscored pair. Gives every person a full ranking before any dates happen.</p>
          <button onClick={() => start("matchmake")} disabled={running("matchmake")} className="btn-primary mt-5">
            {running("matchmake") ? "Running…" : "Run matchmaker"}
          </button>
          <JobView job={status?.jobs?.matchmake} />
        </div>
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-rose-500/15 blur-3xl" />
          <div className="label">Step 2</div>
          <h2 className="text-lg font-semibold tracking-tight">Send agents on dates</h2>
          <p className="mt-1 text-sm text-zinc-400">Each person&apos;s agent dates their top-K pre-scored candidates. Pairs are deduped; already-dated pairs are skipped.</p>
          <div className="mt-5 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              K =
              <input type="number" min={1} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} className="input !w-20 !py-2" />
            </label>
            <button onClick={() => start("dates")} disabled={running("dates")} className="btn-primary">
              {running("dates") ? "Dating…" : "Run dates"}
            </button>
          </div>
          <JobView job={status?.jobs?.dates} />
        </div>
      </section>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card px-5 py-4">
      <div className="text-3xl font-semibold tabular-nums">{value ?? "–"}</div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function JobView({ job }: { job?: Job }) {
  if (!job) return null;
  const pct = job.progress.total ? Math.round((job.progress.done / job.progress.total) * 100) : job.status === "done" ? 100 : 0;
  return (
    <div className="mt-5 text-sm">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>
          <span className={job.status === "running" ? "text-rose-300" : job.status === "done" ? "text-emerald-300" : "text-rose-400"}>{job.status}</span> · {job.progress.done}/{job.progress.total}
          {job.progress.failed ? ` · ${job.progress.failed} failed` : ""}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {job.error && <p className="mt-2 text-rose-300">{job.error}</p>}
    </div>
  );
}
