import Link from "next/link";
import { notFound } from "next/navigation";
import { getDates, getPeople } from "@/lib/store";
import { rankingsFor } from "@/lib/matchmaker";
import { Avatar } from "@/components/Avatar";
import { RankingList } from "@/components/RankingList";
import { DatePicker } from "@/components/DatePicker";

export const dynamic = "force-dynamic";

function Section({ title, items, tone, icon }: { title: string; items: string[]; tone: string; icon: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="label flex items-center gap-1.5">
        <span className="text-sm leading-none">{icon}</span> {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x, i) => (
          <span key={i} className={`chip ${tone} !leading-snug`}>
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const people = await getPeople();
  const person = people.find((p) => p.id === id);
  if (!person) notFound();
  const [ranking, dates] = await Promise.all([rankingsFor(id, people), getDates()]);
  const myDates = dates.filter((d) => d.aId === id || d.bId === id).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const byId = new Map(people.map((p) => [p.id, p]));
  const a = person.analysis;
  const first = person.name.split(" ")[0];
  const fmt = Intl.NumberFormat("en", { notation: "compact" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card fade-up relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-rose-500/25 to-orange-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="floaty shrink-0">
            <Avatar src={person.photo} name={person.name} size={112} className="ring-4 !ring-white/10 shadow-2xl" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">{person.name}</h1>
              {person.instagram.isVerified && <span className="chip chip-sky">verified</span>}
            </div>
            <p className="mt-1.5 text-zinc-300">{person.headline}</p>
            {person.location && <p className="mt-0.5 text-sm text-zinc-500">{person.location}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={person.links.linkedin} target="_blank" rel="noreferrer" className="chip chip-sky gap-1.5 !py-1.5 hover:brightness-125">
                <span className="font-bold">in</span> LinkedIn source ↗
              </a>
              <a href={person.links.instagram} target="_blank" rel="noreferrer" className="chip chip-fuchsia gap-1.5 !py-1.5 hover:brightness-125">
                <span className="font-bold">◎</span> @{person.instagram.username}
                {person.instagram.followers ? <span className="opacity-70">· {fmt.format(person.instagram.followers)} followers</span> : null} ↗
              </a>
            </div>
            <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-zinc-300">{a.summary}</p>
          </div>
          <div className="w-full shrink-0 lg:w-64">
            <DatePicker selfId={person.id} options={people.filter((p) => p.id !== person.id).map((p) => ({ id: p.id, name: p.name }))} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Analysis */}
        <div className="space-y-6">
          <section className="card fade-up delay-1 space-y-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">What the agent found</h2>
              <span className="chip chip-zinc">LinkedIn + Instagram only</span>
            </div>
            <Section icon="◆" title="Needs" items={a.needs} tone="chip-rose" />
            <Section icon="◆" title="Hobbies" items={a.hobbies} tone="chip-orange" />
            <Section icon="◆" title="Interests" items={a.interests} tone="chip-amber" />
            <Section icon="◆" title="Values" items={a.values} tone="chip-emerald" />
            <Section icon="◆" title="Personality" items={a.personality} tone="chip-sky" />
            <Section icon="◆" title="Dealbreakers" items={a.dealbreakers} tone="chip-zinc" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <h3 className="label">Dating style</h3>
                <p className="text-sm leading-relaxed text-zinc-300">{a.datingStyle}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <h3 className="label">Ideal partner</h3>
                <p className="text-sm leading-relaxed text-zinc-300">{a.idealPartner}</p>
              </div>
            </div>
            <Section icon="◆" title="Good things to bring up" items={a.conversationStarters} tone="chip-violet" />
          </section>

          <section className="card fade-up delay-2 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Evidence</h2>
            <p className="mt-1 text-xs text-zinc-500">Where each conclusion came from.</p>
            <ul className="mt-4 space-y-2.5">
              {a.evidence.map((e, i) => (
                <li key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className={`chip shrink-0 ${e.source === "instagram" ? "chip-fuchsia" : e.source === "both" ? "chip-violet" : "chip-sky"}`}>{e.source}</span>
                    <span className="italic text-zinc-400">“{e.quote}”</span>
                  </div>
                  <div className="mt-2 flex gap-2 text-zinc-200"><span className="text-rose-400">→</span>{e.inference}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card fade-up delay-2 relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
            <h2 className="text-lg font-semibold tracking-tight">The agent&apos;s voice</h2>
            <p className="mt-1 text-xs text-zinc-500">How the agent speaks and behaves when it dates on {first}&apos;s behalf.</p>
            <p className="relative mt-4 whitespace-pre-line border-l-2 border-rose-400/40 pl-4 text-sm leading-relaxed text-zinc-300">{a.agentPersona}</p>
          </section>

          <section className="card fade-up delay-3 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Raw sources the agent read</h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-sky-400/15 bg-sky-500/[0.06] p-4">
                <h3 className="mb-2 font-semibold text-sky-200">in · LinkedIn</h3>
                {person.linkedin.summary && <p className="line-clamp-6 text-zinc-400">{person.linkedin.summary}</p>}
                <ul className="mt-3 space-y-1 text-zinc-300">
                  {person.linkedin.experiences.slice(0, 5).map((e, i) => (
                    <li key={i} className="truncate">• {e.title} {e.company ? <span className="text-zinc-500">@ {e.company}</span> : ""}</li>
                  ))}
                  {person.linkedin.educations.slice(0, 2).map((e, i) => (
                    <li key={`e${i}`} className="truncate">• {e.school} <span className="text-zinc-500">{e.degree ?? ""}</span></li>
                  ))}
                </ul>
                {person.linkedin.skills.length > 0 && <p className="mt-3 text-xs text-zinc-500">Skills: {person.linkedin.skills.slice(0, 12).join(", ")}</p>}
              </div>
              <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/[0.06] p-4">
                <h3 className="mb-2 font-semibold text-fuchsia-200">◎ · Instagram @{person.instagram.username}</h3>
                {person.instagram.biography && <p className="whitespace-pre-line text-zinc-400">{person.instagram.biography}</p>}
                <ul className="mt-3 space-y-1.5 text-zinc-300">
                  {person.instagram.posts.slice(0, 5).map((p, i) => (
                    <li key={i} className="line-clamp-2">• {p.caption}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Ranking + dates */}
        <div className="space-y-6">
          <section className="card fade-up delay-1 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Best fits for {first}</h2>
              <Link href="/rankings" className="text-xs text-rose-300 hover:underline">all rankings</Link>
            </div>
            <div className="mt-3">
              <RankingList entries={ranking} selfId={person.id} limit={8} />
            </div>
          </section>

          <section className="card fade-up delay-2 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Dates so far</h2>
            {myDates.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No dates yet. Pick someone above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {myDates.map((d) => {
                  const otherId = d.aId === id ? d.bId : d.aId;
                  const other = byId.get(otherId);
                  const mine = d.aId === id ? d.debriefA : d.debriefB;
                  return (
                    <li key={d.id}>
                      <Link href={`/dates/${d.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.06]">
                        <Avatar src={other?.photo} name={other?.name ?? "?"} size={38} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{other?.name ?? otherId}</div>
                          <div className="truncate text-xs text-zinc-500">{d.venue}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">{mine.score}<span className="text-xs font-normal text-zinc-500">/10</span></div>
                          <div className={`text-[10px] ${mine.wouldSeeAgain ? "text-emerald-300" : "text-zinc-500"}`}>{mine.wouldSeeAgain ? "see again" : "pass"}</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
