import { NextRequest, NextResponse } from "next/server";
import { rankingsFor } from "@/lib/matchmaker";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await rankingsFor(id));
}
