from __future__ import annotations

import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


APP_NAME = "TIGER Local Core"
OLLAMA_URL = os.getenv("TIGER_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
LOCAL_MODEL = os.getenv("TIGER_LOCAL_MODEL", "qwen3:8b")
CLOUD_ENABLED = os.getenv("TIGER_CLOUD_FALLBACK_ENABLED", "false").lower() == "true"
CLOUD_BASE_URL = os.getenv("TIGER_CLOUD_BASE_URL", "").rstrip("/")
CLOUD_MODEL = os.getenv("TIGER_CLOUD_MODEL", "")
CLOUD_API_KEY = os.getenv("TIGER_CLOUD_API_KEY", "")
DB_PATH = Path(os.getenv("TIGER_DB_PATH") or (Path.home() / ".tiger" / "tiger.sqlite3"))


def connect_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    return db


def init_db() -> None:
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                provider TEXT,
                model TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_conversation "
            "ON messages(conversation_id, id)"
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=APP_NAME, version="0.1.0", lifespan=lifespan)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)
    conversation_id: str | None = None
    # A request-level opt-in is required in addition to server configuration.
    allow_cloud_fallback: bool = False


class ChatResponse(BaseModel):
    conversation_id: str
    reply: str
    provider: Literal["ollama", "online"]
    model: str


def get_recent_messages(conversation_id: str, limit: int = 20) -> list[dict[str, str]]:
    with connect_db() as db:
        rows = db.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? "
            "ORDER BY id DESC LIMIT ?",
            (conversation_id, limit),
        ).fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in reversed(rows)]


def store_message(
    conversation_id: str,
    role: str,
    content: str,
    provider: str | None = None,
    model: str | None = None,
) -> None:
    with connect_db() as db:
        db.execute(
            "INSERT INTO messages(conversation_id, role, content, provider, model) "
            "VALUES (?, ?, ?, ?, ?)",
            (conversation_id, role, content, provider, model),
        )


async def ollama_chat(messages: list[dict[str, str]]) -> str:
    payload = {"model": LOCAL_MODEL, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=5.0)) as client:
        response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
    content = data.get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Ollama returned an empty or invalid message.")
    return content


async def online_chat(messages: list[dict[str, str]]) -> str:
    if not CLOUD_ENABLED:
        raise RuntimeError("Online fallback is disabled by server configuration.")
    if not CLOUD_BASE_URL or not CLOUD_MODEL or not CLOUD_API_KEY:
        raise RuntimeError("Online fallback is missing its base URL, model, or API key.")
    headers = {"Authorization": f"Bearer {CLOUD_API_KEY}"}
    payload = {"model": CLOUD_MODEL, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        response = await client.post(
            f"{CLOUD_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Online provider returned an empty or invalid message.")
    return content


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "app": APP_NAME}


@app.get("/api/providers")
async def providers() -> dict:
    local_ok = False
    local_models: list[str] = []
    local_error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
            local_models = [
                item.get("name", "")
                for item in response.json().get("models", [])
                if item.get("name")
            ]
            local_ok = True
    except (httpx.HTTPError, ValueError) as exc:
        local_error = str(exc)

    return {
        "local": {
            "provider": "ollama",
            "url": OLLAMA_URL,
            "healthy": local_ok,
            "selected_model": LOCAL_MODEL,
            "available_models": local_models,
            "error": local_error,
        },
        "online_fallback": {
            "configured": bool(CLOUD_ENABLED and CLOUD_BASE_URL and CLOUD_MODEL and CLOUD_API_KEY),
            "enabled": CLOUD_ENABLED,
            "model": CLOUD_MODEL or None,
            "requires_request_consent": True,
        },
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    conversation_id = request.conversation_id or str(uuid.uuid4())
    if len(conversation_id) > 128:
        raise HTTPException(status_code=400, detail="conversation_id is too long")

    store_message(conversation_id, "user", request.message)
    messages = get_recent_messages(conversation_id)

    try:
        reply = await ollama_chat(messages)
        provider: Literal["ollama", "online"] = "ollama"
        model = LOCAL_MODEL
    except (httpx.HTTPError, RuntimeError, ValueError) as local_error:
        # Never send content online unless both switches are enabled.
        if not (CLOUD_ENABLED and request.allow_cloud_fallback):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Local model unavailable. No data was sent online. "
                    f"Local provider error: {local_error}"
                ),
            ) from local_error
        try:
            reply = await online_chat(messages)
            provider = "online"
            model = CLOUD_MODEL
        except (httpx.HTTPError, RuntimeError, ValueError) as online_error:
            raise HTTPException(
                status_code=502,
                detail=f"Both local and permitted online providers failed: {online_error}",
            ) from online_error

    store_message(conversation_id, "assistant", reply, provider, model)
    return ChatResponse(
        conversation_id=conversation_id,
        reply=reply,
        provider=provider,
        model=model,
    )


@app.get("/api/conversations/{conversation_id}")
async def conversation(conversation_id: str) -> dict:
    if len(conversation_id) > 128:
        raise HTTPException(status_code=400, detail="conversation_id is too long")
    with connect_db() as db:
        rows = db.execute(
            "SELECT role, content, provider, model, created_at FROM messages "
            "WHERE conversation_id = ? ORDER BY id",
            (conversation_id,),
        ).fetchall()
    return {"conversation_id": conversation_id, "messages": [dict(row) for row in rows]}
