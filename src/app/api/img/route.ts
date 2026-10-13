import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DIR = path.join(process.cwd(), "data", "img");

/** GET /api/img?u=<remote url> — proxies and caches profile photos (IG/LI CDNs block hotlinking and expire). */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u || !/^https?:\/\//i.test(u)) return new Response("bad url", { status: 400 });
  const key = createHash("sha1").update(u.split("?")[0]).digest("hex");
  const file = path.join(CACHE_DIR, key);
  try {
    const buf = await fs.readFile(file);
    const type = (await fs.readFile(file + ".type", "utf8").catch(() => "image/jpeg")) as string;
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800" } });
  } catch {
    /* miss */
  }
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", Accept: "image/*" },
    });
    if (!res.ok) return new Response("upstream " + res.status, { status: 502 });
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await Promise.all([fs.writeFile(file, buf), fs.writeFile(file + ".type", type)]);
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800" } });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}
