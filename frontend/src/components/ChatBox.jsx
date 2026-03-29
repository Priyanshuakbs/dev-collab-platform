// frontend/src/components/ChatBox.jsx

import { useState, useEffect, useRef } from "react";

export default function ChatBox({ messages, onSend, currentUser }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // Naya message aate hi scroll down
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-gray-500 uppercase tracking-widest px-3 pt-3 pb-2 border-b border-gray-800">
        Chat
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">
            No messages yet. Say hi! 👋
          </p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userId === currentUser?.id;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-xs text-gray-500 mb-0.5">{isMe ? "You" : msg.name}</span>
              <div
                className={`text-xs px-3 py-1.5 rounded-lg max-w-[90%] leading-relaxed ${
                  isMe
                    ? "bg-emerald-800 text-emerald-100"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-xs text-gray-700 mt-0.5">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="message..."
          className="flex-1 bg-gray-800 text-sm text-gray-200 px-3 py-1.5 rounded-lg outline-none placeholder-gray-600 border border-gray-700 focus:border-emerald-600"
        />
        <button
          onClick={handleSend}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
