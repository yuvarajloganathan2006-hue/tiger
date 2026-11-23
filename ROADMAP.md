# TIGER Roadmap

Progress is not claimed until implementation, automated tests, and manual verification are complete. The initial backend and web UI are committed; GitHub Actions passed the API tests and frontend build on 2026-11-23. End-to-end testing with Ollama on a local Windows/macOS/Linux machine remains pending.

## M0 — Project foundation
- [x] Product principles and target architecture documented
- [x] Local-first and cloud-consent policy documented
- [x] Reference projects and license cautions documented
- [ ] CI workflow and code quality gates
- [ ] Threat model reviewed

## M1 — Working local core
- [ ] FastAPI service bound to 127.0.0.1 only
- [ ] Ollama health check and model discovery
- [ ] Local chat endpoint using Ollama chat API
- [ ] SQLite persistence and schema migrations
- [ ] Basic React chat interface
- [ ] Offline unit tests with mocked provider
- [ ] Clear setup guide for Windows

## M2 — Provider routing
- [ ] Local provider priority and timeout handling
- [ ] Optional cloud providers, opt-in only
- [ ] Per-provider health and model settings
- [ ] Context disclosure before cloud transmission
- [ ] No silent cloud fallback for private context
- [ ] Provider-independent error normalization

## M3 — Companion memory
- [ ] User-controlled memory entries
- [ ] Explicit save / edit / forget controls
- [ ] Conversation search
- [ ] SQLite full-text search; optional embeddings
- [ ] Export and delete all user data
- [ ] Memory provenance and correction

## M4 — Multi-agent runtime
- [ ] Coordinator / supervisor
- [ ] Planner and task decomposition
- [ ] Researcher, coder, reviewer, organizer agents
- [ ] Typed agent messages and bounded budgets
- [ ] Task state, logs, retry, cancellation
- [ ] Human approval for external and destructive actions
- [ ] Agent evaluation tests and prompt-injection defenses

## M5 — Tools and integrations
- [ ] Scoped file tools with preview and rollback
- [ ] Browser adapter with explicit session and approvals
- [ ] Command execution disabled by default; strict allowlist
- [ ] MCP client with per-server trust controls
- [ ] Calendar, mail and GitHub adapters, each opt-in
- [ ] Audit log and permissions UI

## M6 — Voice and embodied companion
- [ ] Push-to-talk input and visible microphone state
- [ ] Offline STT adapter
- [ ] Offline TTS adapter
- [ ] Interruptible speech playback
- [ ] Optional 3D avatar / VRM viewer
- [ ] Camera/screen access disabled until user opt-in

## M7 — Desktop release readiness
- [ ] Windows installer
- [ ] macOS and Linux builds
- [ ] Secure updates and signed release process
- [ ] Backup/restore and crash recovery
- [ ] Accessibility and performance audit
- [ ] Security review and documented limitations
