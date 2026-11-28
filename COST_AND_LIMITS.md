# AirAware AI — Cost, Quotas, and Service Limits

## Principles
- Prefer free/low-cost tiers for a challenge MVP, but verify current terms.
- Do not assume free tiers allow commercial use or unlimited traffic.
- Keep external provider calls server-side.
- Set timeouts, rate limits, caching, and usage budgets.
- Avoid unnecessary paid MCP servers or AI tools.
- Do not make a service a hard dependency if a safe unavailable state can be shown.

## Cost categories
| Service | Potential cost driver |
|---|---|
| Gemini/runtime AI | Input/output tokens, request volume, model selection |
| Supabase | Database size, auth MAUs, bandwidth, compute/egress |
| Render | Runtime hours, memory, networking |
| Vercel | Build/deploy usage, bandwidth, team features |
| Air-quality API | Request quota, commercial terms, attribution |
| SonarQube Cloud | Plan/LOC limits and features |
| GitHub Actions | Workflow minutes and concurrency |

## Engineering controls
- Bound AI input and output tokens.
- Store only bounded conversation history.
- Cache provider responses with source timestamps retained.
- Avoid repeated identical generation requests.
- Add per-user and global rate limits.
- Return provider-unavailable states gracefully.
- Measure cost per successful generated plan.
- Keep development/test credentials separate from production.

## Before adding a paid dependency
1. Explain why it is required.
2. Identify free/open-source alternatives.
3. Check license and commercial terms.
4. Estimate usage and cost.
5. Ask the project owner before enabling it.

## Current values
Do not hardcode assumed quotas or prices in code. Record verified plan limits and the date checked in a future release note.

**Netlify hosting (credit-based plan, checked 2026-11-19; `DEPLOYMENT.md`).**

| Item | Credits |
|---|---|
| Production deploy | 15 each |
| Bandwidth | 20 per GB |
| Web requests | 2 per 10 000 |
| Function compute | 10 per GB-hour |

- At a zero balance Netlify pauses the site.
- Function limits: 60 s synchronous execution limit; 1024 MB default memory.
- No Google Cloud billing is used.
- **Claude Ask (typed Ask questions, J26; prices checked 2026-11-28).**

| Item | Value |
|---|---|
| Model | Claude Haiku 5.5, `claude-haiku-5-5` |
| Price | $0.10 per million input tokens, $0.50 per million output tokens |
| Typical cost per call | about $0.0005 |
| Worst case per call | about $0.0025 (4096 output tokens at $0.50 per million, plus input) |
| Cap | 200 calls per UTC day per server instance, in memory (each new instance starts its own count) |
| Worst case per instance | about $0.50 a day at the 200-call cap |
| Rate limit | shares the 10 per minute per IP of the other AI routes |
| Workspace spend limit | **Owner, before deploy:** set a monthly limit for the workspace in the Anthropic Console, and record it here. Not set yet. |

- **Supabase free tier:** the project pauses after 7 days without API activity, which the keep-alive workflow prevents.
