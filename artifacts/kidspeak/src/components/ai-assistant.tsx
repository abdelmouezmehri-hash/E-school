import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, RotateCcw, Loader2, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const NAVY = "#1B2E8F";

type Message = { role: "user" | "assistant"; content: string };

async function sendChat(messages: Message[]): Promise<string> {
  const r = await fetch("/api/ai/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "فشل الاتصال بالمساعد الذكي");
  }
  const data = await r.json();
  return data.reply as string;
}

export function AiAssistant({ role }: { role?: string }) {
  const allowed = ["admin", "teacher", "psychologist", "accountant", "branch_manager"];
  const isAllowed = !!role && allowed.includes(role);
  const { isRTL } = useLanguage();
  // In LTR the sidebar is on the left → float button on the right.
  // In RTL the sidebar is on the right → float button on the left.
  const side = isRTL ? "left-6" : "right-6";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isAllowed) return null;

  const suggestions = [
    "كم عدد التلاميذ المتأخرين في الدفع؟",
    "اكتب رسالة تذكير بالدفع لولي الأمر",
    "ما هي أفضل الطرق لتحفيز الأطفال في الفصل؟",
    "كيف أتابع تقدم تلاميذي هذا الأسبوع؟",
  ];

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setError(null);
    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const reply = await sendChat(newMessages);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 ${side} z-40 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95`}
        style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` }}
        title="المساعد الذكي"
      >
        {open ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
        {messages.length > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[10px] font-black text-white flex items-center justify-center">
            {messages.filter(m => m.role === "assistant").length}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-24 ${side} z-50 w-80 sm:w-96 rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
          style={{
            maxHeight: "70vh",
            background: "white",
            border: "1px solid #e2e8f0",
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-white font-bold text-sm">المساعد الذكي</span>
              <span className="text-white/50 text-[10px]">Powered by Claude</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setError(null); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                  title="مسح المحادثة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ fontFamily: "'Noto Sans Arabic', system-ui, sans-serif" }}>
            {messages.length === 0 ? (
              <div className="pt-2">
                <p className="text-xs text-slate-400 text-center mb-3">اسأل ما تريد عن التلاميذ، المدفوعات، أو أي شيء آخر</p>
                <div className="space-y-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="w-full text-right text-xs px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 border border-slate-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-slate-100 text-slate-800"
                        : "text-white"
                    }`}
                    style={m.role === "assistant" ? { background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` } : {}}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-end">
                <div className="px-3 py-2 rounded-2xl text-sm flex items-center gap-2 text-white"
                     style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">جارٍ التفكير...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-500 text-center px-2 py-1 bg-red-50 rounded-lg">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب سؤالك..."
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-300 bg-slate-50"
                style={{ fontFamily: "'Noto Sans Arabic', system-ui, sans-serif", direction: "rtl" }}
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${NAVY}, #2d4db5)` }}
              >
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
