# TIGER — Local-First AI Companion OS

TIGER is a fully-local personal AI companion with a Windows 11 desktop app and an Android mobile companion. The Windows PC hosts the Ollama model and local data; Android connects to that PC over a trusted local Wi-Fi network using a pairing token. No online AI provider is used.

> **Status:** Active MVP development. Local chat, user-managed memory, text-only agent workflows, local conversation search and personal-data export/deletion are implemented. This is not yet a finished desktop OS: voice, avatar, scheduled autonomy, document retrieval and approved computer tools remain roadmap items.

## Installable desktop and mobile apps

TIGER uses one shared React interface with two installable shells:

- **Windows 11 desktop:** Electron installer (TIGER-Setup-*.exe). The installer bundles the TIGER Python API as a Windows executable. Install [Ollama for Windows](https://ollama.com/download) separately and pull a model such as qwen3:8b; the model itself is not bundled in the installer.
- **Android mobile:** Capacitor APK (app-debug.apk). This is a companion client, not a standalone on-device LLM. It connects to the Windows TIGER Core over your trusted private Wi-Fi; the AI model and database remain on the PC.

### Get installers from GitHub

1. Open the repository's [Releases](https://github.com/yuvarajloganathan2006-hue/tiger/releases).
2. Download TIGER-Setup-*.exe for Windows or app-debug.apk for Android.
3. On Windows, install Ollama and pull qwen3:8b, then install and launch TIGER.
4. On Android, install the APK (Android may ask you to allow installation from your browser/file manager). Keep the phone and PC on the same trusted Wi-Fi.
5. Launch the Windows desktop app and choose Enable Android pairing when prompted. Copy the displayed Core URL and random pairing token into the mobile app's Device connection section.

To publish a release, push a version tag such as v0.1.0. GitHub Actions builds both installable packages and attaches them to a GitHub Release. A manual workflow run also uploads build artifacts for testing.

**Important security note:** Android pairing currently uses HTTP on the local network with a long random token. Use only a trusted private Wi-Fi network; do not port-forward the TIGER API or use this pairing over public Wi-Fi. The APK is debug-signed for direct testing and is not yet a Play Store production release. The Windows installer is currently unsigned, so Windows SmartScreen may show a publisher warning.
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

- **Desktop shell:** Electron for the Windows desktop package; Capacitor for Android
- **Backend:** Python + FastAPI (local service)
- **Agent orchestration:** LangGraph or a small typed internal state machine; avoid coupling the core to one framework
- **Model access:** OpenAI-compatible adapter for Ollama / LM Studio / llama.cpp plus provider adapters
- **Persistence:** SQLite with migrations; local vector index as an optional feature
- **Voice:** pluggable offline STT/TTS backends
- **Frontend:** React + TypeScript
- **Security:** local-only bind by default, OS secret store, scoped filesystem access, command allowlists, approval gates

## Repository layout (target)

```text
apps/desktop/          Electron Windows desktop shell
apps/web/              Shared React UI + Capacitor Android shell
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
