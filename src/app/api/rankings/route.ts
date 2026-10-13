import { NextResponse } from "next/server";
import { allRankings } from "@/lib/matchmaker";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await allRankings();
  return NextResponse.json(
    all.map(({ person, ranking }) => ({
      person: { id: person.id, name: person.name, headline: person.headline, photo: person.photo },
      ranking,
    }))
  );
}
