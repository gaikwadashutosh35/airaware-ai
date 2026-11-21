# AirAware AI — Claude Code Project Instructions

@AGENTS.md

## Claude Code operating notes

- Start by reading `START_HERE.md` and the relevant product/engineering documents.
- Treat `AGENTS.md` as the shared project rules source.
- Do not duplicate the full contents of every documentation file into this instruction file.
- Use `.claude/rules/` for path-specific guidance.
- Discover installed skills and plugins before claiming to use them.
- For each task, load only the skills relevant to that task.
- Use Superpowers as the default substantial engineering workflow when installed.
- Use Karpathy-inspired principles as lightweight coding standards.
- Use Unslop for visual audits when installed; use Hallmark/Emil only when the task calls for them.
- Use CodeQL and SonarQube as independent quality tools when configured.
- Never say a scanner passed unless the scan actually completed and its findings were reviewed.
- Ask before broad architecture changes, new paid services, data migrations, permission changes, destructive operations, or production deployment.
- Keep the challenge's one-branch and under-10-MB repository rules in view.

## Model routing

- When delegating, use the `model-task-router` skill: it picks the subagent and model for each task.
- The subagents in `.claude/agents/`:
  - `repo-scout` (Haiku);
  - `feature-implementer` and `test-engineer` (Sonnet);
  - `security-reviewer` (Opus);
  - `architecture-advisor` (Fable).
- The main session keeps planning, rulings, commits and pushes.
- Report which agents and models actually ran.

## Session start checklist

1. Check `git status` and the current branch.
2. Read `START_HERE.md`.
3. Read `IMPLEMENTATION_ROADMAP.md` and the documents relevant to the task.
4. Inspect the actual codebase and package scripts.
5. Identify available skills, MCP servers, and installed tooling.
6. State the next small milestone and acceptance criteria.
7. Do not invent repository state, API data, test results, or deployment status.
