// frontend/src/pages/ProjectPage.jsx
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

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
  projectName: "",
  description: "",
  teamName:    "",
  teamLogo:    "",
  priority:    "medium",
  deadline:    "",
  status:      "active",
};

// ── Avatar Stack ───────────────────────────────────────────────────────
function AvatarStack({ members = [], max = 4 }) {
  const shown = members.slice(0, max);
  const rest  = members.length - max;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((m, i) => {
        const name = m?.user?.name || m?.name || "?";
        return (
          <div key={i}
            title={name}
            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)", borderColor: "var(--bg-card)", color: "white", zIndex: shown.length - i }}>
            {name[0]?.toUpperCase()}
          </div>
        );
      })}
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
  const members  = project.members || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card card-interactive p-5 flex flex-col gap-4 relative group"
      onClick={() => onOpen?.(project.workspace?._id || project._id)}
    >
      {isOwner && (
        <div className="absolute top-3 right-3 text-sm" title="You own this project">👑</div>
      )}

      <div className="flex gap-3">
        {project.teamLogo && (
          <img src={project.teamLogo} alt="Team Logo" className="w-10 h-10 rounded-xl object-cover border border-gray-800" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors">
            {project.projectName}
          </h3>
          <p className="text-xs text-purple-400 font-medium truncate mt-0.5">Team: {project.teamName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={PRIORITY_CLASS[project.priority] || "badge"}>{project.priority}</span>
        <span className={STATUS_CLASS[project.status]   || "badge"}>{project.status}</span>
      </div>

      {project.description && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {project.description}
        </p>
      )}

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
            projectName: initial.projectName || "",
            description: initial.description || "",
            teamName:    initial.teamName || "",
            teamLogo:    initial.teamLogo || "",
            priority:    initial.priority || "medium",
            deadline:    initial.deadline ? initial.deadline.slice(0, 10) : "",
            status:      initial.status || "active",
          }
        : EMPTY_FORM
      );
    }
  }, [open, initial]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((f) => ({ ...f, teamLogo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!form.projectName.trim() || !form.teamName.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
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

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {[
              { label: "Project name *", key: "projectName", placeholder: "My awesome project" },
              { label: "Description", key: "description", placeholder: "What are you building?" },
              { label: "Team name *", key: "teamName", placeholder: "e.g. Pixel Pioneers" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</label>
                {key === "description" ? (
                  <textarea
                    rows={2}
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

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Team Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="input-base text-xs" />
              {form.teamLogo && (
                <img src={form.teamLogo} alt="Logo preview" className="w-12 h-12 rounded-xl mt-2 object-cover border border-gray-800" />
              )}
            </div>

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
            <button onClick={handleSave} disabled={saving || !form.projectName.trim() || !form.teamName.trim()} className="btn-primary flex-1">
              {saving ? "Saving…" : initial ? "Save changes" : "Create project"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Invite Prompt Modal ────────────────────────────────────────────────
function InvitePromptModal({ open, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
        <div className="text-3xl">✉</div>
        <h3 className="text-base font-bold text-white">Invite Team Members?</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your project and team have been created successfully. Would you like to invite collaborators to join now?
        </p>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2 text-xs">No, Later</button>
          <button onClick={onConfirm} className="btn-primary flex-1 py-2 text-xs">Yes, Invite</button>
        </div>
      </div>
    </div>
  );
}

// ── Send Invite Modal (moved from Invitations) ────────────────────────
function SendInviteModal({ open, projectId, onClose }) {
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("member");
  const [workRole, setWorkRole] = useState("Frontend Developer");
  const [inviteLink, setInviteLink] = useState("");
  const [sending, setSending]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const handleEmailInvite = async () => {
    if (!email.trim()) return;
    setSending(true); setError(""); setSuccess("");
    try {
      await api.post(`/projects/${projectId}/invites/email`, { email, role, workRole });
      setSuccess(`Invitation sent to ${email}!`);
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send email invite.");
    } finally {
      setSending(false);
    }
  };

  const handleGenerateLink = async () => {
    setSending(true); setError(""); setSuccess("");
    try {
      const res = await api.post(`/projects/${projectId}/invites/link`, { role, workRole });
      setInviteLink(res.data.link);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate link.");
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">✉ Invite Team Members</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-lg p-2">{error}</p>}
        {success && <p className="text-xs text-green-400 bg-green-950/20 border border-green-900 rounded-lg p-2">{success}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Permission Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="input-base">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Work Role</label>
            <select value={workRole} onChange={e => setWorkRole(e.target.value)} className="input-base">
              <option value="Project Manager">Project Manager</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="UI/UX Designer">UI/UX Designer</option>
              <option value="QA Engineer">QA Engineer</option>
              <option value="DevOps Engineer">DevOps Engineer</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3 space-y-3">
          <label className="text-xs font-semibold text-gray-400 block">Option A: Invite by Email</label>
          <div className="flex gap-2">
            <input type="email" placeholder="collaborator@example.com" value={email} onChange={e => setEmail(e.target.value)} className="input-base flex-1" />
            <button onClick={handleEmailInvite} disabled={sending || !email.trim()} className="btn-primary text-xs whitespace-nowrap px-4">
              Send Invite
            </button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-3 space-y-3">
          <label className="text-xs font-semibold text-gray-400 block">Option B: Generate Invite Link</label>
          {inviteLink ? (
            <div className="flex gap-2">
              <input type="text" readOnly value={inviteLink} className="input-base flex-1 text-xs select-all bg-gray-950" />
              <button onClick={handleCopyLink} className="btn-ghost text-xs whitespace-nowrap px-4">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateLink} disabled={sending} className="btn-ghost text-xs w-full py-2">
              Generate Invite Link
            </button>
          )}
        </div>

        <div className="flex pt-2">
          <button onClick={onClose} className="btn-ghost text-xs w-full py-2">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Project Page ───────────────────────────────────────────────────────
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

  // Post-creation invite states
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [showInviteModal, setShowInviteModal]   = useState(false);

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

  const handleCreate = async (form) => {
    try {
      const res = await api.post("/projects", form);
      fetchProjects();
      // Store created ID and trigger invite prompt modal
      setCreatedProjectId(res.data._id);
      setShowInvitePrompt(true);
    } catch (err) {
      console.error("Project creation failed:", err);
    }
  };

  const handleEdit = async (form) => {
    await api.put(`/projects/${editTarget._id}`, form);
    setEditTarget(null);
    fetchProjects();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project? This will also remove the workspace and is irreversible.")) return;
    await api.delete(`/projects/${id}`);
    fetchProjects();
  };

  const handleOpen = (workspaceId) => {
    if (workspaceId) navigate(`/workspace/${workspaceId}`);
  };

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

      <ProjectModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSave={editTarget ? handleEdit : handleCreate}
        initial={editTarget}
      />

      <InvitePromptModal
        open={showInvitePrompt}
        onConfirm={() => { setShowInvitePrompt(false); setShowInviteModal(true); }}
        onCancel={() => { setShowInvitePrompt(false); setCreatedProjectId(null); }}
      />

      <SendInviteModal
        open={showInviteModal}
        projectId={createdProjectId}
        onClose={() => { setShowInviteModal(false); setCreatedProjectId(null); }}
      />
    </div>
  );
}
