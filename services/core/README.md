# TIGER Core API — first runnable milestone

This service provides strictly local Ollama chat, provider diagnostics, SQLite conversation history, user-managed memories, conversation search, data export/deletion, and a bounded text-only agent workflow. It is not yet the finished desktop companion or autonomous computer-control runtime.

## Requirements
- Python 3.11+
- Ollama installed and running locally
- A model pulled into Ollama, for example: ollama pull qwen3:8b

## Run on Windows PowerShell
    cd services/core
    py -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    $env:TIGER_LOCAL_MODEL="qwen3:8b"
    uvicorn app.main:app --host 127.0.0.1 --port 8765

Open http://127.0.0.1:8765/docs. The service binds to loopback only unless you explicitly enable Android pairing in the Windows launcher.

## Run on macOS / Linux
    cd services/core
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ollama pull qwen3:8b
    uvicorn app.main:app --host 127.0.0.1 --port 8765

## Start the web interface
In a second terminal:
    cd apps/web
    npm install
    npm run dev

Open http://127.0.0.1:5173. The Vite development server proxies API requests to the local core service.

## API
- GET /health — core health
- GET /api/providers — Ollama health and model list; online AI is disabled
- POST /api/chat — JSON body with message, optional conversation_id and allow_cloud_fallback
- GET /api/conversations — list/search local conversations
- GET/DELETE /api/conversations/{conversation_id} — read or delete one conversation
- GET /api/data/export and DELETE /api/data — export or erase local user data
- GET/POST /api/memories — list and explicitly save user-approved memories
- PUT/DELETE /api/memories/{memory_id} — edit or delete a saved memory
- POST /api/agents/run — run one specialist or a planner → specialist → reviewer team
- GET /api/agents/runs — view recent agent run history

## Fully-local privacy behavior

Ollama is the only inference provider. The backend never sends chat messages, saved memories, or agent objectives to an online AI provider. If Ollama is unavailable, requests fail with HTTP 503 and an explicit local-only error.

## Current limitations
- LAN API calls require TIGER_API_TOKEN; keep the token private. HTTP LAN traffic is not encrypted, so use trusted private Wi-Fi only and never port-forward this API.
- Windows and Android shells are being packaged separately. Android requires a reachable Windows Core URL and pairing token.
- No voice, avatar, task scheduler, document RAG, or computer-control tools yet. Agent orchestration is currently text-only and does not call tools.
- SQLite stores conversation and saved-memory text unencrypted in your local user data folder.
- No file, browser, command, microphone, or screen-control capability is implemented.

## Desktop and Android app packaging

- Windows installer: the Electron app bundles the React production build and a PyInstaller-packaged FastAPI executable. Ollama and the selected model must be installed separately.
- Android APK: Capacitor packages the shared React UI. It is a companion client that calls the Windows Core over trusted local Wi-Fi; it does not run the Ollama model on the phone.
- GitHub Actions workflow: .github/workflows/installers.yml. Push a version tag (for example v0.1.0) to build both packages and publish them as GitHub Release assets.
- On Windows, run scripts/start-tiger.ps1 and opt in to Android pairing. The script creates a random token in %USERPROFILE%\.tiger\mobile-access-token.txt and prints it. Enter the PC's LAN IP URL and token in the Android app's Device connection section.
- Remote API requests are rejected unless they include the configured X-Tiger-Token. CORS preflight requests are allowed; the actual API request still requires the token.

