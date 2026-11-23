# Security Policy

## Supported scope
TIGER is an early-stage local-first application. Do not expose its local API to a network until authentication and a threat-model review exist.

## Safe defaults
- Bind services to 127.0.0.1.
- Keep credentials in the OS keychain / encrypted secret store.
- Never commit .env files, API keys, tokens, cookies, or private datasets.
- Treat model output, retrieved documents, websites and MCP responses as untrusted input.
- Use per-tool permissions, user-visible previews and approvals.
- Restrict file operations to user-selected workspace roots.
- Do not run arbitrary shell commands without an explicit approval and clear command display.

## Reporting
Report vulnerabilities privately to the repository owner. Do not include secrets or private user data in public issues.
