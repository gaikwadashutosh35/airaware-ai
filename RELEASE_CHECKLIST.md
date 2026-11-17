# AirAware AI — Release and Submission Checklist

## Application release
- [ ] Core location → data → recommendations journey works.
- [ ] Observation, forecast, and demo labels are correct.
- [ ] Data source/time/units and stale status are visible.
- [ ] No fabricated readings or source links.
- [ ] Indoor guidance considers indoor sources.
- [ ] AI explanations are validated.
- [ ] No medical diagnosis/treatment or safety guarantees.
- [ ] All key controls work on mobile and desktop.
- [ ] Keyboard and accessibility checks completed.
- [ ] Empty, loading, stale, offline, and error states reviewed.

## Engineering release
- [ ] Clean install succeeds from lockfile.
- [ ] Build/typecheck/lint pass.
- [ ] Unit and API tests pass.
- [ ] Main E2E journey passes.
- [ ] RLS and cross-user tests pass.
- [ ] CodeQL findings reviewed.
- [ ] SonarQube findings/quality gate reviewed if configured.
- [ ] Dependency and secret scans reviewed.
- [ ] Final diff reviewed.
- [ ] Environment variables documented.

## Production release
- [ ] Supabase production migrations applied and verified.
- [ ] Render health endpoint passes.
- [ ] Vercel frontend works.
- [ ] CORS and auth redirect URLs correct.
- [ ] Production provider access verified.
- [ ] No secrets exposed.
- [ ] Data deletion behavior tested.
- [ ] Backup/recovery expectations understood.

## Challenge submission
- [ ] Repository public.
- [ ] Exactly one branch `main`.
- [ ] Git repository including history <10 MB.
- [ ] No node_modules/build output/large binaries in history.
- [ ] README contains vertical, approach, logic, operation, assumptions.
- [ ] Live URLs are verified.
- [ ] Official submission instructions re-read.
- [ ] One of the maximum three attempts is used only after final review.

## Release record
```text
Release:
Commit:
Date:
Frontend:
Backend:
Tests:
CodeQL:
SonarQube:
Known issues:
Submission attempt:
```
