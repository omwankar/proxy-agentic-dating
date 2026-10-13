"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Debrief, Person, Turn } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Bubble, Typing } from "./Transcript";
import { DebriefCard } from "./DebriefCard";

type Side = { id: string; name: string; photo?: string; headline?: string };
type Option = { id: string; name: string; headline: string; photo?: string };

export function LiveDate({ options }: { options: Option[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const aParam = params.get("a") ?? "";
  const bParam = params.get("b") ?? "";

  const [aSel, setASel] = useState(aParam || options[0]?.id || "");
  const [bSel, setBSel] = useState(bParam || options[1]?.id || "");
  const [remembered, setRemembered] = useState<Option[]>([]);

  const [status, setStatus] = useState<"idle" | "connecting" | "dating" | "debrief" | "done" | "error">("idle");
  const [venue, setVenue] = useState("");
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [debriefA, setDebriefA] = useState<Debrief | null>(null);
  const [debriefB, setDebriefB] = useState<Debrief | null>(null);
  const [result, setResult] = useState<{ id: string; mutualScore: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, debriefA, debriefB, result]);

  useEffect(() => {
    const extras: Option[] = [];
    for (const id of [aParam, bParam]) {
      if (!id || options.some((o) => o.id === id)) continue;
      try {
        const raw = sessionStorage.getItem(`proxy-person:${id}`);
        if (!raw) continue;
        const p = JSON.parse(raw) as Person;
        extras.push({ id: p.id, name: p.name, headline: p.headline, photo: p.photo });
      } catch {
        /* ignore a bad cache entry */
      }
    }
    setRemembered(extras);
  }, [aParam, bParam, options]);

  useEffect(() => {
    if (aParam && bParam && aParam !== bParam) start(aParam, bParam);
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aParam, bParam]);

  function rememberedPeople(ids: string[]): Person[] {
    const out: Person[] = [];
    for (const id of ids) {
      try {
        const raw = sessionStorage.getItem(`proxy-person:${id}`);
        if (raw) out.push(JSON.parse(raw) as Person);
      } catch {
        /* skip */
      }
    }
    return out;
  }

  function start(aId: string, bId: string) {
    esRef.current?.close();
    setStatus("connecting");
    setTurns([]);
    setDebriefA(null);
    setDebriefB(null);
    setResult(null);
    setError(null);
    setA(null);
    setB(null);
    const extra = rememberedPeople([aId, bId]);
    const es = extra.length
      ? new FetchEventSource("/api/dates/stream", { a: aId, b: bId, extra })
      : new EventSource(`/api/dates/stream?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`);
    esRef.current = es;
    es.addEventListener("start", (ev) => {
      const d = JSON.parse((ev as MessageEvent).data);
      setVenue(d.venue);
      setA(d.a);
      setB(d.b);
      setStatus("dating");
    });
    es.addEventListener("turn", (ev) => {
      const t = JSON.parse((ev as MessageEvent).data) as Turn;
      setTurns((prev) => [...prev, t]);
    });
    es.addEventListener("debrief", (ev) => {
      const d = JSON.parse((ev as MessageEvent).data) as { who: "a" | "b"; debrief: Debrief };
      setStatus("debrief");
      if (d.who === "a") setDebriefA(d.debrief);
      else setDebriefB(d.debrief);
    });
    es.addEventListener("done", (ev) => {
      setResult(JSON.parse((ev as MessageEvent).data));
      setStatus("done");
      es.close();
    });
    es.addEventListener("error", (ev) => {
      const data = (ev as MessageEvent).data;
      if (data) {
        try {
          setError(JSON.parse(data).message);
        } catch {
          setError("Stream error");
        }
      } else if (es.readyState === EventSource.CLOSED) {
        setError((e) => e ?? "Connection closed");
      }
      setStatus((s) => (s === "done" ? s : "error"));
      es.close();
    });
  }

  function go() {
    if (!aSel || !bSel || aSel === bSel) return;
    router.push(`/date/live?a=${aSel}&b=${bSel}`);
  }

  const lastSpeaker = turns[turns.length - 1]?.speakerId;
  const nextIsA = !lastSpeaker || lastSpeaker === b?.id;
  const inProgress = status === "dating" || status === "connecting";
  const allOptions = [...options, ...remembered.filter((r) => !options.some((o) => o.id === r.id))];
  const optA = allOptions.find((o) => o.id === aSel);
  const optB = allOptions.find((o) => o.id === bSel);

  return (
    <div className="space-y-6">
      {/* Picker */}
      <section className="card fade-up relative overflow-hidden p-5">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative grid items-end gap-4 md:grid-cols-[1fr_auto_1fr_auto]">
          <PickerSide label="Agent for" value={aSel} onChange={setASel} options={allOptions} pick={optA} />
          <div className="hidden pb-3 text-center md:block">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-rose-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9A5.5 5.5 0 0 1 12 6.3 5.5 5.5 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9z" /></svg>
            </span>
          </div>
          <PickerSide label="Agent for" value={bSel} onChange={setBSel} options={allOptions} pick={optB} />
          <button onClick={go} disabled={!aSel || !bSel || aSel === bSel || inProgress} className="btn-primary h-[46px]">
            {inProgress ? "Date in progress…" : "Start the date"}
          </button>
        </div>
      </section>

      {status === "idle" && (
        <p className="fade-up delay-1 text-center text-sm text-zinc-500">Pick two people. Their agents will meet, talk for four rounds, then each reports back.</p>
      )}
      {status === "connecting" && (
        <p className="flex items-center justify-center gap-2 text-sm text-zinc-400">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-rose-400" /> Briefing both agents…
        </p>
      )}
      {error && <p className="card border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

      {a && b && (
        <section className="card fade-up overflow-hidden">
          <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-rose-500/10 via-transparent to-orange-400/10 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={a.photo} name={a.name} size={46} />
              <div className="min-w-0">
                <Link href={`/people/${a.id}`} className="block truncate font-semibold hover:text-rose-200">{a.name}</Link>
                <div className="truncate text-xs text-zinc-500">{a.headline}</div>
              </div>
            </div>
            <div className="hidden shrink-0 px-3 text-center sm:block">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">first date at</div>
              <div className="max-w-[260px] text-sm text-zinc-200">{venue}</div>
              {status === "dating" && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-rose-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> LIVE · round {Math.min(4, Math.floor(turns.length / 2) + 1)} of 4
                </div>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-3 text-right">
              <div className="min-w-0">
                <Link href={`/people/${b.id}`} className="block truncate font-semibold hover:text-rose-200">{b.name}</Link>
                <div className="truncate text-xs text-zinc-500">{b.headline}</div>
              </div>
              <Avatar src={b.photo} name={b.name} size={46} />
            </div>
          </div>

          <div className="space-y-4 bg-black/20 p-5 sm:p-6">
            {turns.map((t, i) => (
              <Bubble key={i} turn={t} a={a} b={b} animate />
            ))}
            {status === "dating" && (nextIsA ? <Typing side={a} /> : <Typing side={b} right />)}
            {status === "debrief" && (
              <p className="flex items-center justify-center gap-2 pt-2 text-xs text-zinc-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-rose-400" />
                The date is over. Both agents are reporting back to their person…
              </p>
            )}
            <div ref={endRef} />
          </div>
        </section>
      )}

      {(debriefA || debriefB) && a && b && (
        <section className="grid gap-4 md:grid-cols-2">
          {debriefA ? <DebriefCard name={a.name} photo={a.photo} debrief={debriefA} /> : <Thinking name={a.name} />}
          {debriefB ? <DebriefCard name={b.name} photo={b.photo} debrief={debriefB} /> : <Thinking name={b.name} />}
        </section>
      )}

      {result && a && b && (
        <section className="card bubble-in relative overflow-hidden p-8 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-3">
            <div className="label !mb-0">Mutual match score</div>
            <div className={`text-7xl font-semibold tabular-nums ${result.mutualScore >= 75 ? "text-emerald-300" : result.mutualScore >= 55 ? "text-amber-300" : "text-zinc-300"}`}>
              {result.mutualScore}
            </div>
            <p className="max-w-md text-sm text-zinc-400">
              Saved. This date now feeds both {a.name.split(" ")[0]}&apos;s and {b.name.split(" ")[0]}&apos;s rankings.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href={`/people/${a.id}`} className="btn-ghost">{a.name.split(" ")[0]}&apos;s ranking</Link>
              <Link href={`/people/${b.id}`} className="btn-ghost">{b.name.split(" ")[0]}&apos;s ranking</Link>
              <Link href={`/dates/${result.id}`} className="btn-ghost">Permalink</Link>
              <Link href="/rankings" className="btn-primary">All rankings</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/** EventSource is GET-only. This posts the just-built person, then reads the same SSE frames. */
class FetchEventSource {
  private closed = false;
  private listeners = new Map<string, (ev: MessageEvent) => void>();
  readyState = 0;
  constructor(url: string, body: unknown) {
    void this.run(url, body);
  }
  addEventListener(type: string, fn: (ev: MessageEvent) => void) {
    this.listeners.set(type, fn);
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
  private emit(type: string, data: string) {
    this.listeners.get(type)?.({ data } as MessageEvent);
  }
  private async run(url: string, body: unknown) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        this.emit("error", JSON.stringify({ message: (await res.text()) || `Request failed (${res.status})` }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        if (this.closed) {
          await reader.cancel();
          return;
        }
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let sep;
        while ((sep = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          let event = "message";
          const data: string[] = [];
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data.push(line.slice(5).trim());
          }
          if (data.length) this.emit(event, data.join("\n"));
        }
      }
    } catch (err) {
      if (!this.closed) this.emit("error", JSON.stringify({ message: err instanceof Error ? err.message : String(err) }));
    }
  }
}

function PickerSide({ label, value, onChange, options, pick }: { label: string; value: string; onChange: (v: string) => void; options: Option[]; pick?: Option }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar src={pick?.photo} name={pick?.name ?? "?"} size={46} />
      <label className="min-w-0 flex-1">
        <span className="label">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Thinking({ name }: { name: string }) {
  return (
    <div className="card flex items-center gap-2 p-5 text-sm text-zinc-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-rose-400" /> {name}&apos;s agent is thinking…
    </div>
  );
}
