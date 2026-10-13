import { chat, chatJson, type ChatMessage } from "./claude";
import type { DateRecord, Debrief, Person, Turn } from "./types";
import { saveDate } from "./store";

export const ROUNDS = 4; // 4 rounds = 8 turns

const VENUES = [
  "a quiet corner table at a small Italian restaurant",
  "a walk along the waterfront at golden hour",
  "a tucked-away coffee shop with too many plants",
  "a rooftop bar with a view of the city lights",
  "a Saturday farmers' market, then a bench in the park",
  "a cosy wine bar with a vinyl collection",
  "a late-afternoon museum visit followed by tea",
  "a casual ramen place on a rainy evening",
];

export function pickVenue(aId: string, bId: string): string {
  let h = 0;
  for (const c of aId + bId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return VENUES[h % VENUES.length];
}

function personCard(p: Person): string {
  const a = p.analysis;
  return [
    `Name: ${p.name}`,
    `Headline: ${p.headline}`,
    p.location ? `Location: ${p.location}` : "",
    `Portrait: ${a.summary}`,
    `Needs: ${a.needs.join("; ")}`,
    `Hobbies: ${a.hobbies.join(", ")}`,
    `Interests: ${a.interests.join(", ")}`,
    `Values: ${a.values.join(", ")}`,
    `Personality: ${a.personality.join(", ")}`,
    `Dealbreakers: ${a.dealbreakers.join("; ")}`,
    `Dating style: ${a.datingStyle}`,
    `Ideal partner: ${a.idealPartner}`,
    `Things you love to talk about: ${a.conversationStarters.join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAgentSystemPrompt(self: Person, otherName: string, venue: string): string {
  return `You are the dating agent for ${self.name}. You go on dates ON THEIR BEHALF, speaking in first person AS ${self.name}. Everything you know about them comes from their public LinkedIn and Instagram, summarized below.

=== WHO YOU ARE (${self.name}) ===
${personCard(self)}

=== VOICE GUIDE ===
${self.analysis.agentPersona}

=== THE DATE ===
You are on a first date with ${otherName} at ${venue}. You know nothing about them beyond their name until they speak.

Rules:
- Stay fully in character as ${self.name}. Be natural, warm, and specific. Reference your real hobbies, work and values when relevant, but don't recite a resume.
- Keep each reply to 2-4 sentences, like real spoken conversation. Ask a question roughly every other turn. React to what they just said before adding your own thing.
- You may include one short stage direction in *asterisks* occasionally (e.g. *laughs*, *leans in*), max one per reply.
- You are genuinely evaluating fit: notice shared values, energy match, and friction. Be honest, not sycophantic. If something is a dealbreaker for you, you can gently probe it.
- Never mention being an AI or an agent. Never mention LinkedIn or Instagram as sources.
- Output only your spoken reply (plus optional single stage direction). No name prefix.`;
}

const DEBRIEF_SYSTEM = `You are the dating agent who just went on a first date on behalf of your person. Reflect honestly on how the date went FOR YOUR PERSON, judged strictly by their needs, values, dealbreakers and ideal partner.`;

async function debrief(self: Person, other: Person, transcript: Turn[]): Promise<Debrief> {
  const convo = transcript.map((t) => `${t.speakerName}: ${t.text}`).join("\n");
  const result = await chatJson<Debrief>({
    system: DEBRIEF_SYSTEM,
    user: `Your person:\n${personCard(self)}\n\nYou just had this first date with ${other.name}:\n\n${convo}\n\nJudge the fit for ${self.name}. Output JSON:\n{\n  "score": <integer 1-10, 10 = exceptional fit>,\n  "wouldSeeAgain": <true|false>,\n  "highlights": ["2-4 specific moments or qualities that worked"],\n  "concerns": ["1-3 specific concerns or friction points"],\n  "verdict": "2-3 sentences in first person as ${self.name}, telling a friend how it went"\n}`,
    maxTokens: 700,
    temperature: 0.4,
  });
  const score = Math.max(1, Math.min(10, Math.round(Number(result.score) || 5)));
  return {
    score,
    wouldSeeAgain: Boolean(result.wouldSeeAgain),
    highlights: Array.isArray(result.highlights) ? result.highlights.map(String) : [],
    concerns: Array.isArray(result.concerns) ? result.concerns.map(String) : [],
    verdict: String(result.verdict ?? ""),
  };
}

export function mutualScoreFrom(a: Debrief, b: Debrief): number {
  // Geometric-ish mean punishes one-sided dates; bonus if both would see again.
  const base = Math.sqrt(a.score * b.score) * 10; // 10..100
  const bonus = a.wouldSeeAgain && b.wouldSeeAgain ? 5 : a.wouldSeeAgain || b.wouldSeeAgain ? 0 : -5;
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}

export interface DateEvents {
  onStart?: (info: { venue: string; a: Person; b: Person }) => void;
  onTurn?: (turn: Turn) => void;
  onDebrief?: (who: "a" | "b", d: Debrief) => void;
  onDone?: (record: DateRecord) => void;
}

export async function runDate(a: Person, b: Person, events: DateEvents = {}, opts: { persist?: boolean } = {}): Promise<DateRecord> {
  const venue = pickVenue(a.id, b.id);
  events.onStart?.({ venue, a, b });

  const sysA = buildAgentSystemPrompt(a, b.name, venue);
  const sysB = buildAgentSystemPrompt(b, a.name, venue);

  const transcript: Turn[] = [];
  // Each agent sees the conversation from its own point of view.
  const historyA: ChatMessage[] = [];
  const historyB: ChatMessage[] = [];

  const opener = `*You both sit down at ${venue}.* Say hello to ${b.name} and open the conversation naturally.`;
  historyA.push({ role: "user", content: opener });

  for (let round = 1; round <= ROUNDS; round++) {
    // A speaks
    const textA = await chat({ system: sysA, messages: historyA, maxTokens: 220, temperature: 0.9 });
    historyA.push({ role: "assistant", content: textA });
    historyB.push({ role: "user", content: textA });
    const turnA: Turn = { speakerId: a.id, speakerName: a.name, text: textA, round };
    transcript.push(turnA);
    events.onTurn?.(turnA);

    // B speaks
    const isLast = round === ROUNDS;
    if (isLast) {
      historyB[historyB.length - 1].content += `\n\n*(The evening is winding down. This is your last reply; wrap up the date warmly and honestly.)*`;
    }
    const textB = await chat({ system: sysB, messages: historyB, maxTokens: 220, temperature: 0.9 });
    historyB.push({ role: "assistant", content: textB });
    historyA.push({ role: "user", content: textB });
    const turnB: Turn = { speakerId: b.id, speakerName: b.name, text: textB, round };
    transcript.push(turnB);
    events.onTurn?.(turnB);
  }

  const [debriefA, debriefB] = await Promise.all([
    debrief(a, b, transcript).then((d) => {
      events.onDebrief?.("a", d);
      return d;
    }),
    debrief(b, a, transcript).then((d) => {
      events.onDebrief?.("b", d);
      return d;
    }),
  ]);

  const record: DateRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    aId: a.id,
    bId: b.id,
    venue,
    transcript,
    debriefA,
    debriefB,
    mutualScore: mutualScoreFrom(debriefA, debriefB),
    createdAt: new Date().toISOString(),
  };
  if (opts.persist !== false) await saveDate(record);
  events.onDone?.(record);
  return record;
}
