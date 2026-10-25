import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Send, Trash2, Bot, User, AlertCircle, RefreshCw, Plus, MessageSquare, ChevronLeft, Loader2 } from "lucide-react";
import { Section } from "../components/ui.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  listConversations,
  createConversation,
  loadMessages,
  addMessage,
  deleteConversation,
} from "../data/chatStore.js";

const SUGGESTIONS = [
  "How do I study for exams effectively?",
  "Explain the Pomodoro technique",
  "Tips for staying focused",
  "How to take better notes?",
];

function buildHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({
      role: m.role === "user" ? "user" : "model",
      text: m.text,
    }));
}

function friendlyError(message) {
  if (!message) return "Something went wrong. Please try again.";
  if (/missing_key|not configured/i.test(message))
    return "Real AI isn't configured yet. Add the Gemini API key in your project's Secrets tab to enable live responses.";
  if (/rate.?limit/i.test(message))
    return "The free AI tier is rate-limited. Wait about a minute and try again.";
  if (/unavailable/i.test(message))
    return "The AI service is temporarily unavailable. Please try again in a moment.";
  if (/rejected the request/i.test(message))
    return "The AI couldn't process that message. Try rephrasing it.";
  if (/empty response/i.test(message))
    return "The AI returned an empty response. Try rephrasing your question.";
  if (/network|reach the AI|connection/i.test(message))
    return "Couldn't reach the AI service. Check your connection and try again.";
  if (/couldn't load|couldn't save|couldn't reach the database/i.test(message))
    return "Couldn't reach your saved conversations. Check your connection and try again.";
  return message;
}

export default function Assistant() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showList, setShowList] = useState(true);
  const endRef = useRef(null);

  // Load conversation list on mount.
  const refreshList = useCallback(async () => {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      setError("Couldn't load your conversations. Check your connection.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Open a conversation: load its messages from the database.
  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setShowList(false);
    setLoadingMsgs(true);
    setError(null);
    try {
      const msgs = await loadMessages(id);
      setMessages(msgs);
    } catch {
      setError("Couldn't load this conversation. Check your connection.");
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setShowList(false);
  }, []);

  // Send a message. Creates a conversation on first message, then persists
  // both the user message and the Gemini reply.
  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setError(null);

    // Optimistic: append the user message locally.
    const tempUserMsg = { id: `temp-${Date.now()}`, role: "user", text: q, at: Date.now() };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setTyping(true);

    let convId = activeId;

    try {
      // Create a conversation lazily on the first message.
      if (!convId) {
        const title = q.length > 40 ? q.slice(0, 40) + "…" : q;
        const conv = await createConversation(title);
        convId = conv.id;
        setActiveId(conv.id);
        setConversations((prev) => [{ ...conv }, ...prev]);
      }

      // Persist the user message (replace optimistic temp id).
      const savedUser = await addMessage(convId, "user", q);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempUserMsg.id ? savedUser : m))
      );

      // Call the Gemini edge function with the conversation history.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ message: q, history: buildHistory(messages) }),
      });

      let body = null;
      try {
        body = await res.json();
      } catch {
        /* non-JSON handled below */
      }

      if (!res.ok || !body || typeof body.reply !== "string") {
        const msg = body?.error || `Request failed (${res.status}).`;
        throw new Error(msg);
      }

      // Persist the assistant reply.
      const savedAssistant = await addMessage(convId, "assistant", body.reply);
      setMessages((prev) => [...prev, savedAssistant]);

      // Refresh the conversation list so the active one sorts to the top.
      refreshList();
    } catch (err) {
      // Roll back optimistic user message if nothing was persisted.
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setError(friendlyError(err.message));
    } finally {
      setTyping(false);
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.text);
  };

  const removeConversation = async (id) => {
    const prevList = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    try {
      await deleteConversation(id);
    } catch {
      setConversations(prevList);
      setError("Couldn't delete that conversation. Try again.");
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, error]);

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-5xl gap-4">
      {/* Conversation list */}
      <aside
        className={`${
          showList ? "block" : "hidden"
        } w-64 shrink-0 flex-col lg:flex`}
      >
        <div className="card flex h-full flex-col p-3">
          <button onClick={startNewConversation} className="btn-primary w-full !py-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-slate-500">
                No conversations yet. Start a new chat to ask NovaMind.
              </p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all ${
                    activeId === c.id
                      ? "bg-gradient-to-r from-brand-600/30 to-accent-600/20 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => openConversation(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    onClick={() => removeConversation(c.id)}
                    className="hidden shrink-0 text-slate-500 hover:text-rose-300 group-hover:block"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col">
        <Section
          title="AI Assistant"
          subtitle="Real AI responses via Google Gemini · powered by your server-side key"
          className="flex flex-1 flex-col overflow-hidden"
          action={
            <button onClick={() => setShowList((s) => !s)} className="btn-ghost !px-2.5 !py-1.5 text-xs lg:hidden">
              <ChevronLeft className="h-3.5 w-3.5" /> Chats
            </button>
          }
        >
          <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.length === 0 && !error && !loadingMsgs && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">Hi, I'm NovaMind</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Your AI study assistant, powered by Google Gemini. Ask me about studying, focus, or revision.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-brand-500/40 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMsgs && (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    m.role === "user"
                      ? "bg-white/10 text-slate-300"
                      : "bg-gradient-to-br from-brand-500 to-accent-600 text-white"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-brand-600 to-accent-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
                  </div>
                </div>
              </div>
            )}

            {error && !typing && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                <div className="flex items-start gap-2 text-sm text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={retry}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="mt-4 flex items-end gap-2 border-t border-white/10 pt-4"
          >
            <input
              className="input"
              placeholder="Ask anything about studying..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-3" disabled={!input.trim() || typing}>
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Real AI via Google Gemini. Conversations are saved to your account and never shown to other users.
          </p>
        </Section>
      </div>
    </div>
  );
}
