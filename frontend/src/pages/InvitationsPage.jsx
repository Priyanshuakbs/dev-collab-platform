// frontend/src/pages/InvitationsPage.jsx

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

// ─── Send Invite Modal ────────────────────────────────────────────────
function SendInviteModal({ onClose, onSent }) {
  const { user }                    = useContext(AuthContext);
  const [search,   setSearch]       = useState("");
  const [users,    setUsers]        = useState([]);
  const [projects, setProjects]     = useState([]);
  const [selected, setSelected]     = useState({ user: null, project: null });
  const [sending,  setSending]      = useState(false);
  const [error,    setError]        = useState("");

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
    api.get("/projects/mine").then((res) => {
      const owned = res.data.filter((p) => {
        const ownerId = p.owner?._id || p.owner;
        return ownerId?.toString() === user?._id?.toString();
      });
      setProjects(owned);
    }).catch(() => setProjects([]));
  }, [user]);

  const handleSend = async () => {
    if (!selected.user)    { setError("Please select a user");    return; }
    if (!selected.project) { setError("Please select a project"); return; }
    try {
      setSending(true);
      setError("");
      await api.post("/invitations", {
        receiver:  selected.user._id,
        projectId: selected.project._id,
      });
      onSent();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Invite bhejne mein error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Send Team Invite</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">User dhundo</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none" />
          {users.length > 0 && (
            <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              {users.map((u) => (
                <button key={u._id}
                  onClick={() => { setSelected((s) => ({ ...s, user: u })); setSearch(""); setUsers([]); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left">
                  <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200">
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selected.user && (
            <div className="mt-2 flex items-center gap-2 bg-emerald-900 border border-emerald-700 rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
                {selected.user.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-emerald-200 flex-1">{selected.user.name}</span>
              <button onClick={() => setSelected((s) => ({ ...s, user: null }))}
                className="text-emerald-400 hover:text-white text-xs">✕</button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Project select karo <span className="text-purple-400">(sirf tumhare owned projects)</span></label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="text-center py-4 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">No owned projects found</p>
                <p className="text-xs text-gray-600 mt-1">Sirf 👑 Admin wale projects mein invite kar sakte ho</p>
              </div>
            ) : (
              projects.map((p) => (
                <button key={p._id} onClick={() => setSelected((s) => ({ ...s, project: p }))}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selected.project?._id === p._id
                      ? "border-emerald-600 bg-emerald-900 text-emerald-200"
                      : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                  }`}>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-purple-400 ml-2">👑 Admin</span>
                </button>
              ))
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-900 bg-opacity-30 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 text-xs py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
            cancel
          </button>
          <button onClick={handleSend} disabled={sending || !selected.user || !selected.project}
            className="flex-1 text-xs py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50">
            {sending ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Card ──────────────────────────────────────────────────────
function InviteCard({ invite, type, onAccept, onReject, onCancel }) {
  const [loading, setLoading] = useState("");

  const handle = async (fn, key) => {
    setLoading(key);
    try { await fn(); } finally { setLoading(""); }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Project</p>
          <p className="text-sm font-bold text-white">{invite.project?.title}</p>
          {invite.project?.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{invite.project.description}</p>
          )}
          {invite.project?.techStack?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {invite.project.techStack.slice(0, 3).map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-emerald-300">{t}</span>
              ))}
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
          invite.status === "pending"  ? "border-yellow-700 text-yellow-400 bg-yellow-900" :
          invite.status === "accepted" ? "border-emerald-700 text-emerald-400 bg-emerald-900" :
                                         "border-red-800 text-red-400 bg-red-900"
        }`}>
          {invite.status}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-800 pt-2">
        {type === "received" ? (
          <>
            <div className="w-6 h-6 rounded-full bg-purple-800 flex items-center justify-center text-xs font-bold text-purple-200">
              {invite.sender?.name?.[0]?.toUpperCase()}
            </div>
            {/* ✅ Sender = Admin badge */}
            <span className="text-xs text-gray-400">From: </span>
            <span className="text-xs text-white">{invite.sender?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-900 border border-purple-700 text-purple-300 ml-1">
              👑 Admin
            </span>
            <span className="text-xs text-gray-600 ml-auto">{new Date(invite.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-200">
              {invite.receiver?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-gray-400">To: </span>
            <span className="text-xs text-white">{invite.receiver?.name}</span>
            {/* ✅ Receiver = Member badge */}
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 ml-1">
              Member
            </span>
            <span className="text-xs text-gray-600 ml-auto">{new Date(invite.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </>
        )}
      </div>

      {type === "received" && invite.status === "pending" && (
        <div className="flex gap-2">
          <button onClick={() => handle(onAccept, "accept")} disabled={!!loading}
            className="flex-1 text-xs py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50">
            {loading === "accept" ? "..." : "✓ accept"}
          </button>
          <button onClick={() => handle(onReject, "reject")} disabled={!!loading}
            className="flex-1 text-xs py-1.5 border border-red-800 hover:bg-red-900 text-red-400 rounded-lg transition-colors disabled:opacity-50">
            {loading === "reject" ? "..." : "✕ reject"}
          </button>
        </div>
      )}
      {type === "sent" && invite.status === "pending" && (
        <button onClick={onCancel}
          className="text-xs py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors w-full">
          cancel invite
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function InvitationsPage() {
  const [received,  setReceived]  = useState([]);
  const [sent,      setSent]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("received");
  const [showModal, setShowModal] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [recRes, sentRes] = await Promise.all([
        api.get("/invitations"),
        api.get("/invitations/sent"),
      ]);
      setReceived(recRes.data);
      setSent(sentRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAccept = async (id) => { await api.put(`/invitations/${id}/accept`);  fetchAll(); };
  const handleReject = async (id) => { await api.put(`/invitations/${id}/reject`);  fetchAll(); };
  const handleCancel = async (id) => { await api.delete(`/invitations/${id}`);       fetchAll(); };

  const pendingCount = received.filter((i) => i.status === "pending").length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Team Invites
              {pendingCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-emerald-800 text-emerald-300 rounded-full border border-emerald-700">
                  {pendingCount} pending
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your team invitations</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
            + Send Invite
          </button>
        </div>

        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 w-fit">
          {[
            { key: "received", label: `received (${received.length})` },
            { key: "sent",     label: `sent (${sent.length})` },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-xs px-4 py-1.5 rounded-md transition-colors ${
                tab === t.key ? "bg-emerald-700 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {(tab === "received" ? received : sent).length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-sm">
                  {tab === "received" ? "No invitations received yet" : "No invitations sent yet"}
                </p>
                {tab === "sent" && (
                  <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-emerald-400 hover:underline">
                    Send your first invite →
                  </button>
                )}
              </div>
            ) : (
              (tab === "received" ? received : sent).map((invite) => (
                <InviteCard
                  key={invite._id}
                  invite={invite}
                  type={tab}
                  onAccept={() => handleAccept(invite._id)}
                  onReject={() => handleReject(invite._id)}
                  onCancel={() => handleCancel(invite._id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showModal && (
        <SendInviteModal onClose={() => setShowModal(false)} onSent={fetchAll} />
      )}
    </div>
  );
}