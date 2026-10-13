import { NextRequest } from "next/server";
import { getPerson } from "@/lib/store";
import { runDate } from "@/lib/dating";
import type { Person } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function looksLikePerson(value: unknown): value is Person {
  if (!value || typeof value !== "object") return false;
  const p = value as Person;
  return typeof p.id === "string" && typeof p.name === "string" && !!p.analysis && !!p.linkedin && !!p.instagram;
}

async function resolvePair(aId: string, bId: string, extra: Person[] = []) {
  const fromExtra = (id: string) => extra.find((p) => p.id === id);
  const [storedA, storedB] = await Promise.all([getPerson(aId), getPerson(bId)]);
  return { a: storedA ?? fromExtra(aId), b: storedB ?? fromExtra(bId) };
}

function dateStream(a: Person, b: Person) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        await runDate(a, b, {
          onStart: ({ venue }) =>
            send("start", {
              venue,
              a: { id: a.id, name: a.name, photo: a.photo, headline: a.headline },
              b: { id: b.id, name: b.name, photo: b.photo, headline: b.headline },
            }),
          onTurn: (turn) => send("turn", turn),
          onDebrief: (who, d) => send("debrief", { who, debrief: d }),
          onDone: (record) => send("done", { id: record.id, mutualScore: record.mutualScore }),
        });
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * GET /api/dates/stream?a=<id>&b=<id>
 * Server-Sent Events: start, turn, debrief, done, error
 */
export async function GET(req: NextRequest) {
  const aId = req.nextUrl.searchParams.get("a");
  const bId = req.nextUrl.searchParams.get("b");
  if (!aId || !bId || aId === bId) {
    return new Response("a and b are required and must differ", { status: 400 });
  }
  const { a, b } = await resolvePair(aId, bId);
  if (!a || !b) return new Response("Person not found", { status: 404 });
  return dateStream(a, b);
}

/** POST { a, b, extra? } — extra carries a person built in this browser that this instance does not have on disk. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { a?: string; b?: string; extra?: unknown[] };
  const aId = body.a;
  const bId = body.b;
  if (!aId || !bId || aId === bId) {
    return new Response("a and b are required and must differ", { status: 400 });
  }
  const extra = Array.isArray(body.extra) ? body.extra.filter(looksLikePerson) : [];
  const { a, b } = await resolvePair(aId, bId, extra);
  if (!a || !b) return new Response("Person not found", { status: 404 });
  return dateStream(a, b);
}
