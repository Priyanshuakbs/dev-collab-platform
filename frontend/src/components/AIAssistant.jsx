// frontend/src/components/AIAssistant.jsx
// AI Code Assistant powered by Google Gemini (Free)

import { useState, useRef, useEffect } from "react";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ACTIONS = [
  { id: "explain",  label: "Explain Code",     icon: "💡", prompt: (code, lang) => `Explain this ${lang} code clearly and concisely:\n\`\`\`${lang}\n${code}\n\`\`\`` },
  { id: "fix",      label: "Fix Bugs",          icon: "🐛", prompt: (code, lang) => `Find and fix all bugs in this ${lang} code. Show the fixed code and explain what was wrong:\n\`\`\`${lang}\n${code}\n\`\`\`` },
  { id: "generate", label: "Generate Code",     icon: "⚡", prompt: (code, lang) => `Based on this ${lang} code context, generate new functionality as requested:\n\`\`\`${lang}\n${code}\n\`\`\`` },
  { id: "comment",  label: "Add Docs",          icon: "📝", prompt: (code, lang) => `Add clear comments and documentation to this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`` },
  { id: "convert",  label: "Convert Language",  icon: "🔄", prompt: (code, lang) => `Convert this ${lang} code to the target language I specify:\n\`\`\`${lang}\n${code}\n\`\`\`` },
];

export default function AIAssistant({ currentCode = "", currentLanguage = "javascript" }) {
  const [isOpen,       setIsOpen]       = useState(false);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [apiKey,       setApiKey]       = useState(import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(!import.meta.env.VITE_GEMINI_API_KEY && !localStorage.getItem("gemini_api_key"));

  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveApiKey = () => {
    localStorage.setItem("gemini_api_key", apiKey);
    setShowKeyInput(false);
  };

  // ── Send to Gemini ───────────────────────────────────────────────
  const sendMessage = async (userMessage) => {
    if (!apiKey) { setShowKeyInput(true); return; }
    if (!userMessage.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for Gemini
      const history = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      const systemContext = `You are an expert coding assistant in a collaborative code editor. 
Current file language: ${currentLanguage}. 
Be concise and practical. Always format code with markdown code blocks.`;

      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...history,
            { role: "user", parts: [{ text: `${systemContext}\n\n${userMessage}` }] },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Gemini API Error");
      }

      const data  = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  // ── Quick action ─────────────────────────────────────────────────
  const handleAction = (action) => {
    if (!currentCode.trim()) {
      setMessages((prev) => [...prev, {
        role: "error", text: "No code found. Open a file first.",
      }]);
      return;
    }
    setActiveAction(action.id);
    if (action.id === "generate" || action.id === "convert") {
      setInput(action.prompt(currentCode, currentLanguage));
      inputRef.current?.focus();
      setActiveAction(null);
    } else {
      sendMessage(action.prompt(currentCode, currentLanguage));
    }
  };

  // ── Render message ────────────────────────────────────────────────
  const renderMessage = (msg, i) => {
    if (msg.role === "user") return (
      <div key={i} className="flex justify-end">
        <div className="max-w-[85%] bg-emerald-800 text-emerald-50 text-xs px-3 py-2 rounded-2xl rounded-br-sm leading-relaxed">
          {msg.text}
        </div>
      </div>
    );

    if (msg.role === "error") return (
      <div key={i} className="text-xs text-red-400 bg-red-900 border border-red-800 rounded-lg px-3 py-2">
        {msg.text}
      </div>
    );

    // Parse code blocks
    const parts = msg.text.split(/(```[\s\S]*?```)/g);
    return (
      <div key={i} className="flex justify-start">
        <div className="max-w-[95%] space-y-2">
          {parts.map((part, j) => {
            if (part.startsWith("```")) {
              const lines = part.split("\n");
              const lang  = lines[0].replace("```", "").trim() || "code";
              const code  = lines.slice(1, -1).join("\n");
              return (
                <div key={j} className="bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1 border-b border-gray-700">
                    <span className="text-xs text-gray-500">{lang}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(code)}
                      className="text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-green-300 p-3 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
                    {code}
                  </pre>
                </div>
              );
            }
            return part.trim() ? (
              <p key={j} className="text-xs text-gray-200 leading-relaxed">{part}</p>
            ) : null;
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isOpen ? "bg-gray-700" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
        title="AI Code Assistant"
      >
        <span className="text-xl">{isOpen ? "✕" : "🤖"}</span>
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[520px] bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl font-mono overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <div>
                <p className="text-xs font-bold text-white">AI Code Assistant</p>
                <p className="text-xs text-blue-400">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              title="API Key Settings"
            >
              ⚙
            </button>
          </div>

          {/* API Key Input */}
          {showKeyInput && (
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-800 space-y-2">
              <p className="text-xs text-gray-400">Enter your Gemini API key:</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-gray-700 text-xs text-gray-200 px-2 py-1.5 rounded-lg border border-gray-600 outline-none focus:border-emerald-500"
                />
                <button onClick={saveApiKey}
                  className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg">
                  Save
                </button>
              </div>
              <p className="text-xs text-gray-600">
                Free key at{" "}
                <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
                  className="text-blue-400 hover:underline">
                  aistudio.google.com
                </a>
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-gray-800 overflow-x-auto flex-shrink-0">
            {ACTIONS.map((action) => (
              <button key={action.id} onClick={() => handleAction(action)} disabled={loading}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                  activeAction === action.id
                    ? "bg-emerald-700 border-emerald-600 text-white"
                    : "border-gray-700 text-gray-400 hover:border-emerald-600 hover:text-emerald-400"
                }`}>
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <p className="text-2xl">🤖</p>
                <p className="text-xs text-gray-400">AI Code Assistant ready!</p>
                <p className="text-xs text-gray-600">Select an action above or ask anything.</p>
                <div className="text-left mt-3 space-y-1">
                  {[
                    "Explain what this function does",
                    "How can I optimize this code?",
                    "Convert this to TypeScript",
                  ].map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs text-gray-500 hover:text-emerald-400 px-2 py-1 rounded hover:bg-gray-800 transition-colors">
                      → {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(renderMessage)}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span key={delay} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
                Gemini is thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-gray-800">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask anything about your code... (Enter to send)"
              rows={1}
              className="flex-1 bg-gray-800 text-xs text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none resize-none placeholder-gray-600"
            />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg transition-colors">
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
