# TIGER — Local-First AI Companion OS

TIGER is an ambitious, local-first personal AI companion and agent workspace. It is designed to run on the user's computer, prefer locally hosted models, and use explicitly configured online providers only as an optional fallback.

> **Status:** Foundation / architecture scaffold. This repository is not yet a complete operating system or a fully implemented autonomous companion. Features are delivered in stages and should be marked complete only after tests and manual verification.

## Product principles

- **Local-first:** Ollama / OpenAI-compatible local endpoints are preferred. Offline mode must remain usable for local features.
- **Provider fallback:** Optional online free-tier or user-configured providers are attempted only when enabled, healthy, and permitted. No provider is assumed to be permanently free or unlimited.
- **User control:** No hidden screen capture, microphone recording, file access, command execution, purchases, messages, or external writes. Sensitive actions require explicit approval.
- **Auditable execution:** Every tool action has a schema, permission check, execution record, result, and cancellation path.
- **Memory ownership:** User memories are inspectable, editable, exportable, and deletable.
- **Modular agents:** Specialist agents communicate through a coordinator and typed task contracts.
- **Attribution:** Third-party code, assets, models, and datasets retain their original licenses and notices.

## Planned capabilities

1. Conversational companion with configurable tone/persona
2. Local LLM chat and provider health/fallback routing
3. Voice input/output with push-to-talk default and visible recording state
4. Explicitly approved long-term memory and conversation search
5. Multi-agent orchestration: planner, researcher, coder, reviewer, organizer
6. Long-running tasks, scheduled jobs, task history, cancellation and retry
7. Local document search / retrieval-augmented generation
8. Permission-gated file, browser and command tools
9. Desktop companion interface and optional avatar
10. Integrations through documented adapters (calendar, mail, GitHub, MCP)
11. Offline tests, diagnostics, backups, data export and deletion

## Architecture direction

- **Desktop shell:** Tauri or Electron (choose after platform prototype)
- **Backend:** Python + FastAPI (local service)
- **Agent orchestration:** LangGraph or a small typed internal state machine; avoid coupling the core to one framework
- **Model access:** OpenAI-compatible adapter for Ollama / LM Studio / llama.cpp plus provider adapters
- **Persistence:** SQLite with migrations; local vector index as an optional feature
- **Voice:** pluggable offline STT/TTS backends
- **Frontend:** React + TypeScript
- **Security:** local-only bind by default, OS secret store, scoped filesystem access, command allowlists, approval gates

## Repository layout (target)

```text
apps/desktop/          Desktop UI and shell
apps/web/              Optional browser UI
services/core/         FastAPI app, sessions, settings, health
packages/agents/       Coordinator and specialist agents
packages/models/       Local and online model adapters
packages/memory/       SQLite memory, retrieval, export/delete
packages/tools/        Permission-gated tool registry
packages/voice/        STT/TTS adapters
docs/                  Architecture, threat model, roadmap
tests/                 Unit, integration, safety and offline tests
```

## Model routing policy

1. Try configured local provider first (default endpoint: Ollama at `http://127.0.0.1:11434`).
2. If unavailable, report local provider status clearly.
3. Use a configured online provider only when the user enabled fallback and supplied/configured credentials or a genuinely unauthenticated endpoint.
4. Never silently upload private prompts, files, memories or screen context to a cloud provider. Cloud routing must show what context will leave the device and allow a per-action denial.
5. Do not describe any model/API as “free forever”; free quotas and terms can change.

## Safety baseline

- Start in **Ask before sensitive actions** mode.
- Read-only actions may run within user-selected folders.
- File writes are restricted to a selected workspace and should create backups / diffs.
- Shell commands are disabled by default; use explicit command allowlists and approval prompts.
- Browser automation, messages, email sending, purchases, account changes, deleting files and network access require per-action approval.
- Secrets never enter prompts, logs, frontend state or repository files.
- No covert persistence, credential harvesting, keylogging, surveillance or bypassing OS permissions.

## Current implementation

The repository now contains an Ollama-first FastAPI core, React browser interface, SQLite chat history, user-controlled saved memories, keyword-based local memory retrieval, a bounded planner/specialist/reviewer agent workflow, agent run history, optional opt-in online fallback, automated tests and GitHub Actions CI. GitHub Actions has passed the Python tests and React production build. End-to-end verification with a real local Ollama model on a developer machine is still pending, so this is an MVP foundation rather than a release-ready companion OS.

### Run locally

1. Install Python 3.11+ and [Ollama](https://ollama.com/download), then pull a local model: `ollama pull qwen3:8b`.
2. In one terminal, run the backend:
   ```powershell
   cd services/core
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8765
   ```
3. In another terminal, run the web UI:
   ```powershell
   cd apps/web
   npm install
   npm run dev
   ```
4. Open http://127.0.0.1:5173. Backend API documentation is at http://127.0.0.1:8765/docs.

For Linux/macOS commands, optional online-provider configuration, API details and limitations, see [services/core/README.md](services/core/README.md).

See [ROADMAP.md](ROADMAP.md), [architecture](docs/ARCHITECTURE.md), [reference and license notes](docs/REFERENCES.md), [SECURITY.md](SECURITY.md), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Inspirations and attribution

TIGER studies patterns from:

- [Sentient](https://github.com/existence-master/Sentient) — local personal assistant, long tasks, memory and voice (AGPL-3.0; consult its terms before incorporating code).
- [AILIS](https://github.com/haowenGuo/AILIS) — desktop companion, avatar and agent runtime (MIT; preserve notices for reused code/assets).
- [Yantrik OS](https://github.com/yantrikos/yantrik-os) — agent-operable desktop and permission gates (GPL-3.0).
- [Dodaios](https://github.com/Dodaios/Dodaios) — multi-agent orchestration for engineering workflows (MIT).
- [Sara](https://github.com/farena-ai/sara) — self-hosted companion, persona and controlled coding harness (MIT).
- [SideKick](https://github.com/eponce00/sidekick) — local-first desktop agent, workspace safety and provider architecture (GPL-3.0).

This project does **not** claim to be a merger, fork, or endorsed derivative of those projects. Their features and architecture are reference material; any copied code must comply with its applicable license and attribution requirements.

## License

Until third-party code is incorporated, original TIGER scaffold material is licensed under MIT; see [LICENSE](LICENSE). This does not relicense third-party components or assets. If GPL/AGPL-covered code is incorporated, licensing and distribution obligations must be reviewed before release.
