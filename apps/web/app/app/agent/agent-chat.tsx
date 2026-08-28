"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Bot, CircleAlert, Clock3, Database, LoaderCircle, LockKeyhole, Send, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  retrievedAt?: string;
};

type ContextState = {
  portfolio: { status: "verified-live" | "unavailable"; source: string | null; retrievedAt: string | null };
  opportunities: { status: "sample"; source: string; retrievedAt: string };
  policy: { status: "sample"; source: string; retrievedAt: string };
};

type AgentResponse = {
  message: string;
  suggestedActions: string[];
  assistant: { source: string; retrievedAt: string };
  context: ContextState;
};

const starterPrompts = [
  "What is my verified testnet balance?",
  "Compare the sample DeFi and RWA opportunities",
  "Explain the current risk limits",
];

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Connect and authenticate your wallet from Overview, then ask about your verified testnet balance, the sample opportunity set, or NAVI's draft risk limits.",
  source: "NAVI_PRODUCT_GUIDANCE",
};

async function responseJson(response: Response) {
  const body = await response.json() as AgentResponse & { message?: string; code?: string };
  if (!response.ok) throw Object.assign(new Error(body.message ?? "Ask NAVI could not answer."), { code: body.code });
  return body;
}

function sourceTime(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [suggestions, setSuggestions] = useState(starterPrompts);
  const [context, setContext] = useState<ContextState>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; auth: boolean }>();

  const history = useMemo(() => messages
    .filter((item) => item.id !== "welcome")
    .slice(-8)
    .map((item) => ({ role: item.role, content: item.content })), [messages]);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError(undefined);
    setBusy(true);
    try {
      const response = await responseJson(await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      }));
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message,
        source: response.assistant.source,
        retrievedAt: response.assistant.retrievedAt,
      }]);
      setSuggestions(response.suggestedActions);
      setContext(response.context);
    } catch (requestError) {
      const typed = requestError as Error & { code?: string };
      setError({ message: typed.message, auth: typed.code === "AUTH_REQUIRED" });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="agent-workspace">
      <section className="chat-panel" aria-label="Ask NAVI conversation">
        <div className="chat-log" aria-live="polite">
          {messages.map((item) => (
            <div className={`chat-message ${item.role}`} key={item.id}>
              <span className="message-avatar" aria-hidden="true">{item.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</span>
              <div>
                <strong>{item.role === "assistant" ? "NAVI" : "You"}</strong>
                <p>{item.content}</p>
                {item.source ? <small>Source: {item.source}{item.retrievedAt ? ` · ${sourceTime(item.retrievedAt)}` : ""}</small> : null}
              </div>
            </div>
          ))}
          {busy ? <div className="chat-message assistant"><span className="message-avatar" aria-hidden="true"><Bot size={17} /></span><div><strong>NAVI</strong><p className="agent-thinking"><LoaderCircle className="spinner" aria-hidden="true" size={15} /> Checking available context...</p></div></div> : null}
        </div>

        {error ? <div className="agent-error" role="alert"><CircleAlert aria-hidden="true" size={17} /><span>{error.message} {error.auth ? <Link href="/app/overview">Authenticate on Overview</Link> : null}</span></div> : null}

        <div className="prompt-suggestions" aria-label="Suggested questions">
          {suggestions.map((suggestion) => <button type="button" className="prompt-chip" disabled={busy} onClick={() => void ask(suggestion)} key={suggestion}>{suggestion}</button>)}
        </div>

        <form className="chat-composer" onSubmit={submit}>
          <label htmlFor="agent-message">Message NAVI</label>
          <div>
            <textarea id="agent-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} maxLength={2_000} rows={3} placeholder="Ask about your balance, opportunities, or risk limits" disabled={busy} />
            <button type="submit" aria-label="Send message" title="Send message" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spinner" aria-hidden="true" size={18} /> : <Send aria-hidden="true" size={18} />}</button>
          </div>
          <small><LockKeyhole aria-hidden="true" size={13} /> NAVI cannot sign or submit transactions.</small>
        </form>
      </section>

      <aside className="agent-context" aria-label="NAVI data context">
        <div className="context-heading"><Database aria-hidden="true" size={18} /><div><p className="eyebrow">Current context</p><h2>Evidence available</h2></div></div>
        <div className="context-item">
          <span className={context?.portfolio.status === "verified-live" ? "context-status verified" : "context-status"}><ShieldCheck aria-hidden="true" size={14} /> Portfolio</span>
          <strong>{context?.portfolio.status === "verified-live" ? "Verified live" : "Authentication required"}</strong>
          <small>{context?.portfolio.source ?? "No wallet data shared"}</small>
          <small><Clock3 aria-hidden="true" size={12} /> {sourceTime(context?.portfolio.retrievedAt)}</small>
        </div>
        <div className="context-item">
          <span className="context-status sample"><CircleAlert aria-hidden="true" size={14} /> Opportunities</span>
          <strong>Sample only</strong>
          <small>{context?.opportunities.source ?? "NAVI_SAMPLE_OPPORTUNITIES"}</small>
          <small><Clock3 aria-hidden="true" size={12} /> {sourceTime(context?.opportunities.retrievedAt)}</small>
        </div>
        <div className="context-item">
          <span className="context-status sample"><CircleAlert aria-hidden="true" size={14} /> Policy</span>
          <strong>Draft, not enforced</strong>
          <small>{context?.policy.source ?? "NAVI_SAMPLE_POLICY"}</small>
          <small><Clock3 aria-hidden="true" size={12} /> {sourceTime(context?.policy.retrievedAt)}</small>
        </div>
        <div className="agent-lock-note"><LockKeyhole aria-hidden="true" size={16} /><span><strong>No execution tools</strong><small>Agent responses cannot prepare or broadcast transactions.</small></span></div>
      </aside>
    </div>
  );
}
