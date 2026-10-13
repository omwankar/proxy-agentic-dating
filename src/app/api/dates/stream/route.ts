import { NextRequest } from "next/server";
import { getPerson } from "@/lib/store";
import { runDate } from "@/lib/dating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const [a, b] = await Promise.all([getPerson(aId), getPerson(bId)]);
  if (!a || !b) return new Response("Person not found", { status: 404 });

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
