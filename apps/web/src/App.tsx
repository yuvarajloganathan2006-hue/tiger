import { FormEvent, useEffect, useState } from "react";
import {
  Activity, BrainCircuit, Check, ChevronDown, Cpu, FolderOpen,
  LockKeyhole, MessageCircle, Mic, Plus, Send, Settings2, ShieldCheck,
  Sparkles, Wifi, WifiOff, Workflow,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Memory = { id: string; content: string; category: string; created_at: string };
type AgentStage = { agent: string; result: string };
type AgentResult = { run_id: string; result: string; stages: AgentStage[]; provider: string; model: string };
type Conversation = { conversation_id: string; updated_at: string; message_count: number; last_user_message: string | null };
type ProviderInfo = {
  local?: { healthy: boolean; selected_model: string; available_models: string[]; error?: string | null };
};

const newConversationId = () => {
  const existing = window.localStorage.getItem("tiger.conversation_id");
  if (existing) return existing;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem("tiger.conversation_id", created);
  return created;
};

const apiFetch = (path: string, init: RequestInit = {}) => {
  const configuredBase = window.localStorage.getItem("tiger.api_base_url") || "";
  const base = configuredBase || (window.location.protocol === "file:" ? "http://127.0.0.1:8765" : "");
  const headers = new Headers(init.headers || {});
  const token = window.localStorage.getItem("tiger.api_token") || "";
  if (token) headers.set("X-Tiger-Token", token);
  return fetch(base + path, { ...init, headers });
};

export default function App() {
  const [conversationId, setConversationId] = useState(newConversationId);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello. I’m TIGER, your local-first companion. I’m ready to help you think, plan, learn and build. Your local model is the default; online fallback is never used unless you explicitly enable it." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ProviderInfo | null>(null);
  const [useSavedMemories, setUseSavedMemories] = useState(true);
  const [notice, setNotice] = useState("Checking your local AI engine…");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryCategory, setMemoryCategory] = useState("general");
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const [editingMemoryCategory, setEditingMemoryCategory] = useState("general");
  const [agentObjective, setAgentObjective] = useState("");
  const [agentRole, setAgentRole] = useState("planner");
  const [agentMode, setAgentMode] = useState("team");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [agentError, setAgentError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationQuery, setConversationQuery] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => window.localStorage.getItem("tiger.api_base_url") || "");
  const [apiToken, setApiToken] = useState(() => window.localStorage.getItem("tiger.api_token") || "");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await apiFetch("/api/providers");
        if (!response.ok) throw new Error("Local API returned " + response.status);
        const data = (await response.json()) as ProviderInfo;
        if (!active) return;
        setStatus(data);
        setNotice(data.local?.healthy ? "Local AI engine connected" : "Ollama is not available yet");
      } catch {
        if (!active) return;
        setStatus(null);
        setNotice("Start the TIGER Core API to connect");
      }
    };
    void refresh();
    void refreshMemories();
    void refreshConversations("");
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const refreshMemories = async () => {
    try {
      const response = await apiFetch("/api/memories");
      if (!response.ok) throw new Error("Could not load memories");
      const data = await response.json();
      setMemories(data.memories || []);
    } catch {
      setMemories([]);
    }
  };

  const refreshConversations = async (query = conversationQuery) => {
    try {
      const response = await apiFetch("/api/conversations?q=" + encodeURIComponent(query));
      if (!response.ok) throw new Error("Could not load conversations");
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch { setConversations([]); }
  };

  const loadConversation = async (id: string) => {
    try {
      const response = await apiFetch("/api/conversations/" + encodeURIComponent(id));
      if (!response.ok) throw new Error("Could not load conversation");
      const data = await response.json();
      setConversationId(id);
      window.localStorage.setItem("tiger.conversation_id", id);
      setMessages(data.messages.map((item: Message) => ({ role: item.role, content: item.content })));
    } catch (error) { setAgentError(error instanceof Error ? error.message : "Conversation load failed"); }
  };

  const exportData = async () => {
    setDataBusy(true);
    try {
      const response = await apiFetch("/api/data/export");
      if (!response.ok) throw new Error("Export failed");
      const data = await response.json();
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "tiger-data-export.json"; link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) { setAgentError(error instanceof Error ? error.message : "Export failed"); }
    finally { setDataBusy(false); }
  };

  const deleteAllData = async () => {
    if (!window.confirm("Permanently delete all TIGER conversations, memories and agent history from this device? This cannot be undone.")) return;
    setDataBusy(true);
    try {
      const response = await apiFetch("/api/data", { method: "DELETE" });
      if (!response.ok) throw new Error("Data deletion failed");
      setMessages([{ role: "assistant", content: "Local TIGER data has been deleted." }]);
      setMemories([]); setConversations([]); setAgentResult(null);
    } catch (error) { setAgentError(error instanceof Error ? error.message : "Data deletion failed"); }
    finally { setDataBusy(false); }
  };
  const saveMemory = async (event: FormEvent) => {
    event.preventDefault();
    const content = memoryDraft.trim();
    if (!content || memoryBusy) return;
    setMemoryBusy(true);
    try {
      const response = await apiFetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category: memoryCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not save memory");
      setMemoryDraft("");
      await refreshMemories();
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Memory save failed");
    } finally {
      setMemoryBusy(false);
    }
  };

  const beginEditMemory = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditingMemoryContent(memory.content);
    setEditingMemoryCategory(memory.category);
  };

  const saveMemoryEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingMemoryId || !editingMemoryContent.trim()) return;
    try {
      const response = await apiFetch("/api/memories/" + encodeURIComponent(editingMemoryId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingMemoryContent, category: editingMemoryCategory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not update memory");
      setEditingMemoryId(null);
      await refreshMemories();
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Memory update failed");
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const response = await apiFetch("/api/memories/" + encodeURIComponent(id), { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete memory");
      setMemories(current => current.filter(memory => memory.id !== id));
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Memory deletion failed");
    }
  };

  const runAgent = async (event: FormEvent) => {
    event.preventDefault();
    const objective = agentObjective.trim();
    if (!objective || agentBusy) return;
    setAgentBusy(true);
    setAgentError("");
    setAgentResult(null);
    try {
      const response = await apiFetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          agent: agentRole,
          mode: agentMode,
          use_saved_memories: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Agent task failed");
      setAgentResult(data as AgentResult);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Agent task failed");
    } finally {
      setAgentBusy(false);
    }
  };

  const startNewChat = () => {
    const id = window.crypto.randomUUID();
    window.localStorage.setItem("tiger.conversation_id", id);
    setConversationId(id);
    setMessages([{ role: "assistant", content: "New conversation started. What would you like to work on?" }]);
    setNotice(status?.local?.healthy ? "Local AI engine connected" : "Start the TIGER Core API to connect");
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages(current => [...current, { role: "user", content: text }]);
    setBusy(true);
    setNotice("Thinking with your local model…");
    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          use_saved_memories: useSavedMemories,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "The local AI request failed");
      setConversationId(result.conversation_id);
      window.localStorage.setItem("tiger.conversation_id", result.conversation_id);
      setMessages(current => [...current, { role: "assistant", content: result.reply }]);
      setNotice("Answered by " + result.provider + " · " + result.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setMessages(current => [...current, {
        role: "assistant",
        content: "I couldn’t reach the local model. " + message + ". TIGER is fully-local, so your message was not sent to an online model.",
      }]);
      setNotice("Local model needs attention");
    } finally {
      setBusy(false);
    }
  };

  const localReady = Boolean(status?.local?.healthy);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><BrainCircuit size={22} /></div><div><strong>TIGER</strong><span>COMPANION OS</span></div></div>
        <button className="new-chat" onClick={startNewChat}><Plus size={17} /> New conversation</button>
        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item selected"><MessageCircle size={17} /> Companion <span className="nav-dot" /></div>
        <div className="nav-item muted"><Workflow size={17} /> Agent team <small>PLANNED</small></div>
        <div className="nav-item muted"><FolderOpen size={17} /> Knowledge <small>PLANNED</small></div>
        <div className="nav-item muted"><Activity size={17} /> Tasks & routines <small>PLANNED</small></div>
        <div className="nav-spacer" />
        <div className="privacy-card"><ShieldCheck size={18} /><div><b>Private by default</b><span>No online AI provider is enabled.</span></div></div>
        <div className="profile"><div className="avatar">Y</div><div><b>Your workspace</b><span>Personal instance</span></div><Settings2 size={17} /></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> <b>Companion</b></div>
          <div className="top-actions">
            <div className={localReady ? "status-pill online" : "status-pill offline"}>
              {localReady ? <Wifi size={14} /> : <WifiOff size={14} />}
              {localReady ? "LOCAL ENGINE ONLINE" : "LOCAL ENGINE OFFLINE"}
            </div>
            <button className="icon-button" title="Settings are planned" disabled><Settings2 size={18} /></button>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> YOUR PERSONAL AI SPACE</div>
              <h1>A little more <em>intelligence,</em><br />a lot more possibility.</h1>
              <p className="subtitle">One companion for your ideas, work and everyday momentum.</p>
            </div>
            <div className="orb-wrap"><div className="orb"><BrainCircuit size={37} /></div><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /></div>
          </div>

          <div className="status-line"><span className={localReady ? "pulse good" : "pulse"} />{notice}</div>

          <div className="chat-panel">
            <div className="chat-heading"><div><span className="panel-icon"><Sparkles size={16} /></span><b>Talk to TIGER</b><small>LOCAL CONVERSATION</small></div><button className="model-select" disabled><Cpu size={14} /> {status?.local?.selected_model || "Local model"} <ChevronDown size={14} /></button></div>
            <div className="messages">
              {messages.map((message, index) => (
                <div className={"message-row " + message.role} key={index}>
                  {message.role === "assistant" && <div className="message-avatar"><BrainCircuit size={16} /></div>}
                  <div className="message-bubble"><div className="message-author">{message.role === "assistant" ? "TIGER" : "YOU"}</div><div className="message-text">{message.content}</div></div>
                  {message.role === "user" && <div className="user-avatar">Y</div>}
                </div>
              ))}
              {busy && <div className="thinking"><span /><span /><span /> TIGER is thinking</div>}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Share an idea, ask a question, or describe what you want to do…" rows={2} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
              <div className="composer-bottom"><div className="composer-hints"><LockKeyhole size={13} /> Fully local · No cloud routing</div><button className="send-button" type="submit" disabled={busy || !input.trim()}><Send size={16} /> Send</button></div>
              <label className="memory-optin"><input type="checkbox" checked={useSavedMemories} onChange={event => setUseSavedMemories(event.target.checked)} /> Use relevant saved memories in this chat</label>
            </form>
          </div>

          <div className="bottom-note"><Check size={14} /> AI inference runs locally. No online AI provider is used.</div>
          <div className="capability-grid">
            <div className="capability"><BrainCircuit size={18} /><b>Saved memory</b><span>{memories.length} user-approved entries</span></div>
            <div className="capability"><Workflow size={18} /><b>Agent team</b><span>Planner · specialist · reviewer</span></div>
            <div className="capability"><Mic size={18} /><b>Natural voice</b><span>Planned for a later milestone</span></div>
          </div>

          <section className="feature-panel">
            <div className="feature-title"><div><span className="panel-icon"><Wifi size={16} /></span><b>Device connection</b></div><span className="feature-tag">LOCAL NETWORK ONLY</span></div>
            <p className="feature-description">Desktop uses its local core automatically. On Android, enter your Windows PC address and the pairing token shown by the Windows launcher. Keep both devices on a trusted Wi-Fi network.</p>
            <div className="device-connect-form">
              <label>Windows TIGER Core URL<input value={apiBaseUrl} onChange={event => setApiBaseUrl(event.target.value)} placeholder="http://192.168.1.10:8765" /></label>
              <label>Phone pairing token<input type="password" value={apiToken} onChange={event => setApiToken(event.target.value)} placeholder="Paste the token from your Windows PC" autoComplete="off" /></label>
              <div className="data-actions"><button type="button" className="send-button" onClick={() => { window.localStorage.setItem("tiger.api_base_url", apiBaseUrl.trim()); window.localStorage.setItem("tiger.api_token", apiToken.trim()); window.location.reload(); }}>Save connection</button><span className="connection-hint">Enter the URL without a trailing slash</span></div>
            </div>
          </section>

          <section className="feature-panel">
            <div className="feature-title"><div><span className="panel-icon"><MessageCircle size={16} /></span><b>Conversation history</b></div><span className="feature-tag">ON THIS DEVICE</span></div>
            <p className="feature-description">Search and reopen conversations stored in your local TIGER database.</p>
            <div className="history-search"><input value={conversationQuery} onChange={event => { setConversationQuery(event.target.value); void refreshConversations(event.target.value); }} placeholder="Search conversation text…" /></div>
            <div className="memory-list">{conversations.length === 0 ? <div className="empty-memory">No saved conversations found.</div> : conversations.map(item => <button className="history-item" type="button" key={item.conversation_id} onClick={() => void loadConversation(item.conversation_id)}><span>{item.message_count} messages</span><b>{item.last_user_message || "Conversation"}</b><small>{item.conversation_id === conversationId ? "CURRENT" : item.updated_at}</small></button>)}</div>
            <div className="data-actions"><button type="button" className="send-button" disabled={dataBusy} onClick={() => void exportData()}>Export my data</button><button type="button" className="danger-button" disabled={dataBusy} onClick={() => void deleteAllData()}>Delete all local data</button></div>
          </section>
          <section className="feature-panel">
            <div className="feature-title"><div><span className="panel-icon"><Workflow size={16} /></span><b>Agent studio</b></div><span className="feature-tag">MODEL-POWERED WORKFLOW</span></div>
            <p className="feature-description">Delegate a task to one specialist or run a bounded three-stage team: planner → specialist → reviewer. Agents currently reason and draft; they do not operate your computer or claim to execute external actions.</p>
            <form onSubmit={runAgent} className="agent-form">
              <textarea value={agentObjective} onChange={event => setAgentObjective(event.target.value)} placeholder="Describe the outcome you want the agent team to work on…" rows={3} />
              <div className="agent-controls">
                <label>Specialist<select value={agentRole} onChange={event => setAgentRole(event.target.value)}><option value="planner">Planner</option><option value="researcher">Researcher</option><option value="developer">Developer</option><option value="reviewer">Reviewer</option><option value="organizer">Organizer</option><option value="general">General assistant</option></select></label>
                <label>Workflow<select value={agentMode} onChange={event => setAgentMode(event.target.value)}><option value="team">Full team (3 stages)</option><option value="single">One specialist</option></select></label>
                <button className="send-button" type="submit" disabled={agentBusy || !agentObjective.trim()}>{agentBusy ? "Working…" : "Run agent"} <Send size={14} /></button>
              </div>
            </form>
            {agentError && <div className="error-note">{agentError}</div>}
            {agentResult && <div className="agent-output"><div className="result-meta">COMPLETED · {agentResult.provider} · {agentResult.model}</div>{agentResult.stages.map((stage, index) => <div className="agent-stage" key={index}><b>{index + 1}. {stage.agent}</b><p>{stage.result}</p></div>)}</div>}
          </section>

          <section className="feature-panel memory-panel">
            <div className="feature-title"><div><span className="panel-icon"><BrainCircuit size={16} /></span><b>Your saved memory</b></div><span className="feature-tag">YOU CONTROL THIS</span></div>
            <p className="feature-description">Only save information you deliberately add here. TIGER may retrieve relevant saved entries for chats and agent tasks. Review or delete anything at any time.</p>
            <form className="memory-form" onSubmit={saveMemory}>
              <textarea value={memoryDraft} onChange={event => setMemoryDraft(event.target.value)} placeholder="Example: I prefer beginner-friendly Python explanations…" rows={2} />
              <div className="agent-controls"><label>Category<select value={memoryCategory} onChange={event => setMemoryCategory(event.target.value)}><option value="general">General</option><option value="learning">Learning</option><option value="work">Work</option><option value="preferences">Preferences</option><option value="projects">Projects</option></select></label><button className="send-button" type="submit" disabled={memoryBusy || !memoryDraft.trim()}>{memoryBusy ? "Saving…" : "Save memory"} <Plus size={14} /></button></div>
            </form>
            <div className="memory-list">
              {memories.length === 0 ? <div className="empty-memory">No saved memories yet. Add one above when you want TIGER to remember it.</div> : memories.map(memory => <div className="memory-item" key={memory.id}>
                {editingMemoryId === memory.id ? <form className="memory-edit-form" onSubmit={saveMemoryEdit}>
                  <textarea value={editingMemoryContent} onChange={event => setEditingMemoryContent(event.target.value)} rows={2} />
                  <div className="agent-controls"><label>Category<select value={editingMemoryCategory} onChange={event => setEditingMemoryCategory(event.target.value)}><option value="general">General</option><option value="learning">Learning</option><option value="work">Work</option><option value="preferences">Preferences</option><option value="projects">Projects</option></select></label><button className="send-button" type="submit">Save changes</button><button className="cancel-edit" type="button" onClick={() => setEditingMemoryId(null)}>Cancel</button></div>
                </form> : <><div><span>{memory.category}</span><p>{memory.content}</p></div><div className="memory-actions"><button type="button" onClick={() => beginEditMemory(memory)}>Edit</button><button type="button" onClick={() => deleteMemory(memory.id)} title="Delete this saved memory">Delete</button></div></>}
              </div>)}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
