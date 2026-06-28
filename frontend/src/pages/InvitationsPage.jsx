// frontend/src/pages/InvitationsPage.jsx
import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import {
  GlassCard, GradientButton, Badge, Avatar, Modal,
  Input, EmptyState, useToast, ToastContainer, Skeleton,
} from "../components/ui/index.jsx";

function SendInviteModal({ open, onClose, onSent }) {
  const { user }                = useContext(AuthContext);
  const [search, setSearch]     = useState("");
  const [users, setUsers]       = useState([]);
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState({ user: null, project: null });
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!search.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${search}`);
        setUsers(res.data.filter((u) => u._id !== user?._id));
      } catch { setUsers([]); }
    }, 400);
    return () => clearTimeout(t);
  }, [search, user]);

  useEffect(() => {
    if (!open) return;
    api.get("/projects/mine").then((res) => {
      setProjects(res.data.filter((p) => {
        const ownerId = p.owner?._id || p.owner;
        return ownerId?.toString() === user?._id?.toString();
      }));
    }).catch(() => setProjects([]));
  }, [open, user]);

  const handleClose = () => {
    setSearch(""); setUsers([]); setSelected({ user: null, project: null }); setError(""); onClose();
  };

  const handleSend = async () => {
    if (!selected.user)    { setError("Please select a user");    return; }
    if (!selected.project) { setError("Please select a project"); return; }
    try {
      setSending(true); setError("");
      await api.post("/invitations", { receiver: selected.user._id, projectId: selected.project._id });
      onSent(); handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    } finally { setSending(false); }
  };

  return (
    <Modal open={open} onClose={handleClose} title="✉ Send Team Invite" width="max-w-lg">
      <div className="space-y-5">
        <div>
          <Input label="Search team member" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
          <AnimatePresence>
            {users.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mt-1 rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {users.map((u) => (
                  <button key={u._id} onClick={() => { setSelected((s) => ({ ...s, user: u })); setSearch(""); setUsers([]); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="text-sm text-white">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {selected.user && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="mt-2 flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <Avatar name={selected.user.name} size="sm" />
                <span className="text-sm text-purple-200 flex-1">{selected.user.name}</span>
                <button onClick={() => setSelected((s) => ({ ...s, user: null }))}
                  className="text-purple-400 hover:text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 block mb-2">
            Select project <span className="text-purple-400">(your owned projects only)</span>
          </label>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="text-center py-6 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500">No owned projects — create one first</p>
              </div>
            ) : projects.map((p) => (
              <motion.button key={p._id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => setSelected((s) => ({ ...s, project: p }))}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{
                  background: selected.project?._id === p._id ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                  border: selected.project?._id === p._id ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{p.title}</span>
                  <Badge variant="admin">👑 Admin</Badge>
                </div>
                {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>}
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-red-400 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-1">
          <GradientButton variant="ghost" onClick={handleClose} className="flex-1">Cancel</GradientButton>
          <GradientButton onClick={handleSend} disabled={sending || !selected.user || !selected.project} className="flex-1">
            {sending ? "Sending..." : "Send Invite →"}
          </GradientButton>
        </div>
      </div>
    </Modal>
  );
}

function InviteCard({ invite, type, onAccept, onReject, onCancel }) {
  const [loading, setLoading] = useState("");
  const handle = async (fn, key) => { setLoading(key); try { await fn(); } finally { setLoading(""); } };
  const statusVariant = { pending: "yellow", accepted: "green", rejected: "red" };

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }} whileHover={{ scale: 1.005 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "rgba(15,15,35,0.6)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Project</p>
          <h3 className="text-base font-bold text-white">{invite.project?.title}</h3>
          {invite.project?.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{invite.project.description}</p>}
          {invite.project?.techStack?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {invite.project.techStack.slice(0, 3).map((t, i) => <Badge key={i} variant="blue">{t}</Badge>)}
            </div>
          )}
        </div>
        <Badge variant={statusVariant[invite.status] || "default"}>{invite.status}</Badge>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        {type === "received" ? (
          <>
            <Avatar name={invite.sender?.name} size="sm" isAdmin />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{invite.sender?.name}</span>
                <Badge variant="admin">👑 Admin</Badge>
              </div>
              <p className="text-xs text-gray-500">{invite.sender?.email}</p>
            </div>
          </>
        ) : (
          <>
            <Avatar name={invite.receiver?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{invite.receiver?.name}</span>
                <Badge variant="default">Member</Badge>
              </div>
              <p className="text-xs text-gray-500">{invite.receiver?.email}</p>
            </div>
          </>
        )}
        <span className="text-xs text-gray-600 flex-shrink-0">
          {new Date(invite.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {type === "received" && invite.status === "pending" && (
        <div className="flex gap-2">
          <GradientButton variant="success" size="sm" onClick={() => handle(onAccept, "accept")} disabled={!!loading} className="flex-1">
            {loading === "accept" ? "..." : "✓ Accept"}
          </GradientButton>
          <GradientButton variant="danger" size="sm" onClick={() => handle(onReject, "reject")} disabled={!!loading} className="flex-1">
            {loading === "reject" ? "..." : "✕ Decline"}
          </GradientButton>
        </div>
      )}
      {type === "sent" && invite.status === "pending" && (
        <GradientButton variant="ghost" size="sm" onClick={onCancel} className="w-full">Cancel Invite</GradientButton>
      )}
    </motion.div>
  );
}

export default function InvitationsPage() {
  const [received, setReceived]   = useState([]);
  const [sent, setSent]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("received");
  const [showModal, setShowModal] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [recRes, sentRes] = await Promise.all([api.get("/invitations"), api.get("/invitations/sent")]);
      setReceived(recRes.data); setSent(sentRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAccept = async (id) => { await api.put(`/invitations/${id}/accept`); addToast("Joined the project!", "success"); fetchAll(); };
  const handleReject = async (id) => { await api.put(`/invitations/${id}/reject`); addToast("Invitation declined.", "info"); fetchAll(); };
  const handleCancel = async (id) => { await api.delete(`/invitations/${id}`); addToast("Invitation cancelled.", "info"); fetchAll(); };

  const pendingCount = received.filter((i) => i.status === "pending").length;
  const current = tab === "received" ? received : sent;

  return (
    <div className="min-h-screen text-gray-100" style={{ background: "linear-gradient(135deg, #050510 0%, #0a0a1f 50%, #050510 100%)" }}>
      <div className="fixed inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              Team Invites {pendingCount > 0 && <Badge variant="purple">{pendingCount} pending</Badge>}
            </h1>
            <p className="text-xs text-gray-500 mt-1">Manage your team invitations</p>
          </div>
          <GradientButton onClick={() => setShowModal(true)}>+ Send Invite</GradientButton>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex p-1 rounded-2xl gap-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[{ key: "received", label: "Received", count: received.length }, { key: "sent", label: "Sent", count: sent.length }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 relative px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ color: tab === t.key ? "white" : "#6b7280" }}>
              {tab === t.key && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-xl"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(37,99,235,0.4))", border: "1px solid rgba(139,92,246,0.3)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {t.label}
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.1)" }}>{t.count}</span>
              </span>
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : current.length === 0 ? (
          <GlassCard className="p-8">
            <EmptyState icon={tab === "received" ? "📭" : "📮"}
              title={tab === "received" ? "No invitations received" : "No invitations sent"}
              description={tab === "received" ? "When someone invites you, it'll appear here" : "Invite your teammates to collaborate"}
              action={tab === "sent" && <GradientButton size="sm" onClick={() => setShowModal(true)}>Send First Invite →</GradientButton>}
            />
          </GlassCard>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence mode="popLayout">
              {current.map((invite) => (
                <InviteCard key={invite._id} invite={invite} type={tab}
                  onAccept={() => handleAccept(invite._id)}
                  onReject={() => handleReject(invite._id)}
                  onCancel={() => handleCancel(invite._id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <SendInviteModal open={showModal} onClose={() => setShowModal(false)}
        onSent={() => { fetchAll(); addToast("Invite sent!", "success"); }} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}