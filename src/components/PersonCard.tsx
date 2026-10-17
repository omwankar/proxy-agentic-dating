/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Person } from "@/lib/types";
import { photoSrc } from "@/lib/photo";

export function PersonCard({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  const src = photoSrc(person.photo);
  const initials = person.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link href={`/people/${person.id}`} className="group card card-hover relative flex h-full flex-col overflow-hidden">
      <div className="relative h-44 overflow-hidden">
        {src && !failed ? (
          <img
            src={src}
            alt={person.name}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/40 via-fuchsia-500/20 to-orange-400/30 text-4xl font-semibold text-white/80">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a10] via-[#0c0a10]/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <div className="font-display text-xl leading-tight tracking-tight text-white">{person.name}</div>
          <div className="mt-0.5 line-clamp-1 text-[12px] text-zinc-300/90">{person.headline}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-3 text-[13px] leading-relaxed text-zinc-400">{person.analysis.summary}</p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {person.analysis.hobbies.slice(0, 3).map((h) => (
            <span key={h} className="chip chip-rose max-w-full truncate">{h}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
