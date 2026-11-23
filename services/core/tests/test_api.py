from fastapi.testclient import TestClient

from app import main


def test_health_and_local_chat(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")

    async def fake_ollama_chat(messages):
        assert messages[-1]["role"] == "user"
        return "Hello from the local test model."

    monkeypatch.setattr(main, "ollama_chat", fake_ollama_chat)

    with TestClient(main.app) as client:
        assert client.get("/health").json()["status"] == "ok"
        response = client.post("/api/chat", json={"message": "Hello TIGER"})
        assert response.status_code == 200
        payload = response.json()
        assert payload["provider"] == "ollama"
        assert payload["reply"] == "Hello from the local test model."

        history = client.get(
            "/api/conversations/" + payload["conversation_id"]
        ).json()
        assert len(history["messages"]) == 2
        assert history["messages"][0]["content"] == "Hello TIGER"


def test_cloud_fallback_requires_request_opt_in(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    monkeypatch.setattr(main, "CLOUD_ENABLED", True)

    async def fail_local(messages):
        raise RuntimeError("local model offline")

    async def should_not_run(messages):
        raise AssertionError("cloud fallback must not run without request consent")

    monkeypatch.setattr(main, "ollama_chat", fail_local)
    monkeypatch.setattr(main, "online_chat", should_not_run)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            json={"message": "private message", "allow_cloud_fallback": False},
        )
        assert response.status_code == 503
        assert "No data was sent online" in response.json()["detail"]
