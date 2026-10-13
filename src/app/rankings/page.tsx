import Link from "next/link";
import { allRankings } from "@/lib/matchmaker";
import { Avatar } from "@/components/Avatar";
import { ScoreBadge } from "@/components/RankingList";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const all = await allRankings();
  const totalDates = new Set(all.flatMap((r) => r.ranking.filter((e) => e.dateId).map((e) => e.dateId))).size;

  return (
    <div className="space-y-8">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Who fits <span className="gradient-text">whom</span></h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            For every person, their best fits. Candidates they have actually dated rank first (scored from the agents&apos; debriefs); the rest
            are the matchmaker&apos;s pre-date estimates.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="chip chip-zinc">{all.length} people</span>
          <span className="chip chip-emerald">{totalDates} dates on record</span>
        </div>
      </div>

      {all.length === 0 && <p className="card p-8 text-center text-sm text-zinc-500">No people yet.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {all.map(({ person, ranking }, idx) => (
          <section key={person.id} className={`card card-hover fade-up p-5 ${idx % 3 === 1 ? "delay-1" : idx % 3 === 2 ? "delay-2" : ""}`}>
            <Link href={`/people/${person.id}`} className="group flex items-center gap-3">
              <Avatar src={person.photo} name={person.name} size={46} />
              <div className="min-w-0">
                <div className="font-semibold group-hover:text-rose-200">{person.name}</div>
                <div className="truncate text-xs text-zinc-500">{person.headline}</div>
              </div>
            </Link>
            {ranking.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Not scored yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {ranking.slice(0, 5).map((e, i) => (
                  <li key={e.personId} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${i === 0 ? "border-rose-400/25 bg-gradient-to-r from-rose-500/10 to-transparent" : "border-white/5 bg-white/[0.02]"}`}>
                    <span className={`w-4 text-right text-sm font-bold tabular-nums ${i === 0 ? "gradient-text" : "text-zinc-600"}`}>{i + 1}</span>
                    <Avatar src={e.photo} name={e.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/people/${e.personId}`} className="truncate text-sm font-medium hover:text-rose-200">{e.name}</Link>
                        {e.dateId ? (
                          <Link href={`/dates/${e.dateId}`} className="text-[11px] text-emerald-300 hover:underline">transcript</Link>
                        ) : (
                          <Link href={`/date/live?a=${person.id}&b=${e.personId}`} className="text-[11px] text-rose-300 hover:underline">date</Link>
                        )}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{e.reasons[0]}</div>
                    </div>
                    <ScoreBadge score={e.score} basis={e.basis} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
