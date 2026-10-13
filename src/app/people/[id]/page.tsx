import { getDates, getPeople } from "@/lib/store";
import { rankingsFor } from "@/lib/matchmaker";
import { PersonProfile } from "@/components/PersonProfile";
import { RecoveredPerson } from "@/components/RecoveredPerson";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const people = await getPeople();
  const person = people.find((p) => p.id === id);
  if (!person) return <RecoveredPerson id={id} />;
  const [ranking, dates] = await Promise.all([rankingsFor(id, people), getDates()]);
  return <PersonProfile person={person} people={people} ranking={ranking} dates={dates} />;
}
