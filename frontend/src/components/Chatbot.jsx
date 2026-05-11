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
          text: "¡Hola! Soy Nuez 🌰, tu asesor de frutos secos. ¿Buscás algo en particular? Puedo recomendarte combos, ayudarte con un regalo o resolver cualquier duda sobre envíos.",
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
          className="fixed bottom-24 right-6 z-40 max-w-[260px] bg-white rounded-2xl shadow-xl border border-[#2C1E16]/10 p-4 slide-up"
          data-testid="chat-proactive-bubble"
        >
          <button
            onClick={() => setHasShownProactive(false)}
            className="absolute top-2 right-2 text-[#968B83] hover:text-[#2C1E16]"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-[#C35214]" />
            <span className="text-xs font-semibold text-[#C35214]">Nuez · IA</span>
          </div>
          <p className="text-sm text-[#2C1E16] leading-relaxed">
            ¿Te ayudo a elegir? Tenemos combos premium y envío gratis desde $25.000 🌰
          </p>
          <button
            onClick={() => {
              setOpen(true);
              setHasShownProactive(false);
            }}
            className="mt-3 text-xs font-semibold text-[#C35214] hover:underline"
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
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#C35214] hover:bg-[#A64B29] text-white shadow-2xl flex items-center justify-center transition-all hover:-translate-y-1"
          aria-label="Abrir chat"
          data-testid="open-chat-btn"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] h-[560px] max-h-[80vh] bg-[#F9F6F0] rounded-2xl shadow-2xl border border-[#2C1E16]/10 flex flex-col slide-up overflow-hidden"
          data-testid="chat-panel"
        >
          {/* Header */}
          <div className="bg-[#2C1E16] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C35214] flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="font-medium text-sm">Nuez</div>
                <div className="text-[10px] text-[#D4AF37] uppercase tracking-widest">Asesor IA · en línea</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white"
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
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#C35214] text-white rounded-br-sm"
                      : "bg-white border border-[#2C1E16]/10 text-[#2C1E16] rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start" data-testid="chat-typing">
                <div className="bg-white border border-[#2C1E16]/10 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#2C1E16]/10 p-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Escribí tu consulta..."
                className="flex-1 bg-[#F9F6F0] rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#C35214]/30 border border-[#2C1E16]/10"
                data-testid="chat-input"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full bg-[#C35214] hover:bg-[#A64B29] text-white flex items-center justify-center disabled:opacity-50 transition-colors"
                data-testid="chat-send-btn"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-[#968B83] mt-2 text-center">
              Powered by IA · respuestas en tiempo real
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
