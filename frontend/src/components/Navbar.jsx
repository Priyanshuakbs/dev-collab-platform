import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "./ui";
import NotificationBell from "./NotificationBell";
import API from "../services/api";

const GLOBAL_LINKS = [
  { path: "/dashboard",   label: "Dashboard",   icon: "⬡" },
  { path: "/projects",    label: "Projects",    icon: "◈" },
  { path: "/invitations", label: "Invitations", icon: "✉" },
  { path: "/profile",     label: "Profile",     icon: "◉" },
];

const WORKSPACE_TABS = [
  { key: "overview", label: "Overview", icon: "⬡" },
  { key: "team",     label: "Team details", icon: "👥" },
  { key: "invite",   label: "Invite Members", icon: "✉" },
  { key: "members",  label: "Members List", icon: "👤" },
  { key: "tasks",    label: "Task Board", icon: "📋" },
  { key: "chat",     label: "Chat Room", icon: "💬" },
  { key: "files",    label: "Files & Editor", icon: "💻" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

export default function Navbar({ user, onLogout, variant = "protected" }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState("");
  const isPublic = variant === "public";

  // Parse active workspace ID from URL path if present
  const match = location.pathname.match(/\/workspace\/([a-f0-9]+)/);
  const activeWorkspaceId = match ? match[1] : null;

  useEffect(() => {
    if (user && !isPublic) {
      API.get("/workspaces")
        .then(res => setWorkspaces(res.data))
        .catch(() => {});
    }
  }, [user, isPublic, activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      API.get(`/workspaces/${activeWorkspaceId}`)
        .then(res => setActiveWorkspaceName(res.data.name))
        .catch(() => setActiveWorkspaceName("Active Workspace"));
    } else {
      setActiveWorkspaceName("");
    }
  }, [activeWorkspaceId]);

  const handleLogout = () => {
    onLogout?.();
    navigate("/login");
  };

  // Parse tab search param for highlighting active workspace link
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "overview";

  // Public/unauthenticated topbar
  if (isPublic || !user) {
    return (
      <nav className="fixed top-0 left-0 right-0 h-14 z-[100] bg-[#09090f]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-sm shadow-md">D</div>
          <span className="font-bold text-sm text-white">Dev<span className="text-purple-400">Collab</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-xs text-gray-400 hover:text-white px-3 py-1.5 transition-colors">Sign In</Link>
          <Link to="/register" className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-4 py-1.5 rounded-xl transition-colors">Get Started →</Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* ── Desktop Left Sidebar ── */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-60 h-screen bg-[#0b0b14] border-r border-white/5 z-[100] p-4 justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Brand Header */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group px-2 py-1">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 0 16px rgba(124,58,237,0.5)" }}
            >
              D
            </motion.div>
            <span className="text-sm font-bold text-white tracking-tight">
              Dev<span style={{ color: "#a78bfa" }}>Collab</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-1">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Navigation</span>
            <nav className="flex flex-col gap-0.5">
              {GLOBAL_LINKS.map(({ path, label, icon }) => {
                const active = location.pathname === path;
                return (
                  <Link key={path} to={path} className="relative px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors group flex items-center gap-2.5"
                    style={{ color: active ? "#c4b5fd" : "#6b7280" }}>
                    {active && (
                      <motion.span
                        layoutId="sidebar-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2.5">
                      <span className="text-sm opacity-85">{icon}</span>
                      <span>{label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Active Workspace / Project Section */}
          {activeWorkspaceId && (
            <div className="space-y-1 pt-2 border-t border-white/5">
              <div className="px-2.5 pb-1 flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-purple-950/60 border border-purple-800 text-purple-300 flex items-center justify-center font-bold text-[10px]">W</div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 truncate max-w-40">{activeWorkspaceName || "Workspace"}</span>
              </div>
              <nav className="flex flex-col gap-0.5 pl-3">
                {WORKSPACE_TABS.map(({ key, label, icon }) => {
                  const active = activeTab === key;
                  return (
                    <Link 
                      key={key} 
                      to={`/workspace/${activeWorkspaceId}?tab=${key}`} 
                      className="relative px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-2"
                      style={{ color: active ? "#c4b5fd" : "#5a5672" }}
                    >
                      {active && (
                        <motion.span
                          layoutId="workspace-tab-pill"
                          className="absolute inset-0 rounded-lg"
                          style={{ background: "rgba(124,58,237,0.08)" }}
                        />
                      )}
                      <span className="relative flex items-center gap-2">
                        <span className="text-xs opacity-75">{icon}</span>
                        <span>{label}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Workspaces Switcher Section */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">My Workspaces</span>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto px-1.5">
              {workspaces.map(ws => {
                const isActive = ws._id === activeWorkspaceId;
                return (
                  <Link 
                    key={ws._id} 
                    to={`/workspace/${ws._id}`} 
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${isActive ? "text-purple-400 bg-purple-500/10 border border-purple-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                  >
                    <div className="w-4.5 h-4.5 rounded bg-brand flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white">
                      {ws.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* User profile & controls at bottom */}
        <div className="space-y-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={user?.name || "U"} size="sm" status="online" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{user?.name || "User"}</p>
                <p className="text-[9px] text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <NotificationBell />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
          >
            <span>⏻</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile Topbar ── */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-14 z-[100] bg-[#0b0b14]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-sm shadow-md">D</div>
          <span className="font-bold text-xs text-white">Dev<span className="text-purple-400">Collab</span></span>
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 border border-white/5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <motion.path animate={{ d: mobileOpen ? "M2 2l10 10" : "M2 3h10" }} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {!mobileOpen && <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
              <motion.path animate={{ d: mobileOpen ? "M12 2L2 12" : "M2 11h10" }} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-14 right-0 bottom-0 w-64 z-[99] md:hidden bg-[#0b0b14] border-l border-white/5 p-4 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Navigation</span>
              <div className="space-y-1">
                {GLOBAL_LINKS.map(({ path, label, icon }) => {
                  const active = location.pathname === path;
                  return (
                    <Link key={path} to={path}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ color: active ? "#c4b5fd" : "#6b7280", background: active ? "rgba(124,58,237,0.12)" : "transparent" }}
                    >
                      <span>{icon}</span> {label}
                    </Link>
                  );
                })}
              </div>

              {activeWorkspaceId && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">{activeWorkspaceName}</span>
                  <div className="space-y-1 pl-2">
                    {WORKSPACE_TABS.map(({ key, label, icon }) => {
                      const active = activeTab === key;
                      return (
                        <Link 
                          key={key} 
                          to={`/workspace/${activeWorkspaceId}?tab=${key}`} 
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ color: active ? "#c4b5fd" : "#5a5672", background: active ? "rgba(124,58,237,0.08)" : "transparent" }}
                        >
                          <span>{icon}</span> {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/10"
            >
              <span>⏻</span> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
