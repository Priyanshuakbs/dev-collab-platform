// frontend/src/components/ChatBox.jsx

import { useState, useEffect, useRef } from "react";

export default function ChatBox({ messages = [], onSend, currentUser, activeMembers = [], projectMembers = [] }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null); // { fileUrl, fileType, fileName }
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordingError, setRecordingError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Record timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleSend = () => {
    if (!input.trim() && !attachment) return;
    
    if (attachment) {
      onSend(input.trim(), attachment.fileUrl, attachment.fileType, attachment.fileName);
      setAttachment(null);
    } else {
      onSend(input.trim());
    }
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── File Upload Handler ──────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let type = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("audio/")) type = "audio";
      else if (file.type.startsWith("video/")) type = "video";

      setAttachment({
        fileUrl: reader.result,
        fileType: type,
        fileName: file.name,
      });
    };
    reader.onloadend = () => {
      // Reader has completed loading the file
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset file input
  };

  // ── Voice Recording Handlers ──────────────────────────────────────────
  const startRecording = async () => {
    setRecordingError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachment({
            fileUrl: reader.result,
            fileType: "audio",
            fileName: `Voice Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setRecordingError("Microphone access denied or not found");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear data handler so it doesn't trigger state update on stop
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── Online Status Calculations ──────────────────────────────────────
  const isUserOnline = (userId) => {
    return activeMembers.some((m) => m.userId?.toString() === userId?.toString());
  };

  return (
    <div className="flex h-full bg-gray-950 font-mono text-gray-200 overflow-hidden">
      
      {/* Left Sidebar: Members (Online / Offline status) */}
      <div className="w-52 border-r border-gray-800 flex flex-col bg-gray-900/40 flex-shrink-0">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members Status</span>
          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded-full font-bold">
            {activeMembers.length} active
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {projectMembers.map((member) => {
            const memberUser = member?.user;
            if (!memberUser) return null;
            const online = isUserOnline(memberUser._id);
            return (
              <div key={memberUser._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-purple-900 border border-purple-800 flex items-center justify-center text-[10px] font-black text-purple-200">
                    {memberUser.name?.[0]?.toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-950 ${online ? "bg-green-500" : "bg-gray-600"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-gray-300 truncate leading-tight">{memberUser.name}</p>
                  <p className="text-[9px] text-gray-600 truncate">{online ? "online" : "offline"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Messages list + Input bar */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Chat Room</span>
          {recordingError && <span className="text-[10px] text-red-400 font-semibold">{recordingError}</span>}
        </div>

        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-xs text-gray-500">No messages in this workspace. Start the conversation!</p>
            </div>
          )}
          
          {messages.map((msg, i) => {
            const isMe = msg.userId?.toString() === currentUser?._id?.toString();
            return (
              <div key={i} className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                  {msg.name?.[0]?.toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] font-bold text-gray-500">{isMe ? "You" : msg.name}</span>
                    <span className="text-[9px] text-gray-700">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  
                  <div className={`p-2.5 rounded-2xl text-xs space-y-2 shadow-md leading-relaxed ${
                    isMe ? "bg-emerald-800/80 text-emerald-100 rounded-tr-none" : "bg-gray-900 border border-gray-850 text-gray-200 rounded-tl-none"
                  }`}>
                    {/* Text content if present */}
                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                    {/* Attachment rendering */}
                    {msg.fileUrl && (
                      <div className="pt-1.5 border-t border-white/10 mt-1.5">
                        {msg.fileType === "image" && (
                          <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg max-h-48 object-contain border border-black/20" />
                        )}
                        {msg.fileType === "audio" && (
                          <div className="space-y-1">
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{msg.fileName}</p>
                            <audio controls src={msg.fileUrl} className="w-full min-w-[240px] h-8 rounded-lg bg-gray-950/80 outline-none" />
                          </div>
                        )}
                        {msg.fileType === "document" && (
                          <a href={msg.fileUrl} download={msg.fileName} className="flex items-center gap-2 p-2 bg-black/20 hover:bg-black/40 rounded-xl transition-all border border-white/5 group">
                            <span className="text-lg">📁</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-gray-300 truncate leading-normal group-hover:text-emerald-400 transition-colors">{msg.fileName}</p>
                              <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Download File</p>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Selected attachment preview banner */}
        {attachment && (
          <div className="mx-4 mt-2 p-2.5 bg-gray-900/60 border border-gray-850 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">
                {attachment.fileType === "image" ? "🖼️" : attachment.fileType === "audio" ? "🎙️" : "📁"}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white truncate leading-normal">{attachment.fileName}</p>
                <p className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold">{attachment.fileType} attached</p>
              </div>
            </div>
            <button onClick={() => setAttachment(null)} className="text-[10px] w-5 h-5 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors text-gray-400 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-gray-800/80 bg-gray-950 flex flex-col gap-2 flex-shrink-0">
          
          <div className="flex items-center gap-2.5">
            {/* Audio Recording / Attached Display */}
            {isRecording ? (
              <div className="flex-1 bg-red-950/20 border border-red-900/50 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs animate-pulse">
                <div className="flex items-center gap-2 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold">Recording voice note... {formatTime(recordTime)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelRecording} className="text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider px-2 py-0.5 hover:bg-white/5 rounded">Cancel</button>
                  <button onClick={stopRecording} className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider px-2 py-0.5 bg-red-950/40 rounded border border-red-900/50">Stop</button>
                </div>
              </div>
            ) : (
              <>
                {/* File Attachment Input (hidden) */}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                
                {/* File Attachment Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full border border-gray-800 bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm transition-all flex-shrink-0"
                  title="Attach file/document"
                >
                  📎
                </button>

                {/* Microphone / Record Button */}
                <button 
                  onClick={startRecording}
                  className="w-8 h-8 rounded-full border border-gray-800 bg-gray-900/60 hover:bg-gray-850 hover:bg-red-950/20 hover:border-red-900/60 hover:text-red-400 text-gray-400 flex items-center justify-center text-sm transition-all flex-shrink-0"
                  title="Record Voice Note"
                >
                  🎙️
                </button>

                {/* Text input box */}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={attachment ? "Add comment to file..." : "Send a message..."}
                  className="flex-1 bg-gray-900 text-xs text-gray-200 px-3.5 py-2 rounded-xl outline-none placeholder-gray-600 border border-gray-850 focus:border-emerald-600/80 transition-colors"
                />

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && !attachment}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl transition-all font-bold flex-shrink-0"
                >
                  Send
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
