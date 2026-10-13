# Demo video — 3 minutes max

Goal: show the three required beats — (1) the site working end to end from links to rankings, (2) how an agent analyzes a person, (3) the agents actually dating. Record at 1080p, browser only, `npm run dev` already running with the seed loaded (25+ people, matchmaker + dates already run).

Before recording:
- Pick one person to add live (someone NOT yet in `data/people.json`, with both links copied to the clipboard). Scraping takes ~30–60s; cut the wait in editing.
- Pick two seeded people with a high pre-score for the live date (check `/rankings`).

## 0:00 – 0:20  The idea (home page)
- Land on `/`. Read the hero: "Your agent goes on the date. You get the ranking."
- Point at the stats: N people, pairs pre-scored, dates completed.
- Say: every person is an agent; every agent knows its person from exactly two sources — LinkedIn and Instagram.

## 0:20 – 0:55  Links in → profile (beat 3: the site works)
- Paste the LinkedIn URL and the Instagram URL into "Add a person". Click **Build profile**.
- Show the live steps: Reading Instagram → Reading LinkedIn → Agent analyzing → Profile ready. (Jump-cut the wait.)
- It lands on `/people/<id>`.

## 0:55 – 1:35  How the agent analyzes a person (beat 2)
- Top: name, headline, the two official source links.
- Scroll "What the agent found": **Needs**, **Hobbies**, **Interests**, Values, Personality, Dealbreakers, Dating style, Ideal partner.
- Scroll "Evidence": each conclusion tagged `linkedin` / `instagram` with the quote it came from.
- Show "The agent's voice" — the first-person guide the agent uses when it dates for this person.
- Scroll to "Raw sources the agent read" — the LinkedIn roles and Instagram captions. Say: nothing else is used.

## 1:35 – 2:30  The agents date (beat 1 — the most important)
- In the profile header, pick a partner from the dropdown and click **Send agents on a date** (or go to `/date/live` and pick two).
- Watch the bubbles appear turn by turn, with the typing indicator between them. Let 3–4 exchanges play in real time; speed up the rest.
- When the date ends, show both **debrief cards**: score /10, "would see again", what worked, concerns, verdict in the person's voice.
- Show the **mutual match score** and say it is saved into both people's rankings.

## 2:30 – 2:55  Rankings
- Click **All rankings** → `/rankings`. For each person, the ordered list of who fits them best; dated candidates show "after date" scores with a `transcript` link, the rest show matchmaker "pre-date" scores.
- Open one person's ranking and click a `transcript` link to show a saved date.
- Quickly show `/admin`: Run matchmaker / Run dates with progress bars — how all 25+ people got scored and dated in bulk.

## 2:55 – 3:00  Close
- Back to `/`. "Twenty-five real people, two links each, one agent each. The agents date; the people get the ranking."
