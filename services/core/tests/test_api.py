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


def test_user_memory_crud_and_retrieval_in_chat(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    captured = {}

    async def fake_ollama_chat(messages):
        captured["messages"] = messages
        return "I can use your saved preference."

    monkeypatch.setattr(main, "ollama_chat", fake_ollama_chat)

    with TestClient(main.app) as client:
        created = client.post(
            "/api/memories",
            json={"content": "I prefer Python examples with simple explanations", "category": "learning"},
        )
        assert created.status_code == 200
        memory = created.json()["memory"]
        assert memory["source"] == "user"

        response = client.post(
            "/api/chat",
            json={"message": "Please explain Python loops"},
        )
        assert response.status_code == 200
        assert response.json()["memories_used"] == 1
        assert captured["messages"][0]["role"] == "system"
        assert "simple explanations" in captured["messages"][0]["content"]

        updated = client.put(
            f"/api/memories/{memory['id']}",
            json={"content": "I prefer short Python examples", "category": "learning"},
        )
        assert updated.status_code == 200
        assert "short Python examples" in updated.json()["memory"]["content"]

        deleted = client.delete(f"/api/memories/{memory['id']}")
        assert deleted.status_code == 200
        assert client.get("/api/memories").json()["memories"] == []


def test_memory_can_be_excluded_from_chat(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    captured = {}

    async def fake_ollama_chat(messages):
        captured["messages"] = messages
        return "Okay."

    monkeypatch.setattr(main, "ollama_chat", fake_ollama_chat)

    with TestClient(main.app) as client:
        client.post("/api/memories", json={"content": "User studies Python"})
        response = client.post(
            "/api/chat",
            json={"message": "What am I studying?", "use_saved_memories": False},
        )
        assert response.status_code == 200
        assert response.json()["memories_used"] == 0
        assert all(message["role"] != "system" for message in captured["messages"])


def test_agent_team_runs_planner_specialist_reviewer(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    calls = []

    async def fake_ollama_chat(messages):
        system = messages[0]["content"]
        calls.append(system)
        return f"Stage {len(calls)} output"

    monkeypatch.setattr(main, "ollama_chat", fake_ollama_chat)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/agents/run",
            json={"objective": "Plan a beginner Python study project", "agent": "developer", "mode": "team"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "completed"
        assert [stage["agent"] for stage in payload["stages"]] == [
            "planner", "developer", "reviewer"
        ]
        assert len(calls) == 3
        history = client.get("/api/agents/runs").json()["runs"]
        assert history[0]["status"] == "completed"


def test_agent_run_is_single_call_by_default(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    calls = []

    async def fake_ollama_chat(messages):
        calls.append(messages)
        return "Organized tasks"

    monkeypatch.setattr(main, "ollama_chat", fake_ollama_chat)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/agents/run",
            json={"objective": "Organize my study tasks", "agent": "organizer"},
        )
        assert response.status_code == 200
        assert response.json()["stages"][0]["agent"] == "organizer"
        assert len(calls) == 1
