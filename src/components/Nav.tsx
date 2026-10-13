"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "People" },
  { href: "/date/live", label: "Live date" },
  { href: "/rankings", label: "Rankings" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-5 pt-4">
        <nav className="glass-strong flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-rose-500 to-orange-400 text-sm text-white shadow-[0_8px_20px_-6px_rgba(244,63,94,0.8)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 21s-7.5-4.6-9.5-9A5.5 5.5 0 0 1 12 6.3 5.5 5.5 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9z" />
              </svg>
            </span>
            <span className="font-display text-[17px] font-medium">Proxy</span>
            <span className="hidden text-sm font-normal text-zinc-500 sm:inline">· agents date on your behalf</span>
          </Link>
          <div className="flex items-center gap-1 rounded-xl bg-black/20 p-1 text-sm">
            {LINKS.map((l) => {
              const active = l.href === "/" ? path === "/" || path.startsWith("/people") : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 transition ${active ? "bg-white/10 text-white shadow-inner" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
