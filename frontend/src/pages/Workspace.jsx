// frontend/src/pages/Workspace.jsx
import { useState, useContext, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
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

const LANG_DOT = {
  javascript:"bg-yellow-400", typescript:"bg-blue-400", python:"bg-green-400",
  java:"bg-red-400", cpp:"bg-purple-400", c:"bg-blue-300",
  html:"bg-orange-400", css:"bg-pink-400", json:"bg-gray-400", markdown:"bg-gray-300",
};

const getLang = (name) => ({
  js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",
  py:"python",java:"java",cpp:"cpp",cc:"cpp",c:"c",cs:"csharp",
  html:"html",css:"css",scss:"css",json:"json",md:"markdown",
  sh:"shell",yml:"yaml",yaml:"yaml",rs:"rust",go:"go",rb:"ruby",
  php:"php",kt:"kotlin",swift:"swift",sql:"sql",txt:"plaintext",
}[name.split(".").pop()?.toLowerCase()] || "plaintext");

const EXECUTABLE = ["python","javascript","typescript","java","cpp","c"];
const canRun = (lang) => EXECUTABLE.includes(lang?.toLowerCase());

const PRIORITY_CLASS = {
  high:   "badge badge-high",
  medium: "badge badge-medium",
  low:    "badge badge-low",
};
const STATUS_CLASS = {
  active:    "badge badge-active",
  completed: "badge badge-member",
  archived:  "badge",
};

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

function ResizeHandle({ onMouseDown }) {
  return (
    <div onMouseDown={onMouseDown}
      className="h-1 flex-shrink-0 cursor-row-resize transition-colors"
      style={{ background: "#2d2d2d" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#007acc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#2d2d2d")} />
  );
}

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

const WORK_ROLES = [
  "Project Manager",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "QA Engineer",
  "DevOps Engineer",
];

// ═══════════════════════════════════════════════════════════════════════
// Main Workspace View
// ═══════════════════════════════════════════════════════════════════════
export default function Workspace() {
  const { id: workspaceId } = useParams();
  const { user }            = useContext(AuthContext);
  const navigate            = useNavigate();

  const { isConnected, members, messages, sendChat, remoteCursors, moveCursor } =
    useCollaboration(workspaceId, user);

  const fs = useFilesystem(workspaceId);

  // ── States ───────────────────────────────────────────────────────
  const [project,        setProject]        = useState(null);
  const [searchParams]                      = useSearchParams();
  const [activeTab,      setActiveTab]      = useState(searchParams.get("tab") || "overview"); // overview, team, invite, members, tasks, chat, files, settings
  useEffect(() => {
    const tab = searchParams.get("tab") || "overview";
    setActiveTab(tab);
  }, [searchParams]);
  const [openFiles,      setOpenFiles]      = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [terminalOpen,   setTerminalOpen]   = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(230);
  const [sidebarW,       setSidebarW]       = useState(220);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [isRunning,      setIsRunning]      = useState(false);
  const [runError,       setRunError]       = useState("");

  // Edit Team state
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [editTeamLogo, setEditTeamLogo] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");

  // Invite state
  const [inviteEmail, setInviteEmail]       = useState("");
  const [inviteRole, setInviteRole]         = useState("member");
  const [inviteWorkRole, setInviteWorkRole] = useState("Frontend Developer");
  const [inviteLink, setInviteLink]         = useState("");
  const [inviteError, setInviteError]       = useState("");
  const [inviteSuccess, setInviteSuccess]   = useState("");
  const [copied, setCopied]                 = useState(false);

  // Members search & transfer states
  const [memberSearch, setMemberSearch] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Edit Project Details (Settings tab)
  const [editProjName, setEditProjName] = useState("");
  const [editProjDesc, setEditProjDesc] = useState("");
  const [editProjPrio, setEditProjPrio] = useState("medium");
  const [editProjStatus, setEditProjStatus] = useState("active");
  const [editProjDeadline, setEditProjDeadline] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");

  const autoSaveTimer = useRef(null);
  const terminalRef   = useRef(null);

  // Load project details based on workspace ID
  const fetchProjectDetails = useCallback(async () => {
    try {
      const res = await api.get(`/projects/workspace/${workspaceId}`);
      setProject(res.data);
      setEditTeamName(res.data.teamName);
      setEditTeamDesc(res.data.description || "");
      setEditTeamLogo(res.data.teamLogo || "");
      setEditProjName(res.data.projectName);
      setEditProjDesc(res.data.description || "");
      setEditProjPrio(res.data.priority || "medium");
      setEditProjStatus(res.data.status || "active");
      setEditProjDeadline(res.data.deadline ? res.data.deadline.slice(0,10) : "");
    } catch (err) {
      console.error("fetchProjectDetails error:", err);
      // Fallback: Fetch workspace details directly if no project is associated
      try {
        const wsRes = await api.get(`/workspaces/${workspaceId}`);
        const wsData = wsRes.data;
        const ownerId = wsData.owner?._id || wsData.owner;
        const fallbackProject = {
          _id: wsData._id,
          projectName: wsData.name,
          teamName: wsData.name,
          description: "Workspace default sandbox.",
          priority: "medium",
          status: "active",
          owner: wsData.owner,
          members: wsData.members?.map(m => ({
            user: m,
            role: (m?._id || m)?.toString() === ownerId?.toString() ? "owner" : "member",
            workRole: "Developer"
          })) || []
        };
        setProject(fallbackProject);
        setEditTeamName(fallbackProject.teamName);
        setEditTeamDesc(fallbackProject.description);
        setEditProjName(fallbackProject.projectName);
        setEditProjPrio(fallbackProject.priority);
        setEditProjStatus(fallbackProject.status);
      } catch (wsErr) {
        console.error("Workspace fallback details fetch failed:", wsErr);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchProjectDetails();
    fs.refresh();
  }, [workspaceId, fetchProjectDetails]);

  // Real-time updates for members list using Socket.io
  useEffect(() => {
    socket.on("membersListUpdated", fetchProjectDetails);
    return () => {
      socket.off("membersListUpdated", fetchProjectDetails);
    };
  }, [fetchProjectDetails]);

  // computed permissions
  const projectOwnerId = project?.owner?._id || project?.owner;
  const isOwner = projectOwnerId === user?._id;
  const myMemberEntry = project?.members?.find((m) => m.user?._id === user?._id);
  const isAdmin = myMemberEntry?.role === "admin";
  const hasManagementAccess = isOwner || isAdmin;

  // ── Open file ────────────────────────────────────────────────────
  const openFile = useCallback(async (item) => {
    if (item.type === "directory") return;
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
    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    if (!activeFile) return;
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
    }, terminalOpen ? 100 : 500);
  }, [openFiles, activeFilePath, fs, terminalOpen]);

  // ── Resizes ──────────────────────────────────────────────────────
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

  // ── Team Tab functions ───────────────────────────────────────────
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => setEditTeamLogo(r.result);
      r.readAsDataURL(file);
    }
  };

  const handleSaveTeamDetails = async () => {
    if (!editTeamName.trim()) return;
    setTeamError(""); setTeamSuccess("");
    try {
      await api.put(`/projects/${project?._id}`, {
        teamName: editTeamName,
        teamLogo: editTeamLogo,
        description: editTeamDesc,
      });
      setTeamSuccess("Team details updated successfully!");
      fetchProjectDetails();
    } catch (err) {
      setTeamError(err.response?.data?.message || "Failed to update team details.");
    }
  };

  // ── Invite Tab functions ─────────────────────────────────────────
  const handleEmailInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError(""); setInviteSuccess("");
    try {
      const res = await api.post(`/projects/${project?._id}/invites/email`, {
        email: inviteEmail,
        role: inviteRole,
        workRole: inviteWorkRole,
      });
      setInviteSuccess(res.data.message || `Invite sent to ${inviteEmail}!`);
      setInviteEmail("");
      fetchProjectDetails();
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to send email invite.");
    }
  };

  const handleGenerateLink = async () => {
    setInviteError(""); setInviteSuccess("");
    try {
      const res = await api.post(`/projects/${project?._id}/invites/link`, {
        role: inviteRole,
        workRole: inviteWorkRole,
      });
      setInviteLink(res.data.link);
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to generate link.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await api.delete(`/projects/${project?._id}/invites/pending/${inviteId}`);
      setInviteSuccess("Invitation cancelled.");
      fetchProjectDetails();
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to cancel invitation.");
    }
  };

  // ── Members Tab functions ────────────────────────────────────────
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this member from the project and team?")) return;
    try {
      await api.delete(`/projects/${project?._id}/members/${memberId}`);
      fetchProjectDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (memberId, field, value) => {
    try {
      await api.put(`/projects/${project?._id}/members/${memberId}/role`, {
        [field]: value,
      });
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to change role");
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferUserId) return;
    try {
      await api.post(`/projects/${project?._id}/transfer`, { targetUserId: transferUserId });
      setShowTransferModal(false);
      setTransferUserId("");
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to transfer ownership");
    }
  };

  // ── Settings Tab functions ───────────────────────────────────────
  const handleSaveProjectSettings = async () => {
    if (!editProjName.trim()) return;
    setSettingsSuccess("");
    try {
      await api.put(`/projects/${project?._id}`, {
        projectName: editProjName,
        description: editProjDesc,
        priority: editProjPrio,
        status: editProjStatus,
        deadline: editProjDeadline,
      });
      setSettingsSuccess("Project settings saved!");
      fetchProjectDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save settings");
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("CRITICAL: Delete this project entirely? All workspace files and task data will be permanently erased.")) return;
    try {
      await api.delete(`/projects/${project?._id}`);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project");
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const activeFile = openFiles.find((f) => f.path === activeFilePath) || null;
  const filteredMembers = (project?.members || []).filter((m) => {
    const name = m.user?.name || "";
    const email = m.user?.email || "";
    return name.toLowerCase().includes(memberSearch.toLowerCase()) ||
           email.toLowerCase().includes(memberSearch.toLowerCase());
  });

  const sidebarLinks = [
    { key: "overview", label: "Overview", icon: "⬡" },
    { key: "team",     label: "Team details", icon: "👥" },
    { key: "invite",   label: "Invite Members", icon: "✉" },
    { key: "members",  label: "Members List", icon: "👤" },
    { key: "tasks",    label: "Task Board", icon: "📋" },
    { key: "chat",     label: "Chat Room", icon: "💬" },
    { key: "files",    label: "Files & Editor", icon: "💻" },
    { key: "settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="page-container flex overflow-hidden bg-gray-950 text-gray-100"
      style={{ height: "100vh" }}>

      {/* ── Main Panel Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-950">
        
        {/* Render editor tabs header ONLY when files tab is active */}
        {activeTab === "files" && (
          <div className="flex items-center justify-between flex-shrink-0 bg-gray-900 border-b border-gray-800 pr-4" style={{ height: 35 }}>
            <EditorTabs openFiles={openFiles} activeFilePath={activeFilePath} onSelect={setActiveFilePath} onClose={closeFile} />
            <div className="flex items-center gap-2">
              {activeFile && canRun(activeFile.language) && (
                <>
                  {runError && <span className="text-[10px] text-red-400">{runError}</span>}
                  <button onClick={handleRunCode} disabled={isRunning}
                    className="text-[10px] px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 font-bold transition-colors disabled:opacity-50">
                    {isRunning ? "Running…" : "▶ Run"}
                  </button>
                </>
              )}
              {saving && <span className="text-[10px] animate-pulse text-gray-500">Saving…</span>}
            </div>
          </div>
        )}

        {/* Active Tab View */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "overview" && (
            <div className="p-6 overflow-y-auto h-full max-w-4xl mx-auto space-y-6">
              <div className="card p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white mb-2">{project?.projectName}</h1>
                  <p className="text-xs text-gray-500 max-w-xl">{project?.description || "No description provided."}</p>
                </div>
                <div className="flex gap-2">
                  <span className={PRIORITY_CLASS[project?.priority] || "badge"}>{project?.priority}</span>
                  <span className={STATUS_CLASS[project?.status] || "badge"}>{project?.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 text-center">
                  <p className="text-2xl font-bold text-purple-400">{project?.members?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Team Members</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{project?.teamName || "Unnamed"}</p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Team Name</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {project?.deadline ? new Date(project.deadline).toLocaleDateString() : "No Limit"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Project Deadline</p>
                </div>
              </div>

              {project?.teamLogo && (
                <div className="card p-6 flex items-center gap-4">
                  <img src={project.teamLogo} alt="Team Logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-800" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Project Team</h3>
                    <p className="text-xs text-gray-500 mt-1">{project.teamName}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "team" && (
            <div className="p-6 overflow-y-auto h-full max-w-md mx-auto space-y-6">
              <h2 className="text-md font-bold text-white">👥 Team Details Settings</h2>
              {teamError && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-lg p-2">{teamError}</p>}
              {teamSuccess && <p className="text-xs text-green-400 bg-green-950/20 border border-green-900 rounded-lg p-2">{teamSuccess}</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Team Name *</label>
                  <input type="text" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} disabled={!hasManagementAccess} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Team Description</label>
                  <textarea rows={3} value={editTeamDesc} onChange={e => setEditTeamDesc(e.target.value)} disabled={!hasManagementAccess} className="input-base resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Team Logo</label>
                  {hasManagementAccess && (
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="input-base text-xs mb-3" />
                  )}
                  {editTeamLogo && (
                    <img src={editTeamLogo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border border-gray-800" />
                  )}
                </div>

                {hasManagementAccess && (
                  <button onClick={handleSaveTeamDetails} className="btn-primary text-xs w-full py-2.5">
                    Save Team Details
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "invite" && (
            <div className="p-6 overflow-y-auto h-full max-w-lg mx-auto space-y-6">
              <h2 className="text-md font-bold text-white">✉ Invite Team Members</h2>
              {inviteError && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-lg p-2">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-green-400 bg-green-950/20 border border-green-900 rounded-lg p-2">{inviteSuccess}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Permission Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} disabled={!hasManagementAccess} className="input-base">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Work Role</label>
                  <select value={inviteWorkRole} onChange={e => setInviteWorkRole(e.target.value)} disabled={!hasManagementAccess} className="input-base">
                    {WORK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {hasManagementAccess && (
                <>
                  <div className="border-t border-gray-800 pt-4 space-y-3">
                    <label className="text-xs font-semibold text-gray-400 block">Invite by Email</label>
                    <div className="flex gap-2">
                      <input type="email" placeholder="collaborator@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="input-base flex-1" />
                      <button onClick={handleEmailInvite} className="btn-primary text-xs whitespace-nowrap px-4">
                        Send
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-4 space-y-3">
                    <label className="text-xs font-semibold text-gray-400 block">Generate Link</label>
                    {inviteLink ? (
                      <div className="flex gap-2">
                        <input type="text" readOnly value={inviteLink} className="input-base flex-1 text-xs select-all bg-gray-950" />
                        <button onClick={handleCopyLink} className="btn-ghost text-xs whitespace-nowrap px-4">
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleGenerateLink} className="btn-ghost text-xs w-full py-2">
                        Generate Invite Link
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Pending Invites list */}
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <label className="text-xs font-semibold text-gray-400 block">Pending Invitations ({project?.pendingInvites?.length || 0})</label>
                <div className="space-y-2">
                  {project?.pendingInvites?.length === 0 ? (
                    <p className="text-xs text-gray-600">No pending invites.</p>
                  ) : (
                    project?.pendingInvites?.map(inv => (
                      <div key={inv._id} className="flex justify-between items-center bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div>
                          <p className="text-xs text-white font-bold">{inv.email}</p>
                          <p className="text-[10px] text-purple-400 font-semibold">{inv.workRole} · {inv.role}</p>
                        </div>
                        {hasManagementAccess && (
                          <button onClick={() => handleCancelInvite(inv._id)} className="text-xs text-red-400 hover:underline">
                            Cancel
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="p-6 overflow-y-auto h-full max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-md font-bold text-white">👤 Team Members List</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="input-base text-xs py-1.5 w-full sm:w-64" />
                  {isOwner && (
                    <button onClick={() => setShowTransferModal(true)} className="btn-ghost text-xs whitespace-nowrap px-4 py-1.5 border border-purple-800">
                      Transfer Ownership
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {filteredMembers.map((m) => {
                  const memberUser = m.user;
                  const isOnline = members.some((online) => online.userId === memberUser?._id);
                  const isSelf = memberUser?._id === user?._id;
                  const showActions = hasManagementAccess && !isSelf && m.role !== "owner";

                  return (
                    <div key={m._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-800 flex items-center justify-center font-bold text-purple-200">
                            {memberUser?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isOnline ? "bg-green-500" : "bg-gray-600"}`} />
                        </div>
                        <div>
                          <p className="text-xs text-white font-bold">{memberUser?.name} {isSelf && <span className="text-gray-500">(you)</span>}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{memberUser?.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Permission Role */}
                        {showActions ? (
                          <select value={m.role} onChange={e => handleRoleChange(memberUser?._id, "role", e.target.value)} className="input-base text-xs py-1 w-24">
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className="badge badge-active">{m.role}</span>
                        )}

                        {/* Work Role Designation */}
                        {showActions ? (
                          <select value={m.workRole} onChange={e => handleRoleChange(memberUser?._id, "workRole", e.target.value)} className="input-base text-xs py-1 w-36">
                            {WORK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className="badge">{m.workRole}</span>
                        )}

                        {showActions && (
                          <button onClick={() => handleRemoveMember(memberUser?._id)} className="text-xs bg-red-950/50 hover:bg-red-900/50 border border-red-900 text-red-300 px-3 py-1 rounded-lg font-bold">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="flex-1 overflow-hidden h-full">
              <KanbanBoard workspaceId={workspaceId} members={project?.members?.map(m => m.user).filter(Boolean) || []} />
            </div>
          )}

          {activeTab === "chat" && (
            <div className="p-6 h-full max-w-3xl mx-auto flex flex-col">
              <div className="flex-1 border border-gray-800 rounded-2xl bg-gray-900 overflow-hidden h-full">
                <ChatBox messages={messages} onSend={sendChat} currentUser={user} />
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="flex-1 flex overflow-hidden h-full" style={{ fontFamily: "Consolas, 'JetBrains Mono', monospace" }}>
              {sidebarOpen && (
                <>
                  <div style={{ width: sidebarW, minWidth: 150, maxWidth: 400, flexShrink: 0, borderRight: "1px solid #252526", display: "flex", flexDirection: "column" }}>
                    <div className="flex-1 overflow-hidden flex flex-col bg-[#252526]">
                      <FileExplorer workspaceId={workspaceId} fs={fs} onOpenFile={openFile} />
                    </div>
                    <div className="flex-shrink-0 border-t p-2" style={{ borderColor: "#252526", background: "#252526" }}>
                      <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: "#858585" }}>
                        Online — {members.length}
                      </p>
                      <div className="flex flex-col gap-1">
                        {members.map((m, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: m.color, color: "#1e1e1e" }}>
                              {m.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-[10px] flex-1 truncate" style={{ color: "#cccccc" }}>{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div onMouseDown={handleSidebarResizeDrag}
                    className="w-1 flex-shrink-0 cursor-col-resize transition-colors"
                    style={{ background: "#2d2d2d" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#007acc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#2d2d2d")} />
                </>
              )}

              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <button onClick={() => setSidebarOpen((v) => !v)}
                  className="absolute left-0 top-1/2 z-10 w-4 h-12 flex items-center justify-center rounded-r transition-colors"
                  style={{ background: "#3c3c3c", color: "#858585", transform: "translateY(-50%)", marginLeft: sidebarOpen ? sidebarW : 0 }}
                  title={sidebarOpen ? "Close sidebar" : "Open sidebar"}>
                  {sidebarOpen ? "‹" : "›"}
                </button>

                {openFiles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4"
                    style={{ background: "#1e1e1e" }}>
                    <div className="text-5xl mb-2">💻</div>
                    <p className="text-sm" style={{ color: "#858585" }}>No file is open</p>
                    <p className="text-xs" style={{ color: "#555" }}>Select a file from the Explorer or create a new one</p>
                    <button onClick={() => fs.createFile("main.py", '# Hello World\nprint("Hello, DevCollab!")\n')}
                      className="text-xs px-4 py-2 rounded" style={{ background: "#0e639c", color: "#fff" }}>
                      + New Python File
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden" style={{ height: terminalOpen ? `calc(100% - ${terminalHeight}px - 29px)` : "100%" }}>
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
                )}

                <AnimatePresence>
                  {terminalOpen && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: terminalHeight }} exit={{ height: 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="flex flex-col flex-shrink-0 overflow-hidden"
                      style={{ borderTop: "1px solid #252526" }}
                    >
                      <ResizeHandle onMouseDown={handleTermResizeDrag} />
                      <div className="flex-1 overflow-hidden">
                        <RealTerminal ref={terminalRef} workspaceId={workspaceId} userId={user?._id} onFsChanged={() => fs.refresh()} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between px-3 flex-shrink-0"
                  style={{ background: "#007acc", height: 22, minHeight: 22 }}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTerminalOpen((v) => !v)}
                      className="text-[10px] font-medium flex items-center gap-1 hover:bg-white/20 px-2 rounded transition-colors"
                      style={{ color: "#fff", height: "100%" }}>
                      ⌨ {terminalOpen ? "Hide Terminal" : "Show Terminal"}
                    </button>
                    {isConnected ? <span className="text-[10px] flex items-center gap-1" style={{ color: "#cef9ce" }}><span className="w-1.5 h-1.5 rounded-full bg-green-300" />Live</span> : <span className="text-[10px]" style={{ color: "#fecaca" }}>Offline</span>}
                  </div>
                  {activeFile && (
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {activeFile.language} · {activeFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="p-6 overflow-y-auto h-full max-w-md mx-auto space-y-6">
              <h2 className="text-md font-bold text-white">⚙ Project Settings</h2>
              {settingsSuccess && <p className="text-xs text-green-400 bg-green-950/20 border border-green-900 rounded-lg p-2">{settingsSuccess}</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Project Name *</label>
                  <input type="text" value={editProjName} onChange={e => setEditProjName(e.target.value)} disabled={!hasManagementAccess} className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Description</label>
                  <textarea rows={3} value={editProjDesc} onChange={e => setEditProjDesc(e.target.value)} disabled={!hasManagementAccess} className="input-base resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                    <select value={editProjPrio} onChange={e => setEditProjPrio(e.target.value)} disabled={!hasManagementAccess} className="input-base">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Status</label>
                    <select value={editProjStatus} onChange={e => setEditProjStatus(e.target.value)} disabled={!hasManagementAccess} className="input-base">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-500">Deadline</label>
                  <input type="date" value={editProjDeadline} onChange={e => setEditProjDeadline(e.target.value)} disabled={!hasManagementAccess} className="input-base" />
                </div>

                {hasManagementAccess && (
                  <button onClick={handleSaveProjectSettings} className="btn-primary text-xs w-full py-2.5">
                    Save Project Settings
                  </button>
                )}

                {isOwner && (
                  <div className="border-t border-gray-800 pt-5">
                    <button onClick={handleDeleteProject} className="btn-primary bg-red-950 hover:bg-red-900 border border-red-900 text-red-300 text-xs w-full py-2.5">
                      Delete Project Completely
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">👑 Transfer Project Ownership</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Select a member to transfer ownership to. This action will demote you to an Admin role and is irreversible.
            </p>
            <select value={transferUserId} onChange={e => setTransferUserId(e.target.value)} className="input-base">
              <option value="">Select new owner...</option>
              {project?.members?.filter(m => m.user?._id !== user?._id).map(m => (
                <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowTransferModal(false); setTransferUserId(""); }} className="btn-ghost flex-1 py-2 text-xs">Cancel</button>
              <button onClick={handleTransferOwnership} disabled={!transferUserId} className="btn-primary bg-purple-900 flex-1 py-2 text-xs">
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant currentCode={activeFile?.content || ""} currentLanguage={activeFile?.language || "javascript"} />
    </div>
  );
}