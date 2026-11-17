# Contributing to AirAware AI

## Development principles
- Read `AGENTS.md`, `CLAUDE.md`, and relevant project docs.
- Keep changes small and directly tied to an issue or requirement.
- Preserve the source/observation/forecast distinction.
- Add tests for business rules and edge cases.
- Update documentation when data contracts, APIs, or behavior changes.
- Do not commit secrets, generated data, or large assets.

## Branch policy
For the Hack2Skills submission, keep exactly one branch, `main`. Work directly on `main` in small verified commits unless the challenge rules are later confirmed to allow additional branches. Do not create feature branches or worktrees that leave additional branch refs in the repository.

## Before committing
```bash
git status
npm run lint
npm run typecheck
npm test
npm run build
```
Run the scripts that actually exist in each workspace; do not claim a missing script passed.

## Commit message examples
- `chore: scaffold client and server`
- `feat: add pollutant source metadata`
- `feat: implement daily action plan`
- `fix: mark stale observations`
- `test: cover CPCB category boundaries`
- `docs: clarify forecast limitations`

## Review checklist
- Is the implementation necessary?
- Does it preserve existing behavior?
- Are inputs and outputs validated?
- Are permissions and privacy respected?
- Are source and timestamp labels correct?
- Are failure states handled?
- Are tests included?
- Are docs updated?
