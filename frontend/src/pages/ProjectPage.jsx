// frontend/src/pages/ProjectPage.jsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

// ── Priority / Status styles ───────────────────────────────────────────
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

const EMPTY_FORM = {
  title: "", description: "", techStack: "",
  githubRepo: "", priority: "medium", deadline: "", status: "active",
};

// ── Avatar Stack ───────────────────────────────────────────────────────
function AvatarStack({ members = [], max = 4 }) {
  const shown = members.slice(0, max);
  const rest  = members.length - max;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m, i) => (
        <div key={i}
          title={m?.name}
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", borderColor: "var(--bg-card)", color: "white", zIndex: shown.length - i }}>
          {m?.name?.[0]?.toUpperCase() || "?"}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
          style={{ background: "var(--bg-overlay)", borderColor: "var(--bg-card)", color: "var(--text-muted)" }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────
function ProjectCard({ project, currentUser, onDelete, onEdit, onOpen }) {
  const isOwner  = project.owner?._id === currentUser?._id;
  const overdue  = project.deadline && new Date(project.deadline) < new Date();
  const members  = [project.owner, ...(project.collaborators || [])].filter(Boolean);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card card-interactive p-5 flex flex-col gap-4 relative group"
      onClick={() => onOpen?.(project.workspace?._id || project._id)}
    >
      {/* Owner crown */}
      {isOwner && (
        <div className="absolute top-3 right-3 text-sm" title="You own this project">👑</div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-8 mb-1.5">
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 flex-1 group-hover:text-purple-300 transition-colors">
            {project.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={PRIORITY_CLASS[project.priority] || "badge"}>{project.priority}</span>
          <span className={STATUS_CLASS[project.status]   || "badge"}>{project.status}</span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {project.description}
        </p>
      )}

      {/* Tech stack */}
      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.techStack.slice(0, 5).map((t, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
              {t}
            </span>
          ))}
          {project.techStack.length > 5 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--text-muted)" }}>
              +{project.techStack.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border-muted)" }}>
        <AvatarStack members={members} />

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isOwner && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(project); }}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors font-medium"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(project._id); }}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors font-medium"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}
              >
                Delete
              </button>
            </>
          )}
          {project.workspace?._id && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpen?.(project.workspace._id); }}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}
            >
              Open →
            </button>
          )}
        </div>
      </div>

      {/* Deadline */}
      {project.deadline && (
        <p className="text-[10px] font-medium" style={{ color: overdue ? "#f87171" : "var(--text-muted)" }}>
          {overdue ? "⚠ Overdue · " : "Due "}{new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
    </motion.div>
  );
}

// ── Project Form Modal ─────────────────────────────────────────────────
function ProjectModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            title:       initial.title || "",
            description: initial.description || "",
            techStack:   (initial.techStack || []).join(", "),
            githubRepo:  initial.githubRepo || "",
            priority:    initial.priority || "medium",
            deadline:    initial.deadline ? initial.deadline.slice(0, 10) : "",
            status:      initial.status || "active",
          }
        : EMPTY_FORM
      );
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        techStack: form.techStack ? form.techStack.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="w-full max-w-lg rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border-strong)" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              {initial ? "Edit Project" : "Create Project"}
            </h2>
            <button onClick={onClose} className="text-xl" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>

          <div className="space-y-4">
            {[
              { label: "Project name *", key: "title", placeholder: "My awesome project" },
              { label: "Description", key: "description", placeholder: "What are you building?" },
              { label: "Tech stack (comma-separated)", key: "techStack", placeholder: "React, Node.js, MongoDB" },
              { label: "GitHub repository", key: "githubRepo", placeholder: "https://github.com/..." },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</label>
                {key === "description" ? (
                  <textarea
                    rows={3}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-base resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-base"
                  />
                )}
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-base">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-base">
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="input-base" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-primary flex-1">
              {saving ? "Saving…" : initial ? "Save changes" : "Create project"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function ProjectPage() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();

  const [tab, setTab]                 = useState("mine");  // "mine" | "shared"
  const [owned, setOwned]             = useState([]);
  const [shared, setShared]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [ownedRes, sharedRes] = await Promise.all([
        api.get("/projects/owned"),
        api.get("/projects/shared"),
      ]);
      setOwned(ownedRes.data);
      setShared(sharedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // ── Actions ────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    await api.post("/projects", form);
    fetchProjects();
  };

  const handleEdit = async (form) => {
    await api.put(`/projects/${editTarget._id}`, form);
    setEditTarget(null);
    fetchProjects();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    await api.delete(`/projects/${id}`);
    fetchProjects();
  };

  const handleOpen = (workspaceId) => {
    if (workspaceId) navigate(`/workspace/${workspaceId}`);
  };

  // ── Filtered data ──────────────────────────────────────────────────
  const currentList = (tab === "mine" ? owned : shared).filter(
    p => filterStatus === "all" || p.status === filterStatus
  );

  const tabs = [
    { key: "mine",   label: "My Projects",    count: owned.length },
    { key: "shared", label: "Shared With Me", count: shared.length },
  ];

  return (
    <div className="page-container">
      <div className="content-container">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>Projects</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your workspaces are private — only invited members can access them.
            </p>
          </div>
          <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="btn-primary">
            + New Project
          </button>
        </motion.div>

        {/* ── Tabs + Filter ── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-raised)", border: "1px solid var(--border-muted)" }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: tab === t.key ? "white" : "var(--text-muted)" }}
              >
                {tab === t.key && (
                  <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-lg bg-brand" style={{ zIndex: 0 }} />
                )}
                <span className="relative z-10">{t.label}</span>
                <span className="relative z-10 ml-2 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.1)", color: tab === t.key ? "white" : "var(--text-muted)" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-base w-36 py-2 text-sm"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* ── Project Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
              {tab === "mine" ? "◈" : "✉"}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {tab === "mine" ? "No projects yet" : "No shared projects"}
            </h3>
            <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
              {tab === "mine"
                ? "Create your first project and invite team members to collaborate."
                : "When someone invites you to their project and you accept, it'll appear here."}
            </p>
            {tab === "mine" && (
              <button onClick={() => setShowModal(true)} className="btn-primary mt-6">
                + Create your first project
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {currentList.map(project => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  currentUser={user}
                  onEdit={p => { setEditTarget(p); setShowModal(true); }}
                  onDelete={handleDelete}
                  onOpen={handleOpen}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Modal ── */}
      <ProjectModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSave={editTarget ? handleEdit : handleCreate}
        initial={editTarget}
      />
    </div>
  );
}
