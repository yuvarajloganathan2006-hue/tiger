import { FormEvent, useEffect, useState } from "react";
import {
  Activity, BrainCircuit, Check, ChevronDown, Cpu, FolderOpen,
  LockKeyhole, MessageCircle, Mic, Plus, Send, Settings2, ShieldCheck,
  Sparkles, Wifi, WifiOff, Workflow,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
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
  const [notice, setNotice] = useState("Checking your local AI engine…");

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          allow_cloud_fallback: false,
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
              <div className="composer-bottom"><div className="composer-hints"><LockKeyhole size={13} /> Local-first <span>·</span> <Mic size={13} /> Voice coming later</div><button className="send-button" type="submit" disabled={busy || !input.trim()}><Send size={16} /> Send</button></div>
            </form>
          </div>

          <div className="bottom-note"><Check size={14} /> Your messages stay on this device when using the local model.</div>
          <div className="capability-grid">
            <div className="capability"><BrainCircuit size={18} /><b>Persistent memory</b><span>Coming in a future milestone</span></div>
            <div className="capability"><Workflow size={18} /><b>Multi-agent team</b><span>Coming in a future milestone</span></div>
            <div className="capability"><Mic size={18} /><b>Natural voice</b><span>Coming in a future milestone</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
