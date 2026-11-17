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
