# TIGER Roadmap

Progress is not claimed until implementation, automated tests, and manual verification are complete. The fully-local backend/data-controls milestone passes automated API tests and the web production build on 2026-11-23. Real Ollama testing on Windows 11 remains pending.

## M0 — Project foundation
- [x] Product principles and target architecture documented
- [x] Fully-local privacy policy documented
- [x] Reference projects and license cautions documented
- [x] CI workflow and code quality gates (Python tests + frontend production build)
- [ ] Threat model reviewed

## M1 — Working local core
- [x] FastAPI service configured to bind to 127.0.0.1 in Windows launch script
- [x] Ollama health check and model discovery
- [x] Local chat endpoint using Ollama chat API
- [x] SQLite persistence for messages, memories and agent runs (schema version marker; migration framework remains)
- [x] React chat and agent interface
- [x] Offline unit tests with mocked provider
- [x] Windows 11 setup and launch scripts
- [ ] Manual Windows 11 + real Ollama end-to-end verification

## M2 — Local model runtime
- [x] Ollama-only inference path
- [x] Fail-closed behavior when the local model is unavailable
- [x] Local model discovery and provider diagnostics
- [ ] Model selection and runtime settings UI
- [ ] Streaming responses and cancellation

## M3 — Companion memory
- [x] User-controlled memory entries
- [x] Unicode-aware local keyword retrieval
- [x] Explicit save / edit / forget API (UI supports save and delete)
- [x] Local conversation search (SQLite text matching)
- [ ] SQLite FTS5 search; optional local embeddings
- [x] JSON export and delete all user data
- [x] Individual conversation deletion
- [ ] Memory provenance and correction

## M4 — Multi-agent runtime
- [x] Bounded coordinator workflow (planner → specialist → reviewer)
- [x] Planner and task decomposition
- [x] Researcher, developer, reviewer, organizer agent roles
- [x] Typed agent request/response and bounded input / stage count
- [x] Agent run status and result history (retry/cancellation pending)
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
- [ ] Windows desktop shell and installer
- [ ] macOS and Linux builds
- [ ] Secure updates and signed release process
- [ ] Backup/restore and crash recovery
- [ ] Accessibility and performance audit
- [ ] Security review and documented limitations
