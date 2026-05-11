import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import api from "@/lib/api";

const SESSION_KEY = "fs_chat_session_v1";

const getSessionId = () => {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "sess-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
};

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasShownProactive, setHasShownProactive] = useState(false);
  const scrollRef = useRef(null);
  const sessionId = getSessionId();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: "¡Hola! Soy Nuez 🌰, tu curador de frutos selectos. ¿Buscás algo en particular? Puedo recomendarte combos, ayudarte con un regalo o resolver cualquier duda sobre envíos.",
        },
      ]);
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!hasShownProactive && !open) {
      const t = setTimeout(() => setHasShownProactive(true), 8000);
      return () => clearTimeout(t);
    }
  }, [hasShownProactive, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/chat", { session_id: sessionId, message: text });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Disculpá, hubo un problema. Probá de nuevo en un momento." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Proactive bubble */}
      {!open && hasShownProactive && (
        <div
          className="fixed bottom-24 right-6 z-40 max-w-[260px] rounded-2xl shadow-xl border p-4 slide-up"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          data-testid="chat-proactive-bubble"
        >
          <button
            onClick={() => setHasShownProactive(false)}
            className="absolute top-2 right-2"
            style={{ color: "var(--text-muted)" }}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: "var(--primary)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Nuez · Curador</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
            ¿Te ayudo a elegir? Envío gratis en tu primera compra superando $400.000 🌰
          </p>
          <button
            onClick={() => {
              setOpen(true);
              setHasShownProactive(false);
            }}
            className="mt-3 text-xs font-semibold hover:underline"
            style={{ color: "var(--primary)" }}
            data-testid="open-chat-from-bubble"
          >
            Chatear ahora →
          </button>
        </div>
      )}

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:-translate-y-1"
          style={{ backgroundColor: "var(--primary)", color: "#fff" }}
          aria-label="Abrir chat"
          data-testid="open-chat-btn"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] h-[560px] max-h-[80vh] rounded-2xl shadow-2xl border flex flex-col slide-up overflow-hidden"
          style={{ backgroundColor: "var(--bg-default)", borderColor: "var(--border)" }}
          data-testid="chat-panel"
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--text-primary)", color: "var(--text-inverse)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div className="font-medium text-sm">Nuez</div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>Curador · en línea</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ color: "color-mix(in srgb, var(--text-inverse) 70%, transparent)" }}
              aria-label="Cerrar chat"
              data-testid="close-chat-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-msg-${m.role}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm border"}`}
                  style={
                    m.role === "user"
                      ? { backgroundColor: "var(--primary)", color: "#fff" }
                      : { backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start" data-testid="chat-typing">
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Escribí tu consulta..."
                className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none border"
                style={{ backgroundColor: "var(--bg-default)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                data-testid="chat-input"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
                data-testid="chat-send-btn"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>
              Asesoramiento experto en frutos secos
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
