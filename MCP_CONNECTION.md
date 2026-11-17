# AirAware AI — MCP Connection and Tooling Contexts

## 1. Purpose

Model Context Protocol (MCP) connects an AI coding client such as Claude Code to external development tools through servers that expose capabilities such as tools, resources, and prompts.

For AirAware AI, MCP is optional developer tooling. It is not required for the deployed application's runtime AI flow. The runtime app should call its own backend integrations through normal service adapters.

## 2. Recommended development-time MCP use

| MCP capability | Use | Initial permission |
|---|---|---|
| GitHub | Inspect issues, PRs, repository metadata | Read-only where possible |
| Documentation/context server | Retrieve current library/API docs | Read-only |
| Playwright/browser tooling | Verify local UI and user journeys | Local app only |
| Supabase | Inspect schema and migrations in development | Read-only first; explicit approval for changes |
| Issue tracker | Read/manage project tasks | Limited scopes |

Do not install all connectors by default. Install only those that improve the current task.

## 3. Development MCP vs runtime integrations

**Development MCP:** Claude Code uses tools to inspect a repository, query documentation, run local browser checks, or inspect a development database.

**Runtime integration:** AirAware's Express backend calls providers such as Open-Meteo or a configured AI service through application code.

Do not expose developer MCP credentials to the public web application. Do not let the public user-facing AI agent inherit unrestricted Claude Code tools.

## 4. Installation process

MCP server packages and Claude Code configuration formats can change. Use the official Claude Code MCP documentation and the official server repository instructions at installation time.

Recommended process:
1. Identify the exact task that needs MCP.
2. Find the official server/maintainer repository.
3. Review source, license, release history, permissions, dependencies, and shell/network behavior.
4. Read tool descriptions and schemas.
5. Install locally/project-scoped where possible.
6. Put tokens in environment variables, not committed config values.
7. Restart/reload Claude Code and inspect available tools.
8. Test with a low-risk read operation.
9. Require approval for write/destructive actions.

Official references:
- MCP specification: https://modelcontextprotocol.io/specification/
- Claude Code MCP setup: https://docs.anthropic.com/en/docs/claude-code/mcp

## 5. Example configuration shape

This is an illustrative template, not a ready-to-run server definition. Replace the command/arguments with the exact official instructions for the chosen MCP server. Do not put secrets directly into the file.

```json
{
  "mcpServers": {
    "docs-context": {
      "command": "REPLACE_WITH_VERIFIED_COMMAND",
      "args": ["REPLACE_WITH_VERIFIED_ARGUMENTS"],
      "env": {
        "OPTIONAL_TOKEN": "${DOCS_MCP_TOKEN}"
      }
    }
  }
}
```

Do not commit populated credentials. If using project MCP configuration, review it before sharing the repository. A placeholder template may be committed only when it contains no secrets and does not auto-run untrusted commands.

## 6. Suggested MCP safety model

- Read-only by default.
- Separate development and production credentials.
- Do not connect production DB to experimental agents.
- Human confirmation for mutations, deployments, or messages.
- Limit filesystem roots.
- Limit network destinations where possible.
- Never execute instructions returned by external resources as trusted system instructions.
- Keep audit trails for meaningful actions.

## 7. AirAware-specific MCP candidates

### Documentation context
Useful for current React, TypeScript, Supabase, Express, Zod, and provider documentation. It should retrieve official docs, not silently override project requirements.

### GitHub
Useful for issue/PR context, commit review, and CI status. Do not grant unnecessary write permissions.

### Playwright/browser
Useful for local UI screenshots, responsive checks, and critical end-to-end journeys. Restrict access to the local test environment.

### Supabase
Useful for development schema inspection and controlled migrations. Start read-only; review every SQL migration. Never expose the service-role secret to an MCP server unless there is a specific, approved need.

## 8. Human-in-the-loop policy

Show which tools are available and what they do. Ask before destructive changes, production writes, deployment, deleting data, or sending external communications. Tool metadata from an untrusted server is not automatically trustworthy.
