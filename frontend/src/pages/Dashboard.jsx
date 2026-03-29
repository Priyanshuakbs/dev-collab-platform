// frontend/src/pages/Dashboard.jsx

import { useEffect, useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import ProjectCard from "../components/ProjectCard";
import socket from "../socket/socket";

// ── Online Status Hook ────────────────────────────────────────────────
const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    socket.on("globalOnlineUsers", (users) => setOnlineUsers(users));
    socket.emit("getOnlineUsers");
    return () => socket.off("globalOnlineUsers");
  }, []);

  return onlineUsers;
};

// ── Activity Item ─────────────────────────────────────────────────────
function ActivityItem({ icon, text, time, color = "bg-emerald-500" }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800 last:border-0">
      <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-xs flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
        <p className="text-xs text-gray-600 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ── Time ago helper ───────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default function Dashboard() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const onlineUsers = useOnlineUsers();

  const [workspaces,  setWorkspaces]  = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [activities,  setActivities]  = useState([]);
  const [wsName,      setWsName]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [wsRes, projRes, notifRes] = await Promise.all([
        API.get("/workspaces"),
        API.get("/projects/mine"),
        API.get("/notifications").catch(() => ({ data: [] })),
      ]);
      setWorkspaces(wsRes.data);
      setProjects(projRes.data);

      // Build activity feed from notifications
      const acts = notifRes.data.slice(0, 10).map((n) => ({
        id:    n._id,
        icon:  getActivityIcon(n.type),
        text:  n.message,
        time:  timeAgo(n.createdAt),
        color: getActivityColor(n.type),
        read:  n.read,
      }));

      // Add project/workspace creation as activities
      wsRes.data.slice(0, 3).forEach((w) => {
        acts.push({
          id:    w._id + "_ws",
          icon:  "🏠",
          text:  `Workspace "${w.name}" created`,
          time:  timeAgo(w.createdAt),
          color: "bg-blue-800",
          read:  true,
        });
      });

      // Sort by recency (most recent first)
      acts.sort((a, b) => {
        const parseTime = (t) => {
          if (t === "just now") return 0;
          if (t.endsWith("m ago")) return parseInt(t) * 60000;
          if (t.endsWith("h ago")) return parseInt(t) * 3600000;
          return parseInt(t) * 86400000;
        };
        return parseTime(a.time) - parseTime(b.time);
      });

      setActivities(acts.slice(0, 8));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const map = {
      invitation_received: "📩",
      invitation_accepted: "✅",
      invitation_rejected: "❌",
      project_joined:      "🚀",
      task_assigned:       "📋",
      task_completed:      "🎉",
      workspace_joined:    "👥",
      file_created:        "📄",
    };
    return map[type] || "🔔";
  };

  const getActivityColor = (type) => {
    const map = {
      invitation_received: "bg-purple-800",
      invitation_accepted: "bg-emerald-800",
      invitation_rejected: "bg-red-900",
      project_joined:      "bg-blue-800",
      task_assigned:       "bg-yellow-800",
      task_completed:      "bg-emerald-800",
    };
    return map[type] || "bg-gray-700";
  };

  const createWorkspace = async () => {
    if (!wsName.trim()) return;
    try {
      setCreating(true);
      await API.post("/workspaces", { name: wsName });
      setWsName("");
      loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") createWorkspace(); };

  const stats = [
    { label: "Workspaces", value: workspaces.length,                                         color: "text-blue-400"    },
    { label: "Projects",   value: projects.length,                                            color: "text-purple-400"  },
    { label: "Active",     value: projects.filter((p) => p.status === "active").length,       color: "text-emerald-400" },
    { label: "Completed",  value: projects.filter((p) => p.status === "completed").length,    color: "text-yellow-400"  },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Welcome ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">
              Welcome back, <span className="text-emerald-400">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Here's what's happening in your workspace</p>
          </div>
          <div className="flex gap-2">
            <Link to="/projects"
              className="text-xs px-4 py-2 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-lg transition-colors">
              All Projects
            </Link>
            <Link to="/invitations"
              className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
              + Invite Team
            </Link>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Activity + Online Users ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Activity Feed */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-gray-500 uppercase tracking-widest">Recent Activity</h2>
              <span className="text-xs text-gray-600">{activities.length} events</span>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">📊</p>
                <p className="text-xs text-gray-600">No activity yet</p>
                <p className="text-xs text-gray-700 mt-1">Start collaborating to see activity here</p>
              </div>
            ) : (
              <div>
                {activities.map((act) => (
                  <ActivityItem
                    key={act.id}
                    icon={act.icon}
                    text={act.text}
                    time={act.time}
                    color={act.color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Online Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-gray-500 uppercase tracking-widest">Online Now</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-emerald-400">{onlineUsers.length} online</span>
              </div>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">👤</p>
                <p className="text-xs text-gray-600">No one online right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map((u, i) => (
                  <Link key={i} to={`/profile/${u.userId}`}
                    className="flex items-center gap-3 py-2 hover:bg-gray-800 rounded-lg px-2 transition-colors group">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-gray-900"
                        style={{ background: u.color || "#10b981" }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 group-hover:text-white transition-colors truncate">
                        {u.name} {u.userId === user?._id && <span className="text-gray-600">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{u.status || "online"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* My status */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-600 mb-2">Your status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-xs text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Create Workspace ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3">New Workspace</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Workspace name..."
              className="flex-1 bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none placeholder-gray-600 transition-colors"
            />
            <button onClick={createWorkspace} disabled={creating || !wsName.trim()}
              className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg transition-colors">
              {creating ? "Creating..." : "Create →"}
            </button>
          </div>
        </div>

        {/* ── Workspaces ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-widest">Workspaces</h2>
            <span className="text-xs text-gray-600">{workspaces.length} total</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-10 bg-gray-900 border border-gray-800 rounded-2xl">
              <p className="text-gray-600 text-sm">No workspaces yet</p>
              <p className="text-xs text-gray-700 mt-1">Create one above to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workspaces.map((w) => (
                <div key={w._id} onClick={() => navigate(`/workspace/${w._id}`)}
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-700 rounded-xl p-4 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 bg-emerald-900 border border-emerald-700 rounded-lg flex items-center justify-center text-emerald-300 font-bold text-sm mb-3">
                      {w.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600 group-hover:text-emerald-500 transition-colors">→</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{w.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── My Projects ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-widest">My Projects</h2>
            <Link to="/projects" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              View all →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-10 bg-gray-900 border border-gray-800 rounded-2xl">
              <p className="text-gray-600 text-sm">No projects yet</p>
              <Link to="/projects" className="text-xs text-emerald-400 hover:underline mt-1 block">
                Create your first project →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((p) => (
                <ProjectCard key={p._id} project={p} currentUser={user}
                  onOpen={(id) => navigate(`/workspace/${id}`)} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
