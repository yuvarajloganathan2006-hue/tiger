# TIGER — Local-First AI Companion OS

TIGER is a fully-local personal AI companion and agent workspace, being built for Windows 11 first. Prompts, memories and conversation data stay on the device; the current runtime has no online AI provider route.

> **Status:** Active MVP development. Local chat, user-managed memory, text-only agent workflows, local conversation search and personal-data export/deletion are implemented. This is not yet a finished desktop OS: voice, avatar, scheduled autonomy, document retrieval and approved computer tools remain roadmap items.

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
2. Local LLM chat and provider health diagnostics
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

1. Ollama is the only inference provider in this fully-local build.
2. If Ollama is unavailable, TIGER reports a local error and stops.
3. The backend does not make online AI completion requests; request flags for older clients are ignored.
4. Do not put secrets into prompts. The SQLite database is currently unencrypted and should be protected by your Windows account and device encryption.
5. Local Ollama itself may download model files during setup; after the model is installed, inference can run without an internet connection.

## Safety baseline

- Start in **Ask before sensitive actions** mode.
- Read-only actions may run within user-selected folders.
- File writes are restricted to a selected workspace and should create backups / diffs.
- Shell commands are disabled by default; use explicit command allowlists and approval prompts.
- Browser automation, messages, email sending, purchases, account changes, deleting files and network access require per-action approval.
- Secrets never enter prompts, logs, frontend state or repository files.
- No covert persistence, credential harvesting, keylogging, surveillance or bypassing OS permissions.

## Current implementation

The current implementation includes an Ollama-only FastAPI core, React interface, SQLite chat history, user-controlled saved memories, local keyword-based memory retrieval, bounded planner/specialist/reviewer text workflows, agent run history, conversation search, conversation deletion, JSON data export and a delete-all-data endpoint. CI verifies Python API tests and the React production build. A real Ollama run on a Windows 11 machine has not yet been independently verified.

### Windows 11 quick setup

Install Python 3.11+, Node.js 20+ and [Ollama](https://ollama.com/download). Clone this repository, open PowerShell in its root folder, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup-windows.ps1
.\scripts\start-tiger.ps1
```

The setup script installs Python and Node dependencies and pulls the configured local model (default `qwen3:8b`). The launch script starts the backend and frontend bound to loopback and opens http://127.0.0.1:5173. API documentation is at http://127.0.0.1:8765/docs.

To select a different model before setup or launch, set `$env:TIGER_LOCAL_MODEL = "your-ollama-model"`. Ensure it is already available with `ollama pull`.

See [ROADMAP.md](ROADMAP.md), [core API details](services/core/README.md), [architecture](docs/ARCHITECTURE.md), [reference and license notes](docs/REFERENCES.md), [SECURITY.md](SECURITY.md), and [CONTRIBUTING.md](CONTRIBUTING.md).

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
