# Claude as backup plan writer (design)

Status: approved by the owner, 2026-11-19 ("Add Claude as backup", model "Claude Haiku 5.5", "Approve, write plan").

## Intent

Gemini is on in production (key added, project quota 200 requests a day), but on 2026-11-19 every Gemini flash model the key can use was overloaded: `gemini-3.8-flash` and `gemini-3.7-flash` answered 503 "high demand", and `gemini-3.5-flash` did not answer within 30 s. So every live plan is the rules-only plan. The owner wants AI plans to appear more often. Gemini stays the first choice, because it is the app's only Google service and the challenge rubric is expected to value Google services.

## Goals

- When Gemini gives no accepted answer (error, 10 s timeout, daily cap, or an answer that fails the checks), the planner asks Claude once with the same input.
- Claude's answer goes through the same `personalize()` checks: schema, ids, lengths, numbers, wording.
- An accepted Claude answer is labelled with Claude's model: "Made with AI (claude-haiku-5-5, prompt daily-plan-v1)". This needs no client change, because the label comes from `plan.model`.
- When Claude also fails, the plan is the labelled rules-only plan, as today.
- When Gemini succeeds, Claude is never called.

## Non-goals

- Changing the prompt, the checks, the schema, the client or the rules.
- Streaming, tools, or any Claude feature beyond one structured-output message.
- Replacing Gemini.

## Anti-goals

- Claude authoring or changing air values. It gets the same `toWriterInput()` context as Gemini: no place, coordinates, window time or raw answers.
- The key in the client bundle, a log, the repository or this conversation.
- Unbounded spend.
- A slower plan when Gemini works.

## Constraints

- **The official SDK.** Call Claude through `@anthropic-ai/sdk`, the official SDK for TypeScript. This is a new runtime dependency, approved with this design. Pin a release at least a few days old, and `npm audit --omit=dev` must stay at 0.
- **The key.** `ANTHROPIC_API_KEY` is server-only and optional. Without it, the app behaves as today. In Netlify it is marked secret and scoped to Functions. The owner creates and pastes the key; I never see or type it.
- **Settings.** `CLAUDE_MODEL` is optional, default `claude-haiku-5-5`, using the same model-name rule as `GEMINI_MODEL`.
- **Limits.** One request with a 10 s timeout, no SDK retries (`maxRetries: 0`), effort `low`, `max_tokens` 4096.
- **Bad answers.** A `refusal` or `max_tokens` stop, or no text block, is a failure.
- **Logs** keep the failure category only, now with the provider's name.
- **Spend.** Claude has its own cap: 200 calls per UTC day per function instance, like Gemini. The real bound is an Anthropic Console spend limit, which the owner sets before adding the key (`DEPLOYMENT.md`).

## Approaches

1. **Backup on failure (chosen).** Gemini first, Claude only when Gemini gives no accepted answer. This keeps the Google service, and Claude costs money only when Gemini fails. Worst case: Gemini times out (10 s), then Claude takes up to 10 s, so about 20 s.
2. **Replace Gemini with Claude.** Rejected: it drops the only Google service.
3. **Ask both at once and take the first accepted answer.** Rejected: it pays for two calls on every plan.

## Decided by the owner

- Gemini stays first, and Claude is the backup.
- The model is Claude Haiku 5.5 (`claude-haiku-5-5`): fastest and cheapest ($0.10 / $0.50 per million tokens). It can be changed with `CLAUDE_MODEL` and a redeploy.
- Each provider has a cap of 200 calls a day.

## My calls

- **The planner** gets an optional `backup: { generate, model }`, next to the existing Gemini pair. That is the smallest change to the existing interface.
- **The answer cache** stays keyed by the input, whichever provider answered it, so the cache also stores which model answered it and the label stays right.
- **Haiku 5.5 thinking:** leave the `thinking` setting out, so the model decides how much to think, and set effort `low`. No server-side refusal fallback: Haiku 5.5 has none, and the rules-only plan already covers a refusal.
- **Verification before deploy:** once the owner pastes the key into `server/.env`, a local live call checks that the schema is accepted and that an answer passes the checks. I check only that the key is present. I also check that no Windows user variable named `ANTHROPIC_API_KEY` overrides `server/.env`, as one did for Gemini.

## Left to the builder

File and test names, and the log wording.
