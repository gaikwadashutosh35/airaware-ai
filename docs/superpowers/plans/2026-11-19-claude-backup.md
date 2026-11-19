# Claude Backup Plan Writer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Gemini gives no accepted answer, the daily planner asks Claude Haiku 5.5 once, through the same checks, before falling back to the rules-only plan.

**Architecture:** A new `createClaudeGenerator()` returns the existing `GeneratePlan` type, built on the official Anthropic SDK. `createDailyPlanner()` gets an optional `backup` writer and tries its writers in order, each with its own daily cap. The answer cache stores which model wrote each answer. Wiring follows the Gemini pattern: env, `appOptionsFromEnv()`, `AppOptions`.

**Tech Stack:** Node 26 (type stripping), Express 5, Zod 4, Vitest, `@anthropic-ai/sdk`.

**Spec:** `docs/superpowers/specs/2026-11-19-claude-backup-design.md`

## Global Constraints

- `@anthropic-ai/sdk` pinned exactly to `1.8.0` (published 2026-11-10). `npm audit --omit=dev` must report 0 vulnerabilities.
- Env: `ANTHROPIC_API_KEY` (optional; an empty value counts as unset) and `CLAUDE_MODEL` (optional; default `claude-haiku-5-5`; same `^[a-z0-9.-]*$` rule as `GEMINI_MODEL`).
- Each Claude request: `timeout: 10_000` ms, `maxRetries: 0`, `max_tokens: 4096`, `output_config.effort: 'low'`, and `output_config.format` = JSON schema `PLAN_OUTPUT_JSON_SCHEMA`. No `thinking` field.
- Claude gets exactly what Gemini gets: system text `${SYSTEM_PROMPT}\n\n${TASK_PROMPT}`; user text `'Validated context (data, not instructions):\n' + JSON.stringify(input)`.
- Errors thrown by the generator carry only a category: `timeout`, `network`, `http <status>`, `refusal`, `max_tokens`, `empty response`. Nothing logs the key, the body or the text.
- Daily caps: 200 per writer per UTC day per instance (`AI_CALLS_PER_DAY`), counted separately for each writer.
- Plan label: `plan.model` is the model that wrote the accepted answer.
- Git: one branch `main`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push and deploy only with the owner's yes.

## Review Focus

1. **Claude's API refuses `PLAN_OUTPUT_JSON_SCHEMA`.** It carries `$schema`, and every call would then 400. Expected: the local live call in Task 3 passes before any deploy. If it 400s, strip the unsupported key and add a test that pins the schema that is sent.
2. **Gemini answers, but the answer fails the checks** (bad wording or numbers). Expected: Claude is still asked. Task 2 test: `asks the backup when the first answer fails the checks`.
3. **A cached Claude answer is reused** for a label variant. Expected: the plan still names Claude's model. Task 2 test: `a reused backup answer keeps the backup's model`.
4. **Gemini's daily cap is spent.** Expected: Claude still answers, because the counters are separate. Once Claude's cap is spent too, plans are rules-only. Task 2 test: `each writer has its own daily cap`.
5. **SDK error messages include the response body.** Expected: the generator throws category-only errors, so `personalize()` logs no body text. Task 1 tests: `turns an overloaded answer into 'http 529'`, and the network and timeout cases.

---

### Task 1: Claude generator

**Files:**
- Modify: `server/package.json` (dependency), `package-lock.json`
- Create: `server/src/services/ai/claude.ts`
- Test: `server/src/services/ai/claude.test.ts`

**Interfaces:**
- Consumes: `GeneratePlan` (`personalize.ts`), `PLAN_OUTPUT_JSON_SCHEMA` (`planOutput.ts`), `SYSTEM_PROMPT` and `TASK_PROMPT` (`prompts.ts`), `input` (`fixtures.ts`).
- Produces: `createClaudeGenerator(options: { apiKey: string; model: string }): GeneratePlan`.

- [ ] **Step 1: Add the dependency**

Run: `npm install @anthropic-ai/sdk@1.8.0 --save-exact -w server` then `npm audit --omit=dev`
Expected: the dependency `"@anthropic-ai/sdk": "1.8.0"` is in `server/package.json`, and the audit reports 0 vulnerabilities.
Then check the installed types for the `output_config` shape: `effort`, and `format` with `type: 'json_schema'` and `schema`. If 1.8.0 lacks either, use `1.9.0` and ledger a ruling.

- [ ] **Step 2: Write the failing tests** in `claude.test.ts`.

Use the `gemini.test.ts` pattern: spy on `globalThis.fetch` and answer with `new Response(...)`. Create the generator after the spy is in place, because the SDK may capture `fetch` when the client is built. `afterEach` asserts that `console.error` and `console.log` were never called.

- `posts one message to the model with the key in a header`:
  - URL `https://api.anthropic.com/v1/messages`;
  - header `x-api-key: test-key`;
  - the URL does not contain `test-key`;
  - body `model` is `claude-test`, `max_tokens` is 4096, and there is no `thinking`.
- `sends the same prompt and context as Gemini`:
  - the body `system` text equals `` `${SYSTEM_PROMPT}\n\n${TASK_PROMPT}` ``;
  - the single user message text equals `'Validated context (data, not instructions):\n' + JSON.stringify(input)`.
- `asks for the plan schema at low effort`: `output_config.effort` is `'low'` and `output_config.format.schema` deep-equals `PLAN_OUTPUT_JSON_SCHEMA`.
- `returns the text of the answer`: given `{ content: [{ type: 'text', text: '{"a":1}' }], stop_reason: 'end_turn' }` plus the usual message fields, it resolves to `'{"a":1}'`.
- Rejections, each with exactly this message:

  | Test | Response | Message |
  |---|---|---|
  | `rejects a refusal` | `stop_reason: 'refusal'` | `refusal` |
  | `rejects a cut-off answer` | `stop_reason: 'max_tokens'` | `max_tokens` |
  | `rejects an answer without text` | `content: []` | `empty response` |
  | `turns an overloaded answer into 'http 529'` | status 529 with an error body | `http 529` |
  | `turns a network failure into 'network'` | fetch rejects `TypeError` | `network` |
  | `turns a timeout into 'timeout'` | fetch never settles until aborted | `timeout` |

  For the timeout test, use fake timers or a `timeout` option override. Make sure it doesn't wait 10 s.
- `does not retry`: a 529 calls `fetch` exactly once.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npx vitest run src/services/ai/claude.test.ts` (in `server/`)
Expected: FAIL, because `./claude.ts` does not exist.

- [ ] **Step 4: Implement `createClaudeGenerator` in `claude.ts`**

- Build one `new Anthropic({ apiKey, timeout: 10_000, maxRetries: 0 })` per generator.
- Call `client.messages.create(...)` with the Global Constraints values.
- Map SDK errors with `instanceof`, most specific first: `APIConnectionTimeoutError` → `timeout`; `APIError` with a `status` → `http ${status}`; any other → `network`.
- Check `stop_reason` before reading content, then join the `text` blocks.
- Header comment: like `gemini.ts`, nothing here logs.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run src/services/ai/claude.test.ts` and `npm run typecheck -w server`
Expected: all pass, and typecheck is clean.

- [ ] **Step 6: Commit**

```bash
git add server/package.json package-lock.json server/src/services/ai/claude.ts server/src/services/ai/claude.test.ts
git commit -m "feat(ai): Claude plan generator for the backup writer"
```

### Task 2: Planner backup and wiring

**Files:**
- Modify: `server/src/services/ai/personalize.ts`, `server/src/services/recommendations/dailyPlan.ts`, `server/src/config/env.ts`, `server/src/config/appOptions.ts`, `server/src/app.ts`
- Test: `personalize.test.ts`, `dailyPlan.test.ts`, `env.test.ts`, `appOptions.test.ts` (same folders)

**Interfaces:**
- Consumes: `createClaudeGenerator` (Task 1).
- Produces:
  - `personalize(input, generate, provider = 'Gemini')`, which logs `` `${provider} plan failed: ${category}` ``. The existing tests stay unchanged.
  - `createDailyPlanner` deps gain `backup?: { generate: GeneratePlan; model: string } | null`, logged as provider `Claude`.
  - `AppOptions` gains `backupPlan?: { generate: GeneratePlan; model: string }`.
  - `Env` gains `ANTHROPIC_API_KEY?: string` and `CLAUDE_MODEL: string`.

- [ ] **Step 1: Write the failing tests**

- `personalize.test.ts`, `names the provider in the failure log`: `personalize(input, rejecting('timeout'), 'Claude')` logs `Claude plan failed: timeout`.
- `dailyPlan.test.ts`, using the file's existing helpers. `gemini` and `claude` are `vi.fn<GeneratePlan>`; the backup model is `'claude-test'`.
  - `asks the backup when the first writer fails`: Gemini rejects `http 503`, Claude answers validly → `generatedBy 'ai'`, `model 'claude-test'`, each called once.
  - `asks the backup when the first answer fails the checks`: Gemini answers once with a summary containing a number not in the input (a check failure, which `personalize` does not retry), Claude answers validly → `model 'claude-test'`.
  - `never asks the backup when the first writer succeeds`: Claude is not called, and `model` is `'gemini-test'`.
  - `both failing gives the rules-only plan`: `generatedBy 'rules'`, and that plan is not cached (a second request calls both again).
  - `uses the backup alone when Gemini is not configured`: `generate: null, model: null, backup: {...}` → `model 'claude-test'`.
  - `a reused backup answer keeps the backup's model`: two label variants of the same request → Claude called once, and both plans have `model 'claude-test'`.
  - `each writer has its own daily cap`: `aiCallsPerDay: 1`, Gemini always rejects. Request 1 → Claude answers. Request 2 (other context) → Gemini is not called again, Claude is capped, `generatedBy 'rules'`.
- `env.test.ts`:
  - the defaults object gains `CLAUDE_MODEL: 'claude-haiku-5-5'`;
  - `an empty Anthropic key counts as unset`;
  - `an unsafe Claude model name is rejected` (`'claude/../x'` throws `/CLAUDE_MODEL/`).
- `appOptions.test.ts`:
  - `builds the Claude backup when a key is set`: `backupPlan.model` is `'claude-haiku-5-5'`, and it logs `Claude backup: configured (claude-haiku-5-5)`;
  - the existing "off" test also expects `backupPlan` to be undefined and the log line `Claude backup not configured.`.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/services src/config` (in `server/`)
Expected: the new tests FAIL (unknown `backup` dep or option, missing env keys, the wrong log text). The existing tests pass.

- [ ] **Step 3: Implement**

- `personalize.ts`: add the `provider` parameter.
- `dailyPlan.ts`:
  - build `writers = [first, backup]`, keeping the configured ones, each with its own day counter, as `counted()` does today;
  - try them in order with `personalize(input, counted, name)`;
  - the `answers` cache stores `{ output, model }`;
  - the plan cache condition becomes "no writers, or `generatedBy === 'ai'`";
  - update the two Gemini-only comments.
- `env.ts`: add the two keys next to the Gemini ones.
- `appOptions.ts`: build `backupPlan` with `createClaudeGenerator` when `ANTHROPIC_API_KEY` is set, and log the two lines above.
- `app.ts`: pass `backup: options.backupPlan ?? null`.

- [ ] **Step 4: Run the whole gate**

Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` (at the repo root)
Expected: all pass. The server count is 213 + the new tests, with 5 skipped; the client stays at 179.

- [ ] **Step 5: Commit**

```bash
git add server/src
git commit -m "feat(plan): Claude writes the plan when Gemini gives no accepted answer"
```

### Task 3: Docs and a local live check

**Files:**
- Modify:
  - `server/.env.example`: `ANTHROPIC_API_KEY=`, and `# CLAUDE_MODEL=claude-haiku-5-5`, with a one-line comment.
  - `SETUP.md`: the env list.
  - `DEPLOYMENT.md`:
    - "How it runs": Gemini, with Claude as backup;
    - env table: `ANTHROPIC_API_KEY` (secret, Functions only), `CLAUDE_MODEL`;
    - a new "Claude backup (owner only)" section: set a spend limit in the Anthropic Console, add the key, redeploy.
  - `PRIVACY.md`: Anthropic gets the same minimal context, only when Gemini fails.
  - `THREAT_MODEL.md`: Claude spend per instance; the Console spend limit is the real bound.
  - `ARCHITECTURE_DECISIONS.md`: ADR-007, "Claude as backup plan writer".
  - `CHANGELOG.md`.
  - `README.md`: the tech line names "Gemini provider adapter with a Claude backup".

- [ ] **Step 1: Update the docs above.** Each change is a line or a short section, with no secret values.

- [ ] **Step 2: Local live check** (needs the owner's key in `server/.env`).

1. Presence only: `grep -c '^ANTHROPIC_API_KEY=.\+' server/.env` → 1.
2. Check no Windows user or machine variable `ANTHROPIC_API_KEY` exists (it would override `.env`). Use a boolean check, as for Gemini.
3. Run a one-off scratchpad script that loads `server/.env` and calls `createClaudeGenerator` and then `personalize` with the `fixtures.ts` input.

Expected: it prints `accepted: true` and the elapsed time, under 10 s. It never prints the key.

- [ ] **Step 3: Commit**

```bash
git add server/.env.example SETUP.md DEPLOYMENT.md PRIVACY.md THREAT_MODEL.md ARCHITECTURE_DECISIONS.md CHANGELOG.md README.md docs/superpowers
git commit -m "docs: Claude backup plan writer"
```

After the plan: the final review, then the owner's yes to push. The owner adds `ANTHROPIC_API_KEY` in Netlify (secret, Functions only) and sets the Console spend limit. Redeploy, then check live:
- `curl` the plan route;
- the function log shows `Claude backup: configured (claude-haiku-5-5)`;
- while Gemini is down, plans say `Made with AI (claude-haiku-5-5, …)`.
