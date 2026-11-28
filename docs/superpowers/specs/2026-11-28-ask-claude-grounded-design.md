# Ask AirAware answers the question (Claude Haiku), design

**Status:** proposed, 28 Nov 2026. Needs the owner's approval of D1-D7 below before any code is written (AGENTS.md §9, CLAUDE.md). The owner chose "video first, then Ask with Haiku" (28 Nov) and asked for this plan ("approved, write the Ask plan").

## Problem

Today a typed question only picks one of six topics through keyword lists (`classify()`), and the AI never sees it. Run over the 147 distinct questions in `AirAware_AI_Assistant_Question_Bank.md`, the live classifier sends 37 to "I can help with…" (out of scope), for example "What does PM2.5 mean?", "Why do you recommend that?" and "Is this an official CPCB observation?". Many others get the wrong topic's cards, and 9 of the 12 follow-up questions in section 11 are out of scope, because nothing remembers the previous turn.

## Design

1. **The medical gate stays first.** `classify()` runs on the question, and on every earlier question sent with it. A medical question gets today's fixed reply and calls no AI. An earlier medical question is dropped before anything reaches Claude.
2. **Claude answers typed questions.** For a typed question that is not medical, the server sends Claude Haiku 5.5 (`claude-haiku-5-5`, env `CLAUDE_MODEL`):
   - the question;
   - up to 2 earlier questions from this visit, each with the titles of the cards shown for it;
   - the 24-hour forecast check (`toWriterInput`'s air part);
   - every card the rules allow for this household (rule cards that fired, plus guide cards after the existing hide rules), as id, section, priority, title, text and reason;
   - a small forecast provenance block: provider, data kind and the forecast's own limitation sentences (for example "Model forecast, not a station observation."). It is `null` when the forecast failed.

   It never sends the place name, coordinates, raw household answers, timestamps or source ids. When the context doesn't hold what is asked (exact times, hourly values, yesterday, a street), the prompt has Claude say so and point to Air quality details instead of guessing.
3. **Claude returns JSON:** `scope` (`answered` or `out_of_scope`), `answer` (1-3 sentences, 20-300 characters), `topic` (one of the six) and `cardIds` (0-3 ids from the cards sent). It writes no card text and no sources: cards and sources stay the rules' own, and the existing response shape (`AskAnswer`) does not change.
4. **The server checks the answer** with Zod and the plan's existing checks:
   - **Numbers:** only numbers in the forecast check and the card text. The question's numbers never count as known.
   - **Banned wording:** the plan's banned list.
   - **No safety verdict:** the Ask yes/no check.
   - **Cards:** ids must come from the cards sent; at most 3, no repeats.

   No retry.
5. **Any failure falls back to rules**: today's keyword answer for the classified topic, with `summary: null` and `generatedBy: "rules"`. This includes an error, timeout, refusal, failed check or the daily cap. The fallback makes no Gemini call.
6. **Topic chips and follow-up re-asks are unchanged.** They send no question, so they use today's path. An AI answer with no cards (a data question such as "Is this an official CPCB observation?") gets no question back: `followUps` is `[]`, so it isn't followed by "Do you exercise outdoors?".
7. **Spend and limits:** Claude Ask calls have their own cap of 200 per UTC day per server instance. They share today's 10-per-minute limiter. There is no caching by question text. The in-memory cap resets for every new Netlify instance, so **before deploying, the owner sets a monthly spend limit in the Anthropic Console**.
8. **Words the checks refuse.** The answer may not say "AQI" or "air quality index", which the banned list refuses. The prompt gives the wording "not an official index". It also may not quote particle sizes as numbers ("2.5 micrometres"); the prompt says "very fine particles" instead. Both were tested against the real checker on 28 Nov.

## Decisions for the owner

| ID | Decision | Recommended | Alternative |
|---|---|---|---|
| D1 | Questions `classify()` calls out of scope go to Claude | **Yes.** That is most of the gain (41 of 167). Claude may still answer `out_of_scope`. | No: only topic-matched questions go to Claude |
| D2 | Earlier questions sent with a new one | **Up to 2 earlier questions plus their card ids**, re-checked for medical words. Answer text is never sent back, because a client could forge it. | None: no follow-up memory |
| D3 | Weather and fire hotspots in Claude's context | **Not in v1.** They have no source id in the allowlist and no "Based on" line in an Ask answer, and their units would break the number check. They stay on Today. | Add them in v1: a contract, source-list and API change, about +1 day |
| D4 | Fallback | **Rules only**: no Gemini call after a Claude failure. Worst case is about 15 s, against about 48 s with a Gemini retry. | Today's Gemini-then-Claude summary |
| D5 | Ask moves off Google for typed questions | **Accept.** The question must not reach Gemini's free tier (INTEGRATIONS.md §4). Gemini still writes the daily plan and the topic-chip summaries. | Keep Gemini only, which means no question-aware Ask |
| D6 | Copy on the Ask page | Intro: "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast." | Your wording |
| D7 | Privacy page sentences | The three sentences in plan Task 6, including Anthropic's published terms. Checked on 28 Nov: API inputs and outputs are deleted within 30 days, kept longer only to enforce the usage policy or by law, and not used for training by default (privacy.claude.com articles 7996866, dated 1 Jul 2026, and 7996868, dated 18 Aug 2026). The separate covered-models policy (article 15425996) applies only to Mythos-class models; it says "For all other models … stays under the current terms". | Your wording |

## What it replaces

- J25 ("the AI still never sees the question");
- D1 of 20 Nov (guided Ask, "AI writes 2–3 sentences only");
- the 21 Nov guided-chat rulings "The AI never reads what people type" and "no AI-written questions". Follow-up questions are still never AI-written: "You could also ask" stays the fixed starters.

These go on record as J26 and ADR-008. They are amendment notes on the 20 Nov and 21 Nov specs; the old rulings stay as history.

## Out of scope

- Open chat beyond 2 earlier questions.
- Storing conversations.
- AI-written follow-up questions.
- Weather or fire context (D3).
- Streaming.
- Prompt caching (the prompt is near Haiku's 512-token minimum and traffic is sparse; add it once usage shows hits).

## Acceptance

- The 20-question evaluation set from the question bank runs as an opt-in live test, with a fixed forecast and with the forecast missing.
  - "Can you diagnose my cough…" gets the medical reply with no AI call.
  - Each of the other 18 has an expected topic set and a must-match pattern (plan Task 7). A question passes only if Claude answered it, chose an expected topic, and matched the pattern. At least 16 of 18 must pass: passing the checks alone doesn't count, so a fluent dodge fails.
- Unit and route tests cover:
  - prompt injection;
  - a medical question hidden in the earlier questions;
  - forged card ids;
  - a number the user typed;
  - the place name never reaching Claude;
  - the question never reaching logs, the response, Gemini, Open-Meteo or FIRMS.
- All existing tests pass, except the privacy tests rewritten on purpose (named in the plan).
