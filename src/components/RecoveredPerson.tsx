"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Person } from "@/lib/types";
import { PersonProfile } from "@/components/PersonProfile";

/** Shows a profile that was just built in this browser when the server could not store it. */
export function RecoveredPerson({ id }: { id: string }) {
  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  const [people, setPeople] = useState<{ id: string; name: string; photo?: string }[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`proxy-person:${id}`);
      setPerson(raw ? (JSON.parse(raw) as Person) : null);
    } catch {
      setPerson(null);
    }
    fetch("/api/people")
      .then((r) => r.json())
      .then((list: { id: string; name: string; photo?: string }[]) => {
        if (Array.isArray(list)) setPeople(list);
      })
      .catch(() => {});
  }, [id]);

  if (person === undefined) return <p className="text-sm text-zinc-500">Opening profile…</p>;
  if (!person) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-zinc-300">This profile is not on the server.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-rose-300 hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  const withSelf = people.some((p) => p.id === person.id) ? people : [{ id: person.id, name: person.name, photo: person.photo }, ...people];
  return <PersonProfile person={person} people={withSelf} ranking={[]} dates={[]} />;
}
