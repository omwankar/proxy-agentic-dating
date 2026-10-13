import { NextRequest, NextResponse } from "next/server";
import { getPeople, savePerson } from "@/lib/store";
import { buildPerson, type ProgressStep } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const people = await getPeople();
  return NextResponse.json(
    people.map((p) => ({
      id: p.id,
      name: p.name,
      headline: p.headline,
      location: p.location,
      photo: p.photo,
      links: p.links,
      createdAt: p.createdAt,
    }))
  );
}

/**
 * POST /api/people  { linkedin, instagram, force? }
 * Streams NDJSON progress lines: {step, detail} ... then {done: true, person}
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { linkedin, instagram, force } = body as { linkedin?: string; instagram?: string; force?: boolean };
  if (!linkedin || !instagram) {
    return NextResponse.json({ error: "Both linkedin and instagram are required" }, { status: 400 });
  }
  if (!/linkedin\.com\/in\//i.test(linkedin)) {
    return NextResponse.json({ error: "LinkedIn link must look like https://www.linkedin.com/in/<username>" }, { status: 400 });
  }
  if (!/instagram\.com\//i.test(instagram)) {
    return NextResponse.json({ error: "Instagram link must look like https://www.instagram.com/<username>" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const person = await buildPerson(
          linkedin,
          instagram,
          (step: ProgressStep, detail?: string) => send({ step, detail }),
          { force: !!force }
        );
        try {
          await savePerson(person);
        } catch (err) {
          console.error("savePerson failed", err);
        }
        send({ done: true, person });
      } catch (e) {
        send({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
