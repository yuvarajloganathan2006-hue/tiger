# TIGER Architecture

## High-level flow

```text
React desktop UI
      |
Local API (127.0.0.1)
      |
Session / policy / approval service
      |----------------------------|
Model router                 Tool registry
      |                            |
Local model (Ollama)         Scoped tools
      |                      (files, browser,
Opt-in cloud fallback        commands, MCP)
      |
Agent coordinator ---- specialist agents
      |
Memory service (SQLite; user-owned)
      |
Audit log + task scheduler
```

## Core boundaries

### Model router
A provider adapter exposes health, model listing and chat completion. Local providers have priority. Cloud fallback is disabled by default and may only be activated after user configuration and explicit context disclosure.

### Agent runtime
The coordinator creates bounded tasks for specialists. Each task has an objective, context allowlist, max steps, time/token budget, result schema and cancellation token. Agents cannot directly bypass tool policy.

### Tool execution
Every tool has a JSON schema, risk classification, scope, and audit event. Read actions are restricted to user-approved roots. Writes produce a preview/diff and require approval. Shell, browser, sending messages and external mutations require approval.

### Memory
SQLite stores conversations, task metadata and user-approved memories. Every memory has source, timestamp, confidence and user-editable status. User can inspect, export, correct or delete memories.

### Voice
Voice is an optional adapter. Push-to-talk is the default; wake-word mode requires separate opt-in. Recording state is visible; audio is processed locally where supported.

## Local model and fallback sequence

1. Health-check the configured local endpoint.
2. Use the selected local model if healthy.
3. On failure, surface the reason and ask/consult a user-enabled fallback policy.
4. Before cloud use, show provider, model and the categories of context to be transmitted.
5. Exclude secrets, credentials, local paths and private memory unless each item is explicitly selected.
6. Record provider selection and user consent, never raw secrets.

## Deployment
Backend binds to loopback only by default. No public listener, remote-control tunnel, or LAN exposure without an explicit configuration and authentication layer.
