import Link from "next/link";
import { getDates, getPeople, getPreScores } from "@/lib/store";
import { AddPersonForm } from "@/components/AddPersonForm";
import { PersonCard } from "@/components/PersonCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [people, dates, prescores] = await Promise.all([getPeople(), getDates(), getPreScores()]);

  return (
    <div className="space-y-14">
      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="fade-up pt-4">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.6)]" />
            Two sources only — LinkedIn + Instagram
          </div>
          <h1 className="font-display text-5xl font-medium leading-[1.04] tracking-tight sm:text-6xl">
            Your agent goes
            <br />
            on the date.
            <br />
            <span className="gradient-text">You get the ranking.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Every person is represented by an agent. The agent reads the person&apos;s public LinkedIn and public Instagram,
            builds a profile of their needs, hobbies and interests, then dates the other agents on their behalf. Each person
            ends up with a ranking of who fits them best.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Stat label="people" value={people.length} />
            <Stat label="pairs pre-scored" value={Object.keys(prescores).length} />
            <Stat label="dates completed" value={dates.length} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/date/live" className="btn-primary">
              Watch agents date
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 4l8 6-8 6V4z" /></svg>
            </Link>
            <Link href="/rankings" className="btn-ghost">See rankings</Link>
          </div>

          <ol className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3 text-xs text-zinc-500 sm:grid-cols-4">
            {["Paste two links", "Agent reads & profiles", "Agents go on dates", "Ranking per person"].map((s, i) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/15 text-[10px] text-zinc-300">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <div className="fade-up delay-1">
          <AddPersonForm />
        </div>
      </section>

      <section className="fade-up delay-2">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">People &amp; their agents</h2>
            <p className="mt-1 text-sm text-zinc-500">Open any profile to see what the agent found and who it ranks highest.</p>
          </div>
          <span className="chip chip-zinc">{people.length} profiles</span>
        </div>
        {people.length === 0 ? (
          <p className="card p-8 text-center text-sm text-zinc-500">No people yet. Paste two links above, or run <code className="rounded bg-white/10 px-1.5 py-0.5">npm run seed</code>.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li key={p.id}>
                <PersonCard person={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card min-w-[128px] px-4 py-3">
      <div className="font-display text-3xl font-medium tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
    </div>
  );
}
