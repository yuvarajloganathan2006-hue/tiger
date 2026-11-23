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
type ProviderInfo = {
  local?: { healthy: boolean; selected_model: string; available_models: string[]; error?: string | null };
  online_fallback?: { enabled: boolean; configured: boolean; model?: string | null };
};

const newConversationId = () => {
  const existing = window.localStorage.getItem("tiger.conversation_id");
  if (existing) return existing;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem("tiger.conversation_id", created);
  return created;
};

export default function App() {
  const [conversationId, setConversationId] = useState(newConversationId);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello. I’m TIGER, your local-first companion. I’m ready to help you think, plan, learn and build. Your local model is the default; online fallback is never used unless you explicitly enable it." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ProviderInfo | null>(null);
  const [allowCloudFallback, setAllowCloudFallback] = useState(false);
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
  const [agentCloud, setAgentCloud] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [agentError, setAgentError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/providers");
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
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const refreshMemories = async () => {
    try {
      const response = await fetch("/api/memories");
      if (!response.ok) throw new Error("Could not load memories");
      const data = await response.json();
      setMemories(data.memories || []);
    } catch {
      setMemories([]);
    }
  };

  const saveMemory = async (event: FormEvent) => {
    event.preventDefault();
    const content = memoryDraft.trim();
    if (!content || memoryBusy) return;
    setMemoryBusy(true);
    try {
      const response = await fetch("/api/memories", {
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
      const response = await fetch("/api/memories/" + encodeURIComponent(editingMemoryId), {
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
      const response = await fetch("/api/memories/" + encodeURIComponent(id), { method: "DELETE" });
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
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          agent: agentRole,
          mode: agentMode,
          allow_cloud_fallback: agentCloud,
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
      setAgentCloud(false);
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
    const useCloudFallback = allowCloudFallback;
    setAllowCloudFallback(false);
    setInput("");
    setMessages(current => [...current, { role: "user", content: text }]);
    setBusy(true);
    setNotice("Thinking with your local model…");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          allow_cloud_fallback: useCloudFallback,
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
        content: "I couldn’t reach the local model. " + message + ". No cloud fallback was requested, so your message was not sent to an online model.",
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
        <div className="privacy-card"><ShieldCheck size={18} /><div><b>Private by default</b><span>Local model first. Cloud use requires opt-in.</span></div></div>
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
              {status?.online_fallback?.enabled && status.online_fallback.configured && (<label className="cloud-optin"><input type="checkbox" checked={allowCloudFallback} onChange={event => setAllowCloudFallback(event.target.checked)} /> Allow online fallback for this message. Recent conversation context may be sent to {status.online_fallback.model}.</label>)}
              <div className="composer-bottom"><div className="composer-hints"><LockKeyhole size={13} /> Local-first <span>·</span> <Mic size={13} /> Voice coming later</div><button className="send-button" type="submit" disabled={busy || !input.trim()}><Send size={16} /> Send</button></div>
              <label className="memory-optin"><input type="checkbox" checked={useSavedMemories} onChange={event => setUseSavedMemories(event.target.checked)} /> Use relevant saved memories in this chat</label>
            </form>
          </div>

          <div className="bottom-note"><Check size={14} /> Your messages stay on this device when using the local model.</div>
          <div className="capability-grid">
            <div className="capability"><BrainCircuit size={18} /><b>Saved memory</b><span>{memories.length} user-approved entries</span></div>
            <div className="capability"><Workflow size={18} /><b>Agent team</b><span>Planner · specialist · reviewer</span></div>
            <div className="capability"><Mic size={18} /><b>Natural voice</b><span>Planned for a later milestone</span></div>
          </div>

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
              {status?.online_fallback?.enabled && status.online_fallback.configured && <label className="cloud-optin"><input type="checkbox" checked={agentCloud} onChange={event => setAgentCloud(event.target.checked)} /> Permit online fallback for this task. The objective, saved memories and intermediate outputs may be sent to {status.online_fallback.model}.</label>}
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
