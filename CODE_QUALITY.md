# AirAware AI — Code Quality and Independent Review

## 1. Quality tools and responsibilities

| Tool | Main responsibility | Does not replace |
|---|---|---|
| TypeScript | Static type checks | Runtime validation |
| oxlint (type-aware) / Prettier | Consistency, common mistakes, a11y lint rules | Architecture review |
| Vitest | Unit tests | E2E and integration |
| Playwright | Browser/user journeys | Security scanning |
| CodeQL | Security vulnerability and code-pattern analysis | Penetration testing |
| SonarQube Cloud | Bugs, code smells, maintainability and quality gates | Product/domain correctness |
| Unslop | UI design audit/refinement | Accessibility test automation |
| axe-core | Automated accessibility checks | Manual assistive-technology testing |

## 2. CodeQL

Official docs:
- https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning
- https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning

CodeQL supports JavaScript/TypeScript. Public GitHub repositories are eligible for code scanning, subject to GitHub's current requirements. Default setup is the simplest low-maintenance starting point for eligible repositories.

Suggested setup:
1. Push the repository publicly to GitHub.
2. Open Settings → Security and quality → Code security.
3. Find CodeQL code scanning and choose Set up → Default.
4. Review languages and query suite.
5. Enable CodeQL.
6. Wait for the first GitHub Actions scan.
7. Review actual alerts and fix genuine findings.

Use either CodeQL default setup or a deliberately configured advanced workflow; do not create conflicting duplicate CodeQL configurations. Do not commit generated CodeQL databases or SARIF artifacts.

## 3. SonarQube Cloud

Official references:
- https://docs.sonarsource.com/sonarqube-cloud/getting-started/github
- https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/overview-of-integrated-cis
- https://github.com/SonarSource/sonarqube-scan-action

Import the repository into SonarQube Cloud and choose an analysis mode. Automatic analysis may be available for eligible GitHub projects. For a client/server monorepo, verify current monorepo and automatic-analysis support; CI-based scanning may be the better fit.

Important:
- Do not run automatic and CI-based analysis concurrently for the same SonarQube Cloud project.
- Store scanner tokens in GitHub Actions secrets, never source files.
- Configure source/test paths and exclusions to match the actual repository.
- If client and server need separate project analyses, configure and document each rather than scanning duplicate source unintentionally.
- Review the actual quality gate and new-code findings.

## 4. Unslop

Repository:
https://github.com/heydamir/unslop

Unslop is a Claude Code skill for auditing and improving AI-generated UI. It reviews visual direction, spacing, color, icons, copy, typography, layout, details, visuals, and motion.

Official repository install instructions (verify again before execution):
```bash
claude plugin marketplace add heydamir/unslop
claude plugin install unslop@heydamir --scope project
```

Then restart Claude Code or run `/reload-plugins`.

Use:
```text
/unslop audit the AirAware AI landing page and dashboard.
First report problems and propose a visual direction. Do not edit until I approve the direction.
```

Unslop has a CC BY 4.0 license. If its material is copied or adapted, preserve required attribution and repository link. Installing a skill is code/tooling trust: inspect its files and scripts before use.

## 5. Quality gate

Before a feature is accepted:
- Build passes.
- Typecheck passes.
- Lint passes.
- Relevant unit/integration tests pass.
- E2E smoke test passes for critical flows.
- No unresolved critical security finding.
- New high-severity issues are fixed or explicitly accepted with reasoning.
- Data-integrity tests pass.
- Accessibility checks are reviewed.
- UI is inspected in browser where applicable.

## 6. Findings management

For each finding record:
- Tool and rule/issue ID.
- Severity and confidence.
- File/line.
- Reproduction/evidence.
- Security or user impact.
- True positive / false positive / accepted risk.
- Fix and regression test.
- Reviewer and resolution date.

Never suppress a finding simply to make a dashboard green. If suppression is justified, add a narrow documented reason and expiry/review date.

## 7. Reporting template

```text
Code Quality Report
Commit:
Date:
Typecheck:
Lint:
Unit/integration:
E2E:
CodeQL run:
CodeQL unresolved alerts:
Sonar project/quality gate:
Unslop audit:
Accessibility review:
Fixes:
Accepted risks:
Release decision:
```
