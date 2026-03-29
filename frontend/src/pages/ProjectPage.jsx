// frontend/src/pages/ProjectPage.jsx

import { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

// ── Helpers ──────────────────────────────────────────────────────────
const PRIORITY_STYLE = {
  high:   "bg-red-900 text-red-300 border-red-700",
  medium: "bg-yellow-900 text-yellow-300 border-yellow-700",
  low:    "bg-gray-800 text-gray-400 border-gray-600",
};

const STATUS_STYLE = {
  active:    "bg-emerald-900 text-emerald-300 border-emerald-700",
  completed: "bg-blue-900 text-blue-300 border-blue-700",
  archived:  "bg-gray-800 text-gray-500 border-gray-600",
};

const EMPTY_FORM = {
  title: "", description: "", techStack: "", githubRepo: "",
  priority: "medium", deadline: "", status: "active",
};

// ── ProjectCard ───────────────────────────────────────────────────────
function ProjectCard({ project, currentUser, onJoin, onLeave, onDelete, onEdit, onOpen }) {
  const isOwner = project.owner?._id === currentUser?._id;
  const isMember = project.collaborators?.some((c) => c._id === currentUser?._id);
  const deadlinePassed = project.deadline && new Date(project.deadline) < new Date();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors group">

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug flex-1">
          {project.title}
        </h3>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[project.priority]}`}>
            {project.priority}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[project.status]}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{project.description}</p>
      )}

      {/* Tech stack */}
      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.techStack.map((t, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-emerald-300">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Deadline */}
      {project.deadline && (
        <p className={`text-xs ${deadlinePassed ? "text-red-400" : "text-gray-500"}`}>
          deadline: {new Date(project.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {deadlinePassed && " (overdue)"}
        </p>
      )}

      {/* Members */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5">
          {[project.owner, ...(project.collaborators || [])].slice(0, 5).map((m, i) => (
            <div key={i} title={m?.name}
              className="w-6 h-6 rounded-full bg-emerald-800 border border-gray-900 flex items-center justify-center text-xs font-bold text-emerald-200 flex-shrink-0">
              {m?.name?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>
        <span className="text-xs text-gray-600">
          {1 + (project.collaborators?.length || 0)} member{(project.collaborators?.length || 0) !== 0 ? "s" : ""}
        </span>
        {project.githubRepo && (
          <a href={project.githubRepo} target="_blank" rel="noreferrer"
            className="ml-auto text-xs text-gray-500 hover:text-emerald-400 transition-colors">
            github →
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-800">
        <button onClick={() => onOpen(project._id)}
          className="flex-1 text-xs py-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg transition-colors">
          Open Workspace
        </button>
        {isOwner ? (
          <>
            <button onClick={() => onEdit(project)}
              className="text-xs px-3 py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
              edit
            </button>
            <button onClick={() => onDelete(project._id)}
              className="text-xs px-3 py-1.5 border border-red-900 hover:bg-red-900 text-red-400 rounded-lg transition-colors">
              del
            </button>
          </>
        ) : isMember ? (
          <button onClick={() => onLeave(project._id)}
            className="text-xs px-3 py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors">
            leave
          </button>
        ) : (
          <button onClick={() => onJoin(project._id)}
            className="text-xs px-3 py-1.5 border border-emerald-700 hover:bg-emerald-900 text-emerald-400 rounded-lg transition-colors">
            join
          </button>
        )}
      </div>
    </div>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────
function ProjectModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      techStack: typeof form.techStack === "string"
        ? form.techStack.split(",").map((s) => s.trim()).filter(Boolean)
        : form.techStack,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{initial ? "Edit Project" : "New Project"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        <input value={form.title} onChange={(e) => set("title", e.target.value)}
          placeholder="Project title *"
          className="w-full bg-gray-800 text-sm text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none" />

        <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Description"  rows={3}
          className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none resize-none" />

        <input value={form.techStack} onChange={(e) => set("techStack", e.target.value)}
          placeholder="Tech stack — React, Node.js, MongoDB"
          className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none" />

        <input value={form.githubRepo} onChange={(e) => set("githubRepo", e.target.value)}
          placeholder="GitHub repo URL"
          className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Priority</label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)}
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)}
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Deadline</label>
          <input type="date" value={form.deadline ? form.deadline.slice(0, 10) : ""}
            onChange={(e) => set("deadline", e.target.value)}
            className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 text-xs py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 text-xs py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ProjectPage() {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [tab, setTab] = useState("all"); // "all" | "mine"

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const endpoint = tab === "mine" ? "/projects/mine" : "/projects";
      const params   = [];
      if (filterStatus   !== "all") params.push(`status=${filterStatus}`);
      if (filterPriority !== "all") params.push(`priority=${filterPriority}`);
      const query = params.length ? `?${params.join("&")}` : "";
      const res = await api.get(`${endpoint}${query}`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [tab, filterStatus, filterPriority]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    await api.post("/projects", form);
    setShowModal(false);
    fetchProjects();
  };

  const handleEdit = async (form) => {
    await api.put(`/projects/${editTarget._id}`, form);
    setEditTarget(null);
    fetchProjects();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    await api.delete(`/projects/${id}`);
    fetchProjects();
  };

  const handleJoin = async (id) => {
    await api.post(`/projects/${id}/join`);
    fetchProjects();
  };

  const handleLeave = async (id) => {
    await api.post(`/projects/${id}/leave`);
    fetchProjects();
  };

  const openEditModal = (project) => {
    setEditTarget({
      ...project,
      techStack: (project.techStack || []).join(", "),
      deadline:  project.deadline ? project.deadline.slice(0, 10) : "",
    });
  };

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = {
    total:     projects.length,
    active:    projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    mine:      projects.filter((p) => p.owner?._id === user?._id).length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Projects</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage and explore your projects</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
            + New Project
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "total",     val: stats.total },
            { label: "active",    val: stats.active },
            { label: "completed", val: stats.completed },
            { label: "owned",     val: stats.mine },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{s.val}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs + Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {["all", "mine"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-4 py-1.5 rounded-md transition-colors ${
                  tab === t ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white"
                }`}>
                {t === "all" ? "All Projects" : "My Projects"}
              </button>
            ))}
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 outline-none">
            <option value="all">All Status</option>
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="archived">archived</option>
          </select>

          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-gray-900 text-xs text-gray-300 border border-gray-700 rounded-lg px-3 py-1.5 outline-none">
            <option value="all">All Priority</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-sm">No projects found</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-emerald-400 hover:underline">
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p._id}
                project={p}
                currentUser={user}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onDelete={handleDelete}
                onEdit={openEditModal}
                onOpen={(id) => navigate(`/workspace/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <ProjectModal onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <ProjectModal initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />
      )}
    </div>
  );
}
