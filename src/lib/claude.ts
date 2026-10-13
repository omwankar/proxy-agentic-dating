/**
 * LLM client. Uses DeepSeek's OpenAI-compatible API (https://api.deepseek.com).
 * chat() / chatJson() keep the same shape the dating, analysis and matchmaker code already call.
 */

const BASE = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");

export function modelName() {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Strip characters that break JSON encoding (unpaired surrogates, stray control chars). */
export function sanitize(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

function apiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  return key;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function chat(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const body = {
    model: modelName(),
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 600,
    messages: [
      { role: "system", content: sanitize(opts.system) },
      ...opts.messages.map((m) => ({ role: m.role, content: sanitize(m.content) })),
    ],
  };

  let lastErr = "unknown error";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (res.status === 429 || res.status === 503) {
      lastErr = raw || `HTTP ${res.status}`;
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      throw new Error(`DeepSeek ${res.status}: ${raw.slice(0, 400)}`);
    }
    let json: { choices?: { message?: { content?: string } }[] };
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(`DeepSeek returned non-JSON: ${raw.slice(0, 200)}`);
    }
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("DeepSeek returned an empty reply");
    return text;
  }
  throw new Error(`DeepSeek rate-limited: ${lastErr}`);
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.search(/[{[]/);
  if (first < 0) return text;
  const lastObj = text.lastIndexOf("}");
  const lastArr = text.lastIndexOf("]");
  const last = Math.max(lastObj, lastArr);
  return text.slice(first, last + 1);
}

export async function chatJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  attempts?: number;
}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const text = await chat({
      system: opts.system + "\n\nRespond with a single valid JSON object only. No prose, no markdown fences.",
      messages: [{ role: "user", content: opts.user }],
      maxTokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.4,
    });
    try {
      return JSON.parse(extractJson(text)) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Model did not return valid JSON after ${attempts} attempts: ${String(lastErr)}`);
}
