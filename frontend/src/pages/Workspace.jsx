// frontend/src/pages/Workspace.jsx

import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useCollaboration } from "../hooks/useCollaboration";
import CodeEditor from "../components/CodeEditor";
import ChatBox from "../components/ChatBox";
import AIAssistant from "../components/AIAssistant";
import KanbanBoard from "../components/KanbanBoard";
import { useExportFile } from "../hooks/useExportFile";
import api from "../services/api";

const LANG_COLORS = {
  javascript: "bg-yellow-500", typescript: "bg-blue-500",
  python: "bg-green-500",      rust: "bg-orange-500",
  go: "bg-cyan-500",           java: "bg-red-500",
  cpp: "bg-purple-500",        c: "bg-blue-400",
  html: "bg-orange-400",       css: "bg-pink-500",
  json: "bg-gray-400",         markdown: "bg-gray-300",
};

const ALL_LANGUAGES = [
  "javascript","typescript","python","rust","go","java","cpp","c",
  "csharp","php","ruby","swift","kotlin","html","css","scss",
  "json","markdown","sql","shell","yaml","xml","plaintext",
];

// ── New File Modal ────────────────────────────────────────────────────
function NewFileModal({ onClose, onCreate }) {
  const [name,     setName]     = useState("");
  const [language, setLanguage] = useState("javascript");
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState("");
  const importRef = useRef();

  const handleNameChange = (val) => {
    setName(val);
    const ext = val.split(".").pop()?.toLowerCase();
    const map = {
      js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
      py:"python", rs:"rust", go:"go", java:"java", cpp:"cpp", c:"c",
      cs:"csharp", php:"php", rb:"ruby", swift:"swift", kt:"kotlin",
      html:"html", css:"css", scss:"scss", json:"json", md:"markdown",
      sql:"sql", sh:"shell", yaml:"yaml", yml:"yaml", xml:"xml",
    };
    if (map[ext]) setLanguage(map[ext]);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("File name is required"); return; }
    try {
      setCreating(true);
      await onCreate({ name: name.trim(), language });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create file");
    } finally {
      setCreating(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target.result;
      const ext = file.name.split(".").pop()?.toLowerCase();
      const map = {
        js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
        py:"python", rs:"rust", go:"go", java:"java", cpp:"cpp", c:"c",
        cs:"csharp", php:"php", rb:"ruby", swift:"swift", kt:"kotlin",
        html:"html", css:"css", scss:"scss", json:"json", md:"markdown",
        sql:"sql", sh:"shell", yaml:"yaml", yml:"yaml", xml:"xml",
      };
      const detectedLang = map[ext] || "plaintext";
      try {
        setCreating(true);
        await onCreate({ name: file.name, language: detectedLang, content });
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to import file");
      } finally {
        setCreating(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">New File</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">File Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. main.py, App.tsx, server.go"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
            className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none"
          />
          <p className="text-xs text-gray-600 mt-1">Language auto-detected from extension</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
            {ALL_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Import from computer */}
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-600 mb-2">Or import from your computer:</p>
          <input
            ref={importRef}
            type="file"
            accept=".js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.cpp,.c,.cs,.php,.rb,.swift,.kt,.html,.css,.scss,.json,.md,.sql,.sh,.yaml,.yml,.xml,.txt"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => importRef.current.click()}
            disabled={creating}
            className="w-full text-xs py-2 border border-dashed border-gray-600 hover:border-emerald-600 text-gray-400 hover:text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? "Importing..." : "📁 Choose File from Computer"}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 text-xs py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={creating}
            className="flex-1 text-xs py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50">
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Tree Item ────────────────────────────────────────────────────
function FileItem({ file, isActive, currentUserId, onClick, onDelete }) {
  const isMyFile = file.owner?._id === currentUserId;
  const dotColor = LANG_COLORS[file.language] || "bg-gray-400";

  return (
    <div onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg group transition-colors ${
        isActive ? "bg-gray-700 border border-gray-600" : "hover:bg-gray-800"
      }`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="text-xs text-gray-200 flex-1 truncate">{file.name}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div title={file.owner?.name}
          className="w-4 h-4 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200">
          {file.owner?.name?.[0]?.toUpperCase()}
        </div>
        {!isMyFile && (
          <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">read</span>
        )}
        {isMyFile && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(file._id); }}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Workspace ────────────────────────────────────────────────────
export default function Workspace() {
  const { id: workspaceId } = useParams();
  const { user } = useContext(AuthContext);

  const { isConnected, members, messages, sendChat, remoteCursors, moveCursor } =
    useCollaboration(workspaceId, user);

  const [files,        setFiles]        = useState([]);
  const [activeFile,   setActiveFile]   = useState(null);
  const [showNewFile,  setShowNewFile]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [localContent, setLocalContent] = useState("");
  const [activeTab,    setActiveTab]    = useState("editor");
  const { downloadFile, downloadAllAsZip, copyToClipboard } = useExportFile();
  const [copied, setCopied] = useState(false); // ← tab state here

  const isMyFile = activeFile?.owner?._id === user?._id;

  const loadFiles = useCallback(async () => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/files`);
      setFiles(res.data);
    } catch (err) { console.error(err); }
  }, [workspaceId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  useEffect(() => {
    setLocalContent(activeFile?.content || "");
  }, [activeFile?._id]);

  const handleCreate = async ({ name, language }) => {
    const res = await api.post(`/workspaces/${workspaceId}/files`, { name, language });
    await loadFiles();
    setActiveFile(res.data);
  };

  const handleCodeChange = async (val) => {
    setLocalContent(val);
    if (!isMyFile) return;
    try {
      setSaving(true);
      await api.put(`/workspaces/${workspaceId}/files/${activeFile._id}`, { content: val });
      setActiveFile((f) => ({ ...f, content: val }));
      setFiles((prev) => prev.map((f) => f._id === activeFile._id ? { ...f, content: val } : f));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Delete this file?")) return;
    await api.delete(`/workspaces/${workspaceId}/files/${fileId}`);
    if (activeFile?._id === fileId) setActiveFile(null);
    loadFiles();
  };

  // ── Import file from computer ───────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const ext = file.name.split(".").pop()?.toLowerCase();
      const langMap = {
        js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
        py:"python", rs:"rust", go:"go", java:"java", cpp:"cpp", c:"c",
        cs:"csharp", php:"php", rb:"ruby", swift:"swift", kt:"kotlin",
        html:"html", css:"css", scss:"scss", json:"json", md:"markdown",
        sql:"sql", sh:"shell", yaml:"yaml", yml:"yaml", xml:"xml",
      };
      const language = langMap[ext] || "plaintext";

      try {
        const res = await api.post(`/workspaces/${workspaceId}/files`, {
          name: file.name,
          language,
          content,
        });
        await loadFiles();
        setActiveFile(res.data);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to import file");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-gray-950 text-gray-100 font-mono overflow-hidden">

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <button onClick={() => setActiveTab("editor")}
          className={`text-xs px-4 py-1.5 rounded-lg transition-colors ${
            activeTab === "editor" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}>
          Code Editor
        </button>
        <button onClick={() => setActiveTab("kanban")}
          className={`text-xs px-4 py-1.5 rounded-lg transition-colors ${
            activeTab === "kanban" ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
          }`}>
          Task Board
        </button>
      </div>

      {/* ── Kanban Tab ── */}
      {activeTab === "kanban" ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard workspaceId={workspaceId} members={members} />
        </div>
      ) : (

        /* ── Editor Tab ── */
        <div className="flex flex-1 overflow-hidden">

          {/* File Tree Sidebar */}
          <div className="w-56 flex flex-col bg-gray-900 border-r border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Files</span>
              <div className="flex items-center gap-1">
                {/* Import file from computer */}
                <label
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors text-xs cursor-pointer"
                  title="Import File from Computer">
                  ↑
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
                {/* Download all as ZIP */}
                <button
                  onClick={() => downloadAllAsZip(files, "workspace")}
                  disabled={files.length === 0}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors text-xs disabled:opacity-30"
                  title="Download All as ZIP">
                  ↓
                </button>
                {/* New file */}
                <button onClick={() => setShowNewFile(true)}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors text-base"
                  title="New File">
                  +
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-600">No files yet</p>
                  <button onClick={() => setShowNewFile(true)}
                    className="text-xs text-emerald-500 hover:underline mt-1">
                    Create one →
                  </button>
                </div>
              ) : (
                files.map((file) => (
                  <FileItem
                    key={file._id}
                    file={file}
                    isActive={activeFile?._id === file._id}
                    currentUserId={user?._id}
                    onClick={() => setActiveFile(file)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Members */}
            <div className="border-t border-gray-800 p-3">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">
                Online — {members.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m, i) => (
                  <div key={i} title={`${m.name} — ${m.status || "online"}`}
                    style={{ background: m.color }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-gray-900">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${LANG_COLORS[activeFile.language] || "bg-gray-400"}`} />
                    <span className="text-xs text-gray-300">{activeFile.name}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-600">{activeFile.language}</span>
                    {!isMyFile && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-900 border border-yellow-700 text-yellow-300 rounded-full">
                        Read Only — {activeFile.owner?.name}'s file
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {saving && <span className="text-xs text-gray-500 animate-pulse">Saving...</span>}
                    <button
                      onClick={async () => {
                        const ok = await copyToClipboard(localContent);
                        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
                      }}
                      className="text-xs px-2 py-1 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg transition-colors"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => downloadFile(activeFile.name, localContent)}
                      className="text-xs px-2 py-1 border border-gray-700 hover:border-emerald-600 text-gray-400 hover:text-emerald-400 rounded-lg transition-colors"
                    >
                      ↓ Download
                    </button>
                    {isConnected
                      ? <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live</span>
                      : <span className="text-xs text-red-400">Offline</span>
                    }
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    code={localContent}
                    fileName={activeFile.name}
                    remoteCursors={remoteCursors}
                    readOnly={!isMyFile}
                    onChange={{
                      onCodeChange: handleCodeChange,
                      onCursorMove: (line, col) => moveCursor(line, col),
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center text-2xl">
                  📄
                </div>
                <p className="text-sm text-gray-500">Select a file to start editing</p>
                <button onClick={() => setShowNewFile(true)}
                  className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                  + Create New File
                </button>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="w-64 flex flex-col bg-gray-900 border-l border-gray-800 flex-shrink-0">
            <ChatBox messages={messages} onSend={sendChat} currentUser={user} />
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showNewFile && (
        <NewFileModal onClose={() => setShowNewFile(false)} onCreate={handleCreate} />
      )}

      {/* AI Assistant */}
      <AIAssistant
        currentCode={localContent}
        currentLanguage={activeFile?.language || "javascript"}
      />
    </div>
  );
}
