# Proxy — agents date on your behalf

An agentic dating site. Every person is represented by an agent. The agent reads **exactly two sources** — the person's public LinkedIn and public Instagram — builds a profile (needs, hobbies, interests, values, dealbreakers, dating style), then goes on dates with the other agents on that person's behalf. Each person ends up with a ranking of who fits them best.

```
LinkedIn + Instagram  →  Agent reads both  →  Profile page  →  Agents date each other  →  Ranking per person
```

## Stack

- Next.js 15 (App Router, TypeScript, Tailwind), JSON-file store under `data/`
- [Apify](https://apify.com/) for the two sources: `apify/instagram-profile-scraper` and `apimaestro/linkedin-profile-detail`
- DeepSeek (`deepseek-chat`) for the analyst, the dating agents, the debriefs and the matchmaker

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DEEPSEEK_API_KEY and APIFY_TOKEN
npm run dev                  # http://localhost:3000
```

## Populate with real people

```bash
npm run seed          # scrapes + analyzes everyone in data/seed-people.json (cached in data/raw/)
npm run run-all       # matchmaker pre-scores every pair, then each agent dates its top-4
                      # safe to re-run: finished pairs are skipped. Stops if Anthropic credit runs out.
```

Or do it from the UI: paste a LinkedIn + Instagram link on the home page, then use **Admin** to run the matchmaker and the dates.

## How it works

| Step | Where | What happens |
| --- | --- | --- |
| Links in | `/` → `POST /api/people` | Streams progress: scrape Instagram → scrape LinkedIn → agent analyzes |
| Analysis | `src/lib/analyze.ts` | Claude reads only the two sources, outputs needs / hobbies / interests / values / personality / dealbreakers / dating style / ideal partner, with evidence quotes tagged by source, plus a first-person voice guide for the agent |
| Profile page | `/people/[id]` | Everything above, the raw sources, the person's ranking and date history |
| Dating | `src/lib/dating.ts` → `GET /api/dates/stream` | Two agents, each with its own system prompt and only its own person's data. 4 rounds (8 turns) at a venue. Then each agent independently debriefs (score 1–10, would see again, highlights, concerns). Streamed turn-by-turn over SSE to `/date/live` |
| Matchmaker | `src/lib/matchmaker.ts` | One call per pair → 0–100 pre-score. `runDates(k)` picks each person's top-K, dedupes pairs, runs real dates |
| Ranking | `/rankings`, `/people/[id]` | Dated candidates first (60% own debrief, 40% theirs, bonus for mutual "see again"), then pre-scored candidates |

## Scripts

- `npm run seed [-- --only "Name"] [-- --limit N]`
- `npm run run-all [-- --k 4] [-- --skip-dates]`

## Notes

- Only public Instagram profiles are accepted; private ones are rejected.
- Raw scrapes are cached in `data/raw/`, so re-running the seed is free. Profile photos are proxied and cached via `/api/img` because Instagram's CDN links expire.
- `DEMO_SCRIPT.md` has the 3-minute video shot list.
