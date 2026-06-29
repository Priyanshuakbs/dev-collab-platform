// frontend/src/pages/Workspace.jsx
// Full VS Code-like IDE: real filesystem, real terminal, multi-file tabs

import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { useParams }        from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext }      from "../context/AuthContext";
import { useCollaboration } from "../hooks/useCollaboration";
import { useFilesystem }    from "../hooks/useFilesystem";
import CodeEditor           from "../components/CodeEditor";
import ChatBox              from "../components/ChatBox";
import AIAssistant          from "../components/AIAssistant";
import KanbanBoard          from "../components/KanbanBoard";
import FileExplorer         from "../components/ide/FileExplorer";
import RealTerminal         from "../components/ide/RealTerminal";
import api                  from "../services/api";
import socket               from "../socket/socket";

// ── File icon colours ──────────────────────────────────────────────────
const LANG_DOT = {
  javascript:"bg-yellow-400", typescript:"bg-blue-400", python:"bg-green-400",
  java:"bg-red-400", cpp:"bg-purple-400", c:"bg-blue-300",
  html:"bg-orange-400", css:"bg-pink-400", json:"bg-gray-400", markdown:"bg-gray-300",
};

// ── Language detection ─────────────────────────────────────────────────
const getLang = (name) => ({
  js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",
  py:"python",java:"java",cpp:"cpp",cc:"cpp",c:"c",cs:"csharp",
  html:"html",css:"css",scss:"css",json:"json",md:"markdown",
  sh:"shell",yml:"yaml",yaml:"yaml",rs:"rust",go:"go",rb:"ruby",
  php:"php",kt:"kotlin",swift:"swift",sql:"sql",txt:"plaintext",
}[name.split(".").pop()?.toLowerCase()] || "plaintext");

// ── Can this file be executed? ─────────────────────────────────────────
const EXECUTABLE = ["python","javascript","typescript","java","cpp","c"];
const canRun = (lang) => EXECUTABLE.includes(lang?.toLowerCase());

// ── Editor Tabs ────────────────────────────────────────────────────────
function EditorTabs({ openFiles, activeFilePath, onSelect, onClose }) {
  return (
    <div className="flex items-end overflow-x-auto flex-shrink-0"
      style={{ background: "#252526", borderBottom: "1px solid #1e1e1e", minHeight: 35 }}>
      {openFiles.map((f) => {
        const isActive = f.path === activeFilePath;
        const dotCls   = LANG_DOT[getLang(f.name)] || "bg-gray-400";
        return (
          <div key={f.path}
            onClick={() => onSelect(f.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r flex-shrink-0 group transition-colors"
            style={{
              borderColor: "#1e1e1e",
              background: isActive ? "#1e1e1e" : "transparent",
              borderTop: isActive ? "1px solid #007acc" : "1px solid transparent",
              minWidth: 80, maxWidth: 180,
            }}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
            <span className="text-xs truncate flex-1" style={{ color: isActive ? "#fff" : "#969696" }}>
              {f.name}
              {f.dirty && <span style={{ color: "#ffe585" }}>●</span>}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onClose(f.path); }}
              className="text-xs w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all flex-shrink-0"
              style={{ color: "#969696" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Resize Handle ──────────────────────────────────────────────────────
function ResizeHandle({ onMouseDown }) {
  return (
    <div onMouseDown={onMouseDown}
      className="h-1 flex-shrink-0 cursor-row-resize transition-colors"
      style={{ background: "#2d2d2d" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#007acc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#2d2d2d")} />
  );
}

// ── Run command builder ────────────────────────────────────────────────
function buildRunCmd(lang, filePath) {
  const p   = filePath.replace(/\\/g, "/");
  const dir = p.includes("/") ? p.split("/").slice(0, -1).join("/") : ".";
  const base = p.split("/").pop()?.replace(/\.[^.]+$/, "") || "main";
  switch (lang) {
    case "python":     return `python "${p}"\r`;
    case "javascript":
    case "typescript": return `node "${p}"\r`;
    case "java":       return `javac "${p}" && java -cp "${dir}" ${base}\r`;
    case "cpp":        return `g++ -std=c++17 -o "${dir}/${base}" "${p}" && "${dir}/${base}"\r`;
    case "c":          return `gcc -o "${dir}/${base}" "${p}" && "${dir}/${base}"\r`;
    default:           return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Main Workspace
// ═══════════════════════════════════════════════════════════════════════
export default function Workspace() {
  const { id: workspaceId } = useParams();
  const { user }            = useContext(AuthContext);

  const { isConnected, members, messages, sendChat, remoteCursors, moveCursor } =
    useCollaboration(workspaceId, user);

  const fs = useFilesystem(workspaceId);

  // ── State ────────────────────────────────────────────────────────
  const [workspace,      setWorkspace]      = useState(null);
  const [activeTab,      setActiveTab]      = useState("editor");   // editor | kanban
  const [openFiles,      setOpenFiles]      = useState([]);         // { path, name, content, language, dirty }
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [terminalOpen,   setTerminalOpen]   = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(230);
  const [sidebarW,       setSidebarW]       = useState(220);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [isRunning,      setIsRunning]      = useState(false);
  const [runError,       setRunError]       = useState("");

  const autoSaveTimer = useRef(null);
  const terminalRef   = useRef(null);

  // ── Computed ─────────────────────────────────────────────────────
  const activeFile      = openFiles.find((f) => f.path === activeFilePath) || null;
  const isWorkspaceAdmin = workspace?.owner?._id === user?._id || workspace?.owner === user?._id;

  // ── Load workspace info ──────────────────────────────────────────
  useEffect(() => {
    api.get(`/workspaces/${workspaceId}`)
      .then((r) => setWorkspace(r.data))
      .catch(console.error);
    fs.refresh();
  }, [workspaceId]);

  // ── Open file from explorer ──────────────────────────────────────
  const openFile = useCallback(async (item) => {
    if (item.type === "directory") return;

    // Already open → just activate
    const existing = openFiles.find((f) => f.path === item.path);
    if (existing) { setActiveFilePath(item.path); return; }

    try {
      const content  = await fs.readFile(item.path);
      const language = getLang(item.name);
      setOpenFiles((prev) => [...prev, { path: item.path, name: item.name, content, language, dirty: false }]);
      setActiveFilePath(item.path);
    } catch (e) {
      console.error("openFile:", e);
    }
  }, [openFiles, fs]);

  // ── Close tab ────────────────────────────────────────────────────
  const closeFile = useCallback((path) => {
    setOpenFiles((prev) => {
      const idx      = prev.findIndex((f) => f.path === path);
      const newFiles = prev.filter((f) => f.path !== path);
      if (activeFilePath === path) {
        const next = newFiles[idx] || newFiles[idx - 1] || null;
        setActiveFilePath(next?.path || null);
      }
      return newFiles;
    });
  }, [activeFilePath]);

  // ── Code change → auto-save ──────────────────────────────────────
  const handleCodeChange = useCallback((val) => {
    if (!activeFilePath) return;

    setOpenFiles((prev) =>
      prev.map((f) => f.path === activeFilePath ? { ...f, content: val, dirty: true } : f)
    );

    // Debounced auto-save to filesystem (800ms)
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await fs.writeFile(activeFilePath, val);
        setOpenFiles((prev) =>
          prev.map((f) => f.path === activeFilePath ? { ...f, dirty: false } : f)
        );
      } catch (e) { console.error("auto-save:", e); }
      finally { setSaving(false); }
    }, 800);
  }, [activeFilePath, fs]);

  // ── Run code via terminal ────────────────────────────────────────
  const handleRunCode = useCallback(async () => {
    if (!activeFile) return;
    // Save first
    try {
      await fs.writeFile(activeFilePath, activeFile.content);
      setOpenFiles((prev) => prev.map((f) => f.path === activeFilePath ? { ...f, dirty: false } : f));
    } catch (_) {}

    const cmd = buildRunCmd(activeFile.language, activeFilePath);
    if (!cmd) { setRunError("Language not executable"); setTimeout(() => setRunError(""), 3000); return; }

    setTerminalOpen(true);
    setIsRunning(true);
    setTimeout(() => {
      terminalRef.current?.runCommand(cmd);
      setIsRunning(false);
    }, terminalOpen ? 100 : 500); // if terminal just opened, give it time
  }, [activeFile, activeFilePath, fs, terminalOpen]);

  // ── Terminal resize drag ─────────────────────────────────────────
  const handleTermResizeDrag = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY, startH = terminalHeight;
    const move   = (mv) => {
      const newH = startH - (mv.clientY - startY);
      if (newH >= 120 && newH <= window.innerHeight * 0.75) setTerminalHeight(newH);
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup",   up);
  }, [terminalHeight]);

  // ── Sidebar resize drag ──────────────────────────────────────────
  const handleSidebarResizeDrag = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startW = sidebarW;
    const move   = (mv) => {
      const newW = startW + (mv.clientX - startX);
      if (newW >= 150 && newW <= 400) setSidebarW(newW);
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup",   up);
  }, [sidebarW]);

  return (
    <div className="flex flex-col overflow-hidden transition-all duration-200" style={{ height: "100vh", paddingTop: "var(--navbar-height, 56px)", background: "#1e1e1e", fontFamily: "Consolas, 'JetBrains Mono', monospace" }}>

      {/* ── Top Tab Bar ── */}
      <div className="flex items-center gap-1 px-3 flex-shrink-0"
        style={{ background: "#3c3c3c", borderBottom: "1px solid #252526", height: 36 }}>
        {[["editor", "⌨ Code Editor"], ["kanban", "📋 Task Board"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="text-xs px-3 py-1 rounded transition-colors"
            style={{
              background: activeTab === key ? "#1e1e1e" : "transparent",
              color:      activeTab === key ? "#ffffff" : "#969696",
            }}>
            {label}
          </button>
        ))}

        {/* Run + Status in top bar */}
        <div className="ml-auto flex items-center gap-2">
          {activeTab === "editor" && activeFile && canRun(activeFile.language) && (
            <>
              {runError && <span className="text-xs" style={{ color: "#f87171" }}>{runError}</span>}
              <button onClick={handleRunCode} disabled={isRunning}
                className="text-xs px-3 py-1 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                style={{ background: "#197819", color: "#fff" }}>
                {isRunning ? <><span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Running…</> : "▶ Run"}
              </button>
            </>
          )}
          {saving && <span className="text-xs animate-pulse" style={{ color: "#858585" }}>Saving…</span>}
          <span className="text-xs px-2 py-0.5 rounded"
            style={{ background: isWorkspaceAdmin ? "#37306b" : "#2d2d2d", color: isWorkspaceAdmin ? "#c084fc" : "#858585", border: `1px solid ${isWorkspaceAdmin ? "#7c3aed" : "#3c3c3c"}` }}>
            {isWorkspaceAdmin ? "👑 Admin" : "Member"}
          </span>
        </div>
      </div>

      {/* ── Kanban Tab ── */}
      {activeTab === "kanban" ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard workspaceId={workspaceId} members={workspace?.members || []} />
        </div>
      ) : (

        /* ── Editor Tab ── */
        <div className="flex flex-1 overflow-hidden">

          {/* ── File Explorer Sidebar ── */}
          {sidebarOpen && (
            <>
              <div style={{ width: sidebarW, minWidth: 150, maxWidth: 400, flexShrink: 0, borderRight: "1px solid #252526", display: "flex", flexDirection: "column" }}>
                {/* Online members footer */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <FileExplorer
                    workspaceId={workspaceId}
                    fs={fs}
                    onOpenFile={openFile}
                  />
                </div>

                {/* Online members */}
                <div className="flex-shrink-0 border-t p-2" style={{ borderColor: "#252526", background: "#252526" }}>
                  <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "#858585" }}>
                    Online — {members.length}
                  </p>
                  <div className="flex flex-col gap-1">
                    {members.map((m, i) => {
                      const mIsAdmin = workspace?.owner?._id === m.userId || workspace?.owner === m.userId;
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: m.color, color: "#1e1e1e" }}>
                            {m.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-[10px] flex-1 truncate" style={{ color: "#cccccc" }}>{m.name}</span>
                          {mIsAdmin && <span className="text-[9px]" style={{ color: "#c084fc" }}>👑</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar resize handle */}
              <div onMouseDown={handleSidebarResizeDrag}
                className="w-1 flex-shrink-0 cursor-col-resize transition-colors"
                style={{ background: "#2d2d2d" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#007acc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#2d2d2d")} />
            </>
          )}

          {/* ── Editor + Terminal ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Sidebar toggle button */}
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="absolute left-0 top-1/2 z-10 w-4 h-12 flex items-center justify-center rounded-r transition-colors"
              style={{ background: "#3c3c3c", color: "#858585", transform: "translateY(-50%)", marginLeft: sidebarOpen ? sidebarW : 0 }}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
              {sidebarOpen ? "‹" : "›"}
            </button>

            {openFiles.length === 0 ? (
              /* ── Empty State ── */
              <div className="flex-1 flex flex-col items-center justify-center gap-4"
                style={{ background: "#1e1e1e" }}>
                <div className="text-5xl mb-2">💻</div>
                <p className="text-sm" style={{ color: "#858585" }}>No file is open</p>
                <p className="text-xs" style={{ color: "#555" }}>Select a file from the Explorer or create a new one</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => fs.createFile("main.py", '# Hello World\nprint("Hello, DevCollab!")\n')}
                    className="text-xs px-4 py-2 rounded" style={{ background: "#0e639c", color: "#fff" }}>
                    + New Python File
                  </button>
                  <button onClick={() => {
                    if (terminalOpen) setTerminalOpen(false);
                    else { setTerminalOpen(true); }
                  }}
                    className="text-xs px-4 py-2 rounded" style={{ background: "#3c3c3c", color: "#cccccc" }}>
                    {terminalOpen ? "Hide" : "Open"} Terminal
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Editor Tabs ── */}
                <EditorTabs
                  openFiles={openFiles}
                  activeFilePath={activeFilePath}
                  onSelect={setActiveFilePath}
                  onClose={closeFile}
                />

                {/* ── Monaco Editor ── */}
                <div className="flex-1 overflow-hidden" style={{ height: terminalOpen ? `calc(100% - ${terminalHeight}px - 29px)` : "100%" }}>
                  <div className="h-full">
                    <CodeEditor
                      code={activeFile?.content || ""}
                      fileName={activeFile?.name || "untitled"}
                      remoteCursors={remoteCursors}
                      readOnly={false}
                      onChange={{
                        onCodeChange: handleCodeChange,
                        onCursorMove: (line, col) => moveCursor(line, col),
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Terminal Panel ── */}
            <AnimatePresence>
              {terminalOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: terminalHeight }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="flex flex-col flex-shrink-0 overflow-hidden"
                  style={{ borderTop: "1px solid #252526" }}
                >
                  <ResizeHandle onMouseDown={handleTermResizeDrag} />
                  <div className="flex-1 overflow-hidden">
                    <RealTerminal
                      ref={terminalRef}
                      workspaceId={workspaceId}
                      userId={user?._id}
                      onFsChanged={() => fs.refresh()}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Terminal Toggle Button (bottom status bar) ── */}
            <div className="flex items-center justify-between px-3 flex-shrink-0"
              style={{ background: "#007acc", height: 22, minHeight: 22 }}>
              <div className="flex items-center gap-3">
                <button onClick={() => setTerminalOpen((v) => !v)}
                  className="text-[10px] font-medium flex items-center gap-1 hover:bg-white/20 px-2 rounded transition-colors"
                  style={{ color: "#fff", height: "100%" }}>
                  ⌨ {terminalOpen ? "Hide Terminal" : "Show Terminal"}
                </button>
                {isConnected
                  ? <span className="text-[10px] flex items-center gap-1" style={{ color: "#cef9ce" }}><span className="w-1.5 h-1.5 rounded-full bg-green-300" />Live</span>
                  : <span className="text-[10px]" style={{ color: "#fecaca" }}>Offline</span>}
              </div>
              {activeFile && (
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {activeFile.language} · {activeFile.name}
                </span>
              )}
            </div>
          </div>

          {/* ── Chat Sidebar ── */}
          <div className="flex-shrink-0 flex flex-col border-l" style={{ width: 256, borderColor: "#252526", background: "#252526" }}>
            <ChatBox messages={messages} onSend={sendChat} currentUser={user} />
          </div>
        </div>
      )}

      <AIAssistant currentCode={activeFile?.content || ""} currentLanguage={activeFile?.language || "javascript"} />
    </div>
  );
}