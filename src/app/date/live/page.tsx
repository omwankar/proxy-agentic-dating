import { Suspense } from "react";
import { getPeople } from "@/lib/store";
import { LiveDate } from "@/components/LiveDate";

export const dynamic = "force-dynamic";

export default async function LiveDatePage() {
  const people = await getPeople();
  const options = people.map((p) => ({ id: p.id, name: p.name, headline: p.headline, photo: p.photo }));
  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Live <span className="gradient-text">date</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">Two agents meet on behalf of their people. Each one only knows its own person; it learns about the other by talking.</p>
      </div>
      {options.length < 2 ? (
        <p className="card p-8 text-center text-sm text-zinc-500">Add at least two people first.</p>
      ) : (
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <LiveDate options={options} />
        </Suspense>
      )}
    </div>
  );
}
