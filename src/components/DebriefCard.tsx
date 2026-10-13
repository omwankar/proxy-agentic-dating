import type { Debrief } from "@/lib/types";
import { Avatar } from "./Avatar";

export function DebriefCard({ name, photo, debrief }: { name: string; photo?: string; debrief: Debrief }) {
  const tone =
    debrief.score >= 8
      ? "from-emerald-400 to-teal-500 shadow-emerald-500/40"
      : debrief.score >= 6
        ? "from-amber-400 to-orange-500 shadow-amber-500/40"
        : "from-zinc-500 to-zinc-600 shadow-black/30";
  return (
    <div className="card bubble-in relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <Avatar src={photo} name={name} size={42} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{name}&apos;s agent reports back</div>
          <div className={`text-xs ${debrief.wouldSeeAgain ? "text-emerald-300" : "text-zinc-500"}`}>
            {debrief.wouldSeeAgain ? "Would see them again" : "Would not pursue"}
          </div>
        </div>
        <div className={`rounded-xl bg-gradient-to-br px-3 py-1.5 text-lg font-bold tabular-nums text-white shadow-lg ${tone}`}>
          {debrief.score}<span className="text-xs font-medium opacity-80">/10</span>
        </div>
      </div>
      <p className="relative mt-4 border-l-2 border-rose-400/40 pl-3 text-sm italic leading-relaxed text-zinc-300">“{debrief.verdict}”</p>
      <div className="relative mt-4 grid gap-4 text-xs sm:grid-cols-2">
        <div>
          <div className="label !mb-1.5 !text-emerald-400/80">Worked</div>
          <ul className="space-y-1 text-zinc-300">{debrief.highlights.map((h, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-400">+</span>{h}</li>)}</ul>
        </div>
        <div>
          <div className="label !mb-1.5 !text-rose-400/80">Concerns</div>
          <ul className="space-y-1 text-zinc-300">{debrief.concerns.map((h, i) => <li key={i} className="flex gap-1.5"><span className="text-rose-400">–</span>{h}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
