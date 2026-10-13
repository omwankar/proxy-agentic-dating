"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "scrape_instagram" | "scrape_linkedin" | "analyze" | "done";
const STEPS: { key: Step; label: string; sub: string }[] = [
  { key: "scrape_instagram", label: "Reading Instagram", sub: "public profile, bio, recent captions" },
  { key: "scrape_linkedin", label: "Reading LinkedIn", sub: "headline, about, experience, skills" },
  { key: "analyze", label: "Agent analyzing", sub: "needs · hobbies · interests · values · dealbreakers" },
  { key: "done", label: "Profile ready", sub: "opening the profile page" },
];

export function AddPersonForm() {
  const router = useRouter();
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Step | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDetails({});
    setCurrent(null);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin, instagram }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.error) throw new Error(msg.error);
          if (msg.step) {
            setCurrent(msg.step);
            if (msg.detail) setDetails((d) => ({ ...d, [msg.step]: msg.detail }));
          }
          if (msg.done && msg.person) {
            router.push(`/people/${msg.person.id}`);
            return;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const idx = current ? STEPS.findIndex((s) => s.key === current) : -1;

  return (
    <form onSubmit={submit} className="card ring-glow relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-orange-400/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Add a person</h2>
          <span className="chip chip-zinc">2 links in</span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">Paste their two official links. Their agent reads both and builds the profile.</p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="label">
              <SourceDot className="bg-sky-400" /> LinkedIn
            </span>
            <input required value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/username" className="input" />
          </label>
          <label className="block">
            <span className="label">
              <SourceDot className="bg-fuchsia-400" /> Instagram (public)
            </span>
            <input required value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://www.instagram.com/username" className="input" />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button disabled={busy} className="btn-primary w-full sm:w-auto">
            {busy ? (
              <>
                <Spinner /> Working…
              </>
            ) : (
              "Build profile"
            )}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

        {(busy || current) && (
          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => {
              const state = i < idx || current === "done" ? "done" : i === idx ? "active" : "todo";
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
                      state === "done"
                        ? "bg-emerald-500 text-white"
                        : state === "active"
                          ? "pulse-ring bg-gradient-to-br from-rose-500 to-orange-400 text-white"
                          : "border border-white/15 text-zinc-500"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <div className={state === "todo" ? "opacity-40" : ""}>
                    <div className="text-sm font-medium">
                      {s.label}
                      {details[s.key] && <span className="ml-2 text-xs font-normal text-zinc-500">— {details[s.key]}</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{s.sub}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </form>
  );
}

function SourceDot({ className }: { className: string }) {
  return <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${className}`} />;
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}
