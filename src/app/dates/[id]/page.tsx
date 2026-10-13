import Link from "next/link";
import { notFound } from "next/navigation";
import { getDate, getPeople } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { Bubble } from "@/components/Transcript";
import { DebriefCard } from "@/components/DebriefCard";

export const dynamic = "force-dynamic";

export default async function DatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [date, people] = await Promise.all([getDate(id), getPeople()]);
  if (!date) notFound();
  const a = people.find((p) => p.id === date.aId);
  const b = people.find((p) => p.id === date.bId);
  if (!a || !b) notFound();
  const tone = date.mutualScore >= 75 ? "text-emerald-300" : date.mutualScore >= 55 ? "text-amber-300" : "text-zinc-300";

  return (
    <div className="space-y-6">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">Saved date</div>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {a.name} <span className="text-rose-400">&amp;</span> {b.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {date.venue} · {new Date(date.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="card px-5 py-3 text-right">
          <div className="label !mb-0">Mutual score</div>
          <div className={`text-4xl font-semibold tabular-nums ${tone}`}>{date.mutualScore}</div>
        </div>
      </div>

      <section className="card fade-up delay-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-rose-500/10 via-transparent to-orange-400/10 px-5 py-4">
          <Link href={`/people/${a.id}`} className="flex items-center gap-3 hover:text-rose-200">
            <Avatar src={a.photo} name={a.name} size={40} />
            <span className="font-semibold">{a.name}</span>
          </Link>
          <Link href={`/people/${b.id}`} className="flex items-center gap-3 hover:text-rose-200">
            <span className="font-semibold">{b.name}</span>
            <Avatar src={b.photo} name={b.name} size={40} />
          </Link>
        </div>
        <div className="space-y-4 bg-black/20 p-5 sm:p-6">
          {date.transcript.map((t, i) => (
            <Bubble key={i} turn={t} a={a} b={b} />
          ))}
        </div>
      </section>

      <section className="fade-up delay-2 grid gap-4 md:grid-cols-2">
        <DebriefCard name={a.name} photo={a.photo} debrief={date.debriefA} />
        <DebriefCard name={b.name} photo={b.photo} debrief={date.debriefB} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/date/live?a=${a.id}&b=${b.id}`} className="btn-ghost">Run this date again</Link>
        <Link href="/rankings" className="btn-primary">Rankings</Link>
      </div>
    </div>
  );
}
