import { ApifyClient } from "apify-client";
import type { InstagramData, LinkedInData } from "./types";
import { getRaw, saveRaw } from "./store";

const IG_ACTOR = process.env.APIFY_INSTAGRAM_ACTOR || "apify/instagram-profile-scraper";
const LI_ACTOR = process.env.APIFY_LINKEDIN_ACTOR || "harvestapi/linkedin-profile-scraper";
const LI_MODE = "Profile details no email ($4 per 1k)";

let _client: ApifyClient | null = null;
function client() {
  if (!_client) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error("APIFY_TOKEN is not set");
    _client = new ApifyClient({ token });
  }
  return _client;
}

// ---------- URL parsing ----------
export function parseInstagramUsername(input: string): string {
  const s = input.trim();
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) return m[1].toLowerCase();
  return s.replace(/^@/, "").toLowerCase();
}

export function parseLinkedInUsername(input: string): string {
  const s = input.trim();
  const m = s.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (m) return decodeURIComponent(m[1]);
  return s;
}

export function normalizeInstagramUrl(input: string) {
  return `https://www.instagram.com/${parseInstagramUsername(input)}/`;
}
export function normalizeLinkedInUrl(input: string) {
  return `https://www.linkedin.com/in/${parseLinkedInUsername(input)}/`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = Record<string, any>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  return undefined;
}

// ---------- Instagram ----------
export function normalizeInstagram(raw: Any, username: string): InstagramData {
  const posts = Array.isArray(raw.latestPosts) ? raw.latestPosts : [];
  return {
    url: `https://www.instagram.com/${username}/`,
    username: str(raw.username) ?? username,
    fullName: str(raw.fullName),
    biography: str(raw.biography),
    followers: raw.followersCount ?? undefined,
    following: raw.followsCount ?? undefined,
    postsCount: raw.postsCount ?? undefined,
    isPrivate: !!raw.private,
    isVerified: !!raw.verified,
    externalUrl: str(raw.externalUrl),
    photo: str(raw.profilePicUrlHD) ?? str(raw.profilePicUrl),
    posts: posts
      .map((p: Any) => ({
        caption: str(p.caption) ?? "",
        likes: p.likesCount ?? undefined,
        comments: p.commentsCount ?? undefined,
        type: str(p.type),
        url: str(p.url),
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
      }))
      .filter((p: { caption: string }) => p.caption.length > 0)
      .slice(0, 12),
  };
}

export async function scrapeInstagram(usernameOrUrl: string, opts: { force?: boolean } = {}): Promise<InstagramData> {
  const username = parseInstagramUsername(usernameOrUrl);
  const cacheKey = `ig_${username}`;
  if (!opts.force) {
    const cached = await getRaw<Any>(cacheKey);
    if (cached) return normalizeInstagram(cached, username);
  }
  const run = await client().actor(IG_ACTOR).call({ usernames: [username] }, { waitSecs: 180 });
  const { items } = await client().dataset(run.defaultDatasetId).listItems();
  const item = (items as Any[]).find((i) => !i.error) ?? items[0];
  if (!item || (item as Any).error) {
    throw new Error(`Instagram scrape failed for @${username}: ${(item as Any)?.error ?? "no data"}`);
  }
  if ((item as Any).private) {
    throw new Error(`Instagram @${username} is private. Only public profiles are allowed.`);
  }
  await saveRaw(cacheKey, item);
  return normalizeInstagram(item as Any, username);
}

/** Batch-scrape many Instagram profiles in one actor run and cache them. Returns usernames that came back. */
export async function scrapeInstagramBatch(usernamesOrUrls: string[]): Promise<{ ok: string[]; failed: Record<string, string> }> {
  const usernames = usernamesOrUrls.map(parseInstagramUsername);
  const todo: string[] = [];
  const ok: string[] = [];
  const failed: Record<string, string> = {};
  for (const u of usernames) {
    if (await getRaw<Any>(`ig_${u}`)) ok.push(u);
    else todo.push(u);
  }
  if (!todo.length) return { ok, failed };
  const run = await client().actor(IG_ACTOR).call({ usernames: todo }, { waitSecs: 600 });
  const { items } = await client().dataset(run.defaultDatasetId).listItems();
  const byName = new Map<string, Any>();
  for (const it of items as Any[]) {
    const u = (str(it.username) ?? parseInstagramUsername(str(it.inputUrl) ?? "") ?? "").toLowerCase();
    if (u) byName.set(u, it);
  }
  for (const u of todo) {
    const item = byName.get(u);
    if (!item) failed[u] = "not returned";
    else if (item.error) failed[u] = String(item.error);
    else if (item.private) failed[u] = "private profile";
    else {
      await saveRaw(`ig_${u}`, item);
      ok.push(u);
    }
  }
  return { ok, failed };
}

// ---------- LinkedIn ----------
// apimaestro/linkedin-profile-detail output varies; normalize defensively.
export function normalizeLinkedIn(raw: Any, username: string): LinkedInData {
  const basic: Any = raw.basic_info ?? raw.basicInfo ?? raw;
  const fullName =
    str(basic.fullname) ??
    str(basic.fullName) ??
    str(basic.full_name) ??
    [str(basic.first_name ?? basic.firstName), str(basic.last_name ?? basic.lastName)].filter(Boolean).join(" ") ??
    undefined;
  const locationObj = basic.location;
  const location =
    typeof locationObj === "string"
      ? locationObj
      : locationObj
        ? str(locationObj.linkedinText) ?? str(locationObj.parsed?.text) ?? str(locationObj.full) ?? [str(locationObj.city), str(locationObj.country)].filter(Boolean).join(", ")
        : str(basic.geo_location ?? basic.addressWithCountry);

  const expRaw: Any[] = raw.experience ?? raw.experiences ?? basic.experience ?? [];
  const eduRaw: Any[] = raw.education ?? raw.educations ?? basic.education ?? [];
  const skillsRaw: Any[] = raw.skills ?? basic.skills ?? [];
  const langRaw: Any[] = raw.languages ?? basic.languages ?? [];
  const certRaw: Any[] = raw.certifications ?? basic.certifications ?? [];

  return {
    url: `https://www.linkedin.com/in/${username}/`,
    username,
    fullName: fullName || undefined,
    headline: str(basic.headline),
    summary: str(basic.about) ?? str(basic.summary) ?? str(raw.about),
    location: location || undefined,
    photo: str(basic.photo) ?? str(basic.profile_picture_url) ?? str(basic.profilePic) ?? str(basic.profilePicture) ?? str(raw.profilePic),
    experiences: expRaw.slice(0, 10).map((e) => ({
      title: str(e.title) ?? str(e.position),
      company: str(e.company) ?? str(e.companyName) ?? str(e.company_name),
      description: str(e.description),
      duration: str(e.duration) ?? [str(e.start_date?.year ?? e.startDate), str(e.end_date?.year ?? e.endDate ?? (e.is_current ? "Present" : undefined))].filter(Boolean).join(" - "),
    })),
    educations: eduRaw.slice(0, 6).map((e) => ({
      school: str(e.school) ?? str(e.schoolName) ?? str(e.institution),
      degree: str(e.degree) ?? str(e.degree_name),
      field: str(e.field_of_study) ?? str(e.fieldOfStudy) ?? str(e.field),
    })),
    skills: skillsRaw.map((s) => (typeof s === "string" ? s : str(s.name) ?? str(s.title))).filter(Boolean) as string[],
    languages: langRaw.map((s) => (typeof s === "string" ? s : str(s.name) ?? str(s.language))).filter(Boolean) as string[],
    certifications: certRaw.map((s) => (typeof s === "string" ? s : str(s.name) ?? str(s.title))).filter(Boolean) as string[],
  };
}

function linkedInLooksValid(item: Any | undefined): item is Any {
  if (!item || item.error || item.succeeded === false) return false;
  if (item.message === "error" && !item.firstName && !item.headline && !item.fullName) return false;
  return Boolean(item.firstName || item.fullName || item.headline || item.about);
}

export async function scrapeLinkedIn(usernameOrUrl: string, opts: { force?: boolean } = {}): Promise<LinkedInData> {
  const username = parseLinkedInUsername(usernameOrUrl);
  const cacheKey = `li_${username.toLowerCase()}`;
  if (!opts.force) {
    const cached = await getRaw<Any>(cacheKey);
    if (cached && linkedInLooksValid(cached)) return normalizeLinkedIn(cached, username);
  }
  const batch = await scrapeLinkedInBatch([usernameOrUrl], { force: opts.force });
  if (!batch.ok.includes(username.toLowerCase())) {
    throw new Error(`LinkedIn scrape failed for ${username}: ${batch.failed[username.toLowerCase()] ?? "no data"}`);
  }
  const cached = await getRaw<Any>(cacheKey);
  if (!cached) throw new Error(`LinkedIn scrape failed for ${username}: cache miss`);
  return normalizeLinkedIn(cached, username);
}

/** One actor run for many LinkedIn profiles. Caches each under data/raw/li_<username>.json. */
export async function scrapeLinkedInBatch(usernamesOrUrls: string[], opts: { force?: boolean } = {}): Promise<{ ok: string[]; failed: Record<string, string> }> {
  const usernames = usernamesOrUrls.map((u) => parseLinkedInUsername(u).toLowerCase());
  const ok: string[] = [];
  const failed: Record<string, string> = {};
  const todo: string[] = [];
  for (const u of usernames) {
    if (!opts.force && linkedInLooksValid(await getRaw<Any>(`li_${u}`))) ok.push(u);
    else todo.push(u);
  }
  if (!todo.length) return { ok, failed };

  // Free Apify plans cap this actor at 10 profiles per run, so chunk.
  const chunkSize = Number(process.env.APIFY_LI_BATCH || 10);
  const items: Any[] = [];
  for (let i = 0; i < todo.length; i += chunkSize) {
    const chunk = todo.slice(i, i + chunkSize);
    const run = await client().actor(LI_ACTOR).call(
      { profileScraperMode: LI_MODE, queries: chunk.map((u) => `https://www.linkedin.com/in/${u}`) },
      { waitSecs: 600 }
    );
    const page = await client().dataset(run.defaultDatasetId).listItems({ limit: 100 });
    items.push(...(page.items as Any[]));
  }
  const byName = new Map<string, Any>();
  for (const it of items) {
    const keys = [str(it.publicIdentifier), parseLinkedInUsername(str(it.linkedinUrl) ?? ""), parseLinkedInUsername(str(it.query) ?? ""), parseLinkedInUsername(str(it.originalQuery) ?? "")]
      .filter(Boolean)
      .map((u) => u!.toLowerCase());
    for (const u of keys) byName.set(u, it);
  }
  if (items.length && byName.size === 0) {
    console.log("  LinkedIn items came back with unexpected keys:", Object.keys(items[0]).slice(0, 12).join(", "));
  }
  for (const u of todo) {
    const item = byName.get(u);
    if (!linkedInLooksValid(item)) {
      const why = item as Any | undefined;
      failed[u] = String(why?.error ?? why?.message ?? "not returned");
    } else {
      await saveRaw(`li_${u}`, item);
      ok.push(u);
    }
  }
  return { ok, failed };
}
