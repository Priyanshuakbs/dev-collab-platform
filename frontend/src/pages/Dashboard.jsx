// frontend/src/pages/Dashboard.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import socket from "../socket/socket";

// ── Online users via socket ───────────────────────────────────────────
const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  useEffect(() => {
    socket.on("globalOnlineUsers", (users) => setOnlineUsers(users));
    socket.emit("getOnlineUsers");
    return () => socket.off("globalOnlineUsers");
  }, []);
  return onlineUsers;
};

const timeAgo = (date) => {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, loading }) {
  return (
    <div className="card p-5">
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-16 h-7 rounded" />
          <div className="skeleton w-24 h-4 rounded" />
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg"
            style={{ background: `${color}1a`, color }}>
            {icon}
          </div>
          <p className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: "-0.03em" }}>{value}</p>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
        </>
      )}
    </div>
  );
}

// ── Workspace Card ────────────────────────────────────────────────────
function WorkspaceCard({ ws, onClick }) {
  const memberCount = ws.members?.length || 1;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => onClick(ws._id)}
      className="card card-interactive p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
          {ws.name?.[0]?.toUpperCase()}
        </div>
        <span className="text-lg group-hover:text-purple-400 transition-colors" style={{ color: "var(--text-muted)" }}>→</span>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 truncate">{ws.name}</h3>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {memberCount} member{memberCount !== 1 ? "s" : ""} · {timeAgo(ws.createdAt)}
      </p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user }    = useContext(AuthContext);
  const navigate    = useNavigate();
  const onlineUsers = useOnlineUsers();

  const [workspaces,  setWorkspaces]  = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [activities,  setActivities]  = useState([]);
  const [wsName,      setWsName]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [wsError,     setWsError]     = useState("");
  const [wsSuccess,   setWsSuccess]   = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wsRes, projRes, notifRes] = await Promise.all([
        API.get("/workspaces"),
        API.get("/projects/owned"),  // SECURITY: only user's own projects
        API.get("/notifications").catch(() => ({ data: [] })),
      ]);
      setWorkspaces(wsRes.data);
      setProjects(projRes.data);
      const acts = notifRes.data.slice(0, 8).map((n) => ({
        id: n._id, text: n.message, time: timeAgo(n.createdAt),
        type: n.type, read: n.read,
      }));
      setActivities(acts);
    } catch (err) {
      console.error("Dashboard loadAll:", err);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    if (!wsName.trim()) return;
    setCreating(true);
    setWsError("");
    try {
      await API.post("/workspaces", { name: wsName });
      setWsName("");
      setWsSuccess("Workspace created!");
      setTimeout(() => setWsSuccess(""), 3000);
      loadAll();
    } catch (err) {
      setWsError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const stats = [
    { label: "Workspaces", value: workspaces.length,                                     icon: "⊞", color: "#60a5fa" },
    { label: "My Projects", value: projects.length,                                       icon: "◈", color: "#a78bfa" },
    { label: "Active",      value: projects.filter(p => p.status === "active").length,   icon: "◉", color: "#34d399" },
    { label: "Online Now",  value: onlineUsers.length,                                    icon: "●", color: "#fbbf24" },
  ];

  return (
    <div className="page-container">
      {/* Subtle grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "linear-gradient(rgba(124,58,237,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.05) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative content-container max-w-7xl">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
              Welcome back, <span className="text-brand">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Here's what's happening across your projects</p>
          </div>
          <div className="flex gap-2">
            <Link to="/invitations">
              <button className="btn-ghost text-sm">✉ Invitations</button>
            </Link>
            <Link to="/projects">
              <button className="btn-primary text-sm">+ New Project</button>
            </Link>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <StatCard {...s} loading={loading} />
            </motion.div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Activity + Workspaces ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Create Workspace */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="card p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                  New Workspace
                </h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                    placeholder="e.g. Frontend Sprint, API v2..."
                    className="input-base flex-1"
                  />
                  <button onClick={createWorkspace} disabled={creating || !wsName.trim()} className="btn-primary whitespace-nowrap">
                    {creating ? "Creating…" : "Create →"}
                  </button>
                </div>
                <AnimatePresence>
                  {wsSuccess && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs mt-2" style={{ color: "#34d399" }}>
                      ✓ {wsSuccess}
                    </motion.p>
                  )}
                  {wsError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs mt-2" style={{ color: "#f87171" }}>
                      ⚠ {wsError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Workspaces */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Workspaces</h2>
                <span className="badge badge-member">{workspaces.length}</span>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
                </div>
              ) : workspaces.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-3xl mb-3">🏗</p>
                  <p className="text-sm font-medium text-white mb-1">No workspaces yet</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Create one above to start coding together</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspaces.map((ws, i) => (
                    <motion.div key={ws._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <WorkspaceCard ws={ws} onClick={(id) => navigate(`/workspace/${id}`)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent Activity */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Recent Activity</h2>
                <span className="badge">{activities.length} events</span>
              </div>
              <div className="card">
                {activities.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-3xl mb-3">📊</p>
                    <p className="text-sm font-medium text-white mb-1">No activity yet</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Invite team members and start collaborating</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--border-muted)" }}>
                    {activities.map((act, i) => (
                      <motion.div key={act.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="flex items-start gap-3 p-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                          style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>◈</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white leading-relaxed">{act.text}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{act.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right: Online + Projects ── */}
          <div className="space-y-6">

            {/* Online Now */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Online Now</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#34d399" }} />
                  <span className="badge badge-active">{onlineUsers.length}</span>
                </div>
              </div>
              <div className="card p-4">
                {onlineUsers.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-2xl mb-2">👤</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No one else online</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {onlineUsers.map((u, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <Link to={`/profile/${u.userId}`}
                          className="flex items-center gap-3 py-2 px-2 rounded-xl transition-colors"
                          style={{ hover: { background: "var(--bg-hover)" } }}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: u.color || "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                              style={{ background: "#34d399", borderColor: "var(--bg-card)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {u.name} {u.userId === user?._id && <span style={{ color: "var(--text-muted)" }}>(you)</span>}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>online</p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* My Projects preview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>My Projects</h2>
                <Link to="/projects" className="text-xs font-medium" style={{ color: "#a78bfa" }}>View all →</Link>
              </div>
              <div className="card">
                {projects.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-2xl mb-2">◈</p>
                    <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>No projects yet</p>
                    <Link to="/projects">
                      <button className="btn-primary text-xs py-2 px-4">Create Project</button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--border-muted)" }}>
                    {projects.slice(0, 5).map((p, i) => (
                      <motion.div key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => p.workspace?._id && navigate(`/workspace/${p.workspace._id}`)}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: p.status === "active" ? "#34d399" : p.status === "completed" ? "#60a5fa" : "#4b5563" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{p.title}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.priority} priority</p>
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}