# TIGER Core API — first runnable milestone

This service provides local Ollama chat, provider diagnostics, and SQLite conversation history. It is a foundation, not the finished desktop companion or multi-agent runtime.

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

Open http://127.0.0.1:8765/docs. The service binds to loopback only.

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
- GET /api/providers — Ollama health and model list, plus fallback configuration status
- POST /api/chat — JSON body with message, optional conversation_id and allow_cloud_fallback
- GET /api/conversations/{conversation_id} — locally stored messages

## Optional online fallback
By default, online fallback is disabled. Configure TIGER_CLOUD_FALLBACK_ENABLED=true, TIGER_CLOUD_BASE_URL, TIGER_CLOUD_MODEL and TIGER_CLOUD_API_KEY in your environment. Each request also requires allow_cloud_fallback=true. The web interface shows a consent checkbox only after a provider is configured. This is a generic OpenAI-compatible endpoint; configure a provider whose current terms and free-tier rules you have checked. Provider availability and free quotas can change.

When fallback is allowed, the recent conversation history (up to 20 messages) is sent to the configured provider. Do not enable it for sensitive conversations.

## Current limitations
- No authentication; do not bind this API beyond localhost.
- The frontend is a browser UI, not a packaged desktop app.
- No voice, avatar, autonomous agents, task scheduler, document RAG, or computer-control tools yet.
- SQLite stores conversation text unencrypted in your local user data folder.
- No file, browser, command, microphone, or screen-control capability is implemented.
