import type { Turn } from "@/lib/types";
import { Avatar } from "./Avatar";

type Side = { id: string; name: string; photo?: string };

export function Bubble({ turn, a, b, animate }: { turn: Turn; a: Side; b: Side; animate?: boolean }) {
  const isA = turn.speakerId === a.id;
  const side = isA ? a : b;
  const parts = turn.text.split(/(\*[^*]+\*)/g);
  return (
    <div className={`flex items-end gap-2.5 ${isA ? "" : "flex-row-reverse"} ${animate ? "bubble-in" : ""}`}>
      <Avatar src={side.photo} name={side.name} size={32} />
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-lg ${
          isA
            ? "rounded-bl-md border border-white/10 bg-white/[0.07] text-zinc-100 backdrop-blur"
            : "rounded-br-md bg-gradient-to-br from-rose-500 via-rose-500 to-orange-400 text-white shadow-rose-500/30"
        }`}
      >
        <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${isA ? "text-rose-300" : "text-white/75"}`}>{side.name}</div>
        {parts.map((p, i) =>
          p.startsWith("*") && p.endsWith("*") ? (
            <em key={i} className={isA ? "text-zinc-400" : "text-white/80"}>
              {p.slice(1, -1)}{" "}
            </em>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </div>
    </div>
  );
}

export function Typing({ side, right }: { side: Side; right?: boolean }) {
  return (
    <div className={`flex items-end gap-2.5 ${right ? "flex-row-reverse" : ""}`}>
      <Avatar src={side.photo} name={side.name} size={32} />
      <div className={`typing flex gap-1.5 rounded-2xl px-4 py-3.5 ${right ? "bg-rose-500/30" : "border border-white/10 bg-white/[0.07]"}`}>
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
      </div>
    </div>
  );
}
