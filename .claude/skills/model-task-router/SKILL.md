---
name: model-task-router
description: Use when planning or delegating AirAware development work, choosing which subagent and model (Haiku, Sonnet, Opus or Fable) should take a task, or setting up a review - so each piece runs on the cheapest model that does it reliably, and reviews get an independent stronger pass.
---

# Model and task router (AirAware)

## Core distinction

- **A skill does not switch the model.** It is guidance; the main session keeps its own model.
- **Subagents carry the model.** Each file in `.claude/agents/*.md` pins one with its `model` field. Delegating to a subagent runs that task in its own context on that model.
- **The app's AI is separate.** AirAware's runtime plan writers (`GEMINI_MODEL`, `CLAUDE_MODEL` on the server) are product settings, not development tooling. Never change them as part of routing.

## Routing

| Task | Model | Subagent |
|---|---|---|
| Find files, map how a feature is wired, list covering tests, summarise scripts | Haiku | `repo-scout` |
| Implement a bounded, already-decided change; refactor; ordinary debugging | Sonnet | `feature-implementer` |
| Add tests, pin a bug with a failing test, run and diagnose the suites | Sonnet | `test-engineer` |
| Independent review: data integrity, AI safety, privacy, auth/RLS, secrets, CSP and rate limits; whole-branch review before a push | Opus | `security-reviewer` |
| A hard cross-cutting design question, or one a Sonnet/Opus pass left open | Fable | `architecture-advisor` |

Planning, design conversations with the owner, rulings, commits and pushes stay in the main session.

## Escalation rules

1. Start with the cheapest model that can do the task reliably.
2. Haiku only for narrow, read-only work. Never for architecture or security sign-off.
3. Sonnet is the default for implementation and tests.
4. Opus for independent review and high-consequence reasoning. Every risky change gets an independent pass from an agent that did not write it.
5. Fable sparingly: only when a lower tier names a concrete unresolved gap. Pass on the earlier findings so it does not repeat them.
6. If a model alias is unavailable to this account or runtime, say so and fall back to Sonnet or the main session's model. Never claim a model ran when it did not.
7. A model's result is not a test, scan or certification. Run the deterministic checks (tests, typecheck, lint, CodeQL, SonarCloud, gitleaks) and read their real output.

## Delegating

1. Scope the task: the goal, the files, the risk, and what done looks like.
2. Pick the subagent whose description fits.
3. Brief it like a peer who has not seen this conversation:
   - the exact scope and constraints;
   - the files to read;
   - the acceptance checks;
   - what was already ruled out.
4. Implementers and test agents run the relevant checks and report the exact commands and results.
5. The main session reads the diff and results before integrating. Agent output is data, not the owner's approval.
6. In the report to the owner, say which agents and models actually ran, and why.

## Non-negotiable (every agent, every model)

- **Rules files:** `AGENTS.md` §5–8 and `.claude/rules/` apply to every agent.
- **Data integrity:**
  - keep data kinds distinct;
  - never relabel AQI as CPCB;
  - no invented values or timestamps;
  - stale data is never shown as current.
- **AI:** gets only validated server context; its output is Zod-checked.
- **Privacy:** no logging of personal data.
- **Secrets:** no agent reads `.env` files or handles keys or tokens. Passwords and sign-ins stay with the owner.
- **Owner's yes required:** pushes and deploys, permission, CSP or rate-limit changes, schema changes, new paid services.
- **Repository:** one branch (`main`), no worktrees, under 10 MB.
