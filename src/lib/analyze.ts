import { chatJson } from "./claude";
import type { Analysis, InstagramData, LinkedInData, Person } from "./types";
import { scrapeInstagram, scrapeLinkedIn, parseLinkedInUsername, parseInstagramUsername } from "./apify";

export function sourceDigest(li: LinkedInData, ig: InstagramData): string {
  const liBlock = [
    `Name: ${li.fullName ?? "unknown"}`,
    `Headline: ${li.headline ?? ""}`,
    `Location: ${li.location ?? ""}`,
    `About: ${li.summary ?? ""}`,
    `Experience:\n${li.experiences
      .map((e) => `- ${e.title ?? ""} @ ${e.company ?? ""} ${e.duration ? `(${e.duration})` : ""}${e.description ? `: ${e.description.slice(0, 300)}` : ""}`)
      .join("\n")}`,
    `Education:\n${li.educations.map((e) => `- ${e.school ?? ""} ${e.degree ?? ""} ${e.field ?? ""}`).join("\n")}`,
    `Skills: ${li.skills.slice(0, 30).join(", ")}`,
    `Languages: ${li.languages.join(", ")}`,
    `Certifications: ${li.certifications.slice(0, 10).join(", ")}`,
  ].join("\n");

  const igBlock = [
    `Handle: @${ig.username}${ig.isVerified ? " (verified)" : ""}`,
    `Name: ${ig.fullName ?? ""}`,
    `Bio: ${ig.biography ?? ""}`,
    `Followers: ${ig.followers ?? "?"} | Following: ${ig.following ?? "?"} | Posts: ${ig.postsCount ?? "?"}`,
    `Link in bio: ${ig.externalUrl ?? ""}`,
    `Recent post captions:\n${ig.posts
      .map((p, i) => `${i + 1}. [${p.type ?? "Post"}${p.likes ? `, ${p.likes} likes` : ""}] ${p.caption.slice(0, 500).replace(/\s+/g, " ")}`)
      .join("\n")}`,
  ].join("\n");

  return `=== SOURCE 1: LINKEDIN (public profile) ===\n${liBlock}\n\n=== SOURCE 2: INSTAGRAM (public profile) ===\n${igBlock}`;
}

const ANALYST_SYSTEM = `You are a perceptive, warm dating-profile analyst and the "reader" half of a dating agent.
You are given exactly two sources about one real person: their public LinkedIn and their public Instagram. You must use ONLY these two sources. Do not use outside knowledge about the person, even if you recognize them. If something is not supported by the sources, do not state it.

Produce a careful, specific, non-generic analysis for a dating context. Prefer concrete details grounded in the text (captions, headline, bio, roles). Infer thoughtfully: a founder who posts about marathons and family dinners has different needs than a touring musician.

Output JSON with this exact shape:
{
  "summary": "3-4 sentence human portrait of who this person is, written like a thoughtful friend describing them",
  "needs": ["4-6 relational/emotional needs this person likely has in a partner or relationship"],
  "hobbies": ["4-8 concrete hobbies/activities, grounded in the sources"],
  "interests": ["5-10 topics they care about (professional and personal)"],
  "values": ["4-6 core values"],
  "personality": ["4-6 personality traits, each a short phrase"],
  "dealbreakers": ["3-5 likely dealbreakers or friction points for them in dating"],
  "datingStyle": "2-3 sentences on how they probably approach dating and connection",
  "idealPartner": "2-3 sentences describing the kind of partner who would fit them",
  "conversationStarters": ["3-5 specific things a date could bring up with them"],
  "evidence": [
    { "source": "linkedin" | "instagram", "quote": "short direct quote or paraphrase from the source", "inference": "what you concluded from it" }
  ],
  "agentPersona": "A 4-6 sentence first-person voice guide for an AI agent that will go on dates on this person's behalf: tone, humor level, energy, how they talk about their work and life, what they ask about, what lights them up. Written as instructions, e.g. 'Speak with ... Mention ... Ask about ...'."
}
Include at least 6 evidence items, mixing both sources.`;

export async function analyzePerson(li: LinkedInData, ig: InstagramData): Promise<Analysis> {
  const digest = sourceDigest(li, ig);
  const result = await chatJson<Analysis>({
    system: ANALYST_SYSTEM,
    user: `Analyze this person for dating compatibility using only the two sources below.\n\n${digest}`,
    maxTokens: 2500,
    temperature: 0.5,
  });
  // Light validation / defaults
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return {
    summary: String(result.summary ?? ""),
    needs: arr(result.needs),
    hobbies: arr(result.hobbies),
    interests: arr(result.interests),
    values: arr(result.values),
    personality: arr(result.personality),
    dealbreakers: arr(result.dealbreakers),
    datingStyle: String(result.datingStyle ?? ""),
    idealPartner: String(result.idealPartner ?? ""),
    conversationStarters: arr(result.conversationStarters),
    evidence: Array.isArray(result.evidence)
      ? result.evidence.map((e) => ({
          source: (e.source === "instagram" || e.source === "both" ? e.source : "linkedin") as Analysis["evidence"][number]["source"],
          quote: String(e.quote ?? ""),
          inference: String(e.inference ?? ""),
        }))
      : [],
    agentPersona: String(result.agentPersona ?? ""),
  };
}

export function personIdFrom(linkedinUrl: string, instagramUrl: string): string {
  const li = parseLinkedInUsername(linkedinUrl).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const ig = parseInstagramUsername(instagramUrl).replace(/[^a-z0-9._]/g, "-");
  return `${li}--${ig}`;
}

export type ProgressStep = "scrape_instagram" | "scrape_linkedin" | "analyze" | "done";

export async function buildPerson(
  linkedinUrl: string,
  instagramUrl: string,
  onProgress?: (step: ProgressStep, detail?: string) => void,
  opts: { force?: boolean } = {}
): Promise<Person> {
  onProgress?.("scrape_instagram");
  const ig = await scrapeInstagram(instagramUrl, opts);
  onProgress?.("scrape_linkedin", `@${ig.username} ok`);
  const li = await scrapeLinkedIn(linkedinUrl, opts);
  onProgress?.("analyze", `${li.fullName ?? li.username} ok`);
  const analysis = await analyzePerson(li, ig);
  onProgress?.("done");

  const name = li.fullName ?? ig.fullName ?? li.username;
  return {
    id: personIdFrom(linkedinUrl, instagramUrl),
    name,
    headline: li.headline ?? ig.biography?.split("\n")[0] ?? "",
    location: li.location,
    photo: ig.photo ?? li.photo,
    links: { linkedin: li.url, instagram: ig.url },
    linkedin: li,
    instagram: ig,
    analysis,
    createdAt: new Date().toISOString(),
  };
}
