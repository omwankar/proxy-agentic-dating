import Link from "next/link";
import type { RankingEntry } from "@/lib/types";
import { Avatar } from "./Avatar";

export function ScoreBadge({ score, basis }: { score: number; basis: "date" | "prescore" }) {
  const tone =
    score >= 75
      ? "from-emerald-400 to-teal-500 shadow-emerald-500/40"
      : score >= 55
        ? "from-amber-400 to-orange-500 shadow-amber-500/40"
        : "from-zinc-500 to-zinc-600 shadow-black/30";
  return (
    <div className="flex shrink-0 flex-col items-end">
      <span className={`rounded-lg bg-gradient-to-br px-2 py-0.5 text-sm font-bold tabular-nums text-white shadow-lg ${tone}`}>{score}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{basis === "date" ? "after date" : "pre-date"}</span>
    </div>
  );
}

export function RankingList({ entries, selfId, limit }: { entries: RankingEntry[]; selfId: string; limit?: number }) {
  const list = limit ? entries.slice(0, limit) : entries;
  if (!list.length) return <p className="text-sm text-zinc-500">No ranking yet. Run the matchmaker and dates from Admin.</p>;
  return (
    <ol className="divide-y divide-white/5">
      {list.map((e, i) => (
        <li key={e.personId} className="flex items-start gap-3 py-3.5 first:pt-1">
          <span className={`w-6 pt-2 text-right text-sm font-bold tabular-nums ${i === 0 ? "gradient-text" : "text-zinc-600"}`}>{i + 1}</span>
          <Avatar src={e.photo} name={e.name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/people/${e.personId}`} className="truncate font-medium hover:text-rose-200">
                {e.name}
              </Link>
              {e.dateId ? (
                <Link href={`/dates/${e.dateId}`} className="shrink-0 text-[11px] text-emerald-300 hover:underline">transcript</Link>
              ) : (
                <Link href={`/date/live?a=${selfId}&b=${e.personId}`} className="shrink-0 text-[11px] text-rose-300 hover:underline">date</Link>
              )}
            </div>
            <div className="truncate text-xs text-zinc-500">{e.headline}</div>
            {e.reasons.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs leading-relaxed text-zinc-400">
                {e.reasons.slice(0, 3).map((r, j) => (
                  <li key={j} className="flex gap-1.5"><span className="text-zinc-600">—</span><span>{r}</span></li>
                ))}
              </ul>
            )}
          </div>
          <ScoreBadge score={e.score} basis={e.basis} />
        </li>
      ))}
    </ol>
  );
}
