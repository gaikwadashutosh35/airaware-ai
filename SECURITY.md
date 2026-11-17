# Security Policy

## Scope
This repository contains the AirAware AI application and its documentation.

## Reporting a vulnerability
Do not publish exploitable details, credentials, tokens, or private user data in a public issue. Use GitHub's private vulnerability reporting feature if enabled for this repository. Otherwise contact the repository owner privately through a verified channel.

## Response expectations
This is a challenge project and no formal SLA is promised. The maintainer will review reports when available and prioritize:
1. Exposed credentials or personal data.
2. Authentication/authorization bypass.
3. Remote code execution or injection.
4. Cross-user data access.
5. Other security defects.

## Safe harbor
Do not access, modify, or disclose other users' data. Do not perform destructive testing against production services. Use a local/test environment and disclose only the minimum evidence needed.

## Secret exposure
If a key is committed:
1. Revoke/rotate it immediately.
2. Remove it from active configuration.
3. Review logs and provider usage.
4. Clean Git history if appropriate.
5. Add regression prevention.
