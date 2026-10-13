/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

export function Avatar({ src, name, size = 48, className = "" }: { src?: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  const style = { width: size, height: size, fontSize: Math.max(11, size / 2.6) };
  if (!src || failed) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/40 to-orange-400/30 font-semibold text-rose-100 ring-1 ring-white/15 ${className}`}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`/api/img?u=${encodeURIComponent(src)}`}
      alt={name}
      style={style}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ring-2 ring-white/15 ${className}`}
    />
  );
}
