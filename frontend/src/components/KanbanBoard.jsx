// frontend/src/components/KanbanBoard.jsx

import { useState, useEffect } from "react";
import api from "../services/api";

const COLUMNS = [
  { id: "todo",     label: "To Do",      color: "text-gray-400",   border: "border-gray-700",  dot: "bg-gray-500"    },
  { id: "progress", label: "In Progress", color: "text-yellow-400", border: "border-yellow-700", dot: "bg-yellow-400" },
  { id: "done",     label: "Done",        color: "text-emerald-400", border: "border-emerald-700", dot: "bg-emerald-400" },
];

const PRIORITY_STYLE = {
  high:   "text-red-400 bg-red-900 border-red-800",
  medium: "text-yellow-400 bg-yellow-900 border-yellow-800",
  low:    "text-gray-400 bg-gray-800 border-gray-700",
};

// ── Task Card ─────────────────────────────────────────────────────────
function TaskCard({ task, onMove, onDelete, onEdit, members }) {
  const deadlinePassed = task.deadline && new Date(task.deadline) < new Date();

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 space-y-2 group transition-colors">

      {/* Priority + actions */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)}
            className="text-xs text-gray-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors">
            edit
          </button>
          <button onClick={() => onDelete(task._id)}
            className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-white font-medium leading-snug">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        {/* Assigned user */}
        {task.assignedTo ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200">
              {task.assignedTo.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-gray-500 truncate max-w-20">{task.assignedTo.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-700">Unassigned</span>
        )}

        {/* Deadline */}
        {task.deadline && (
          <span className={`text-xs ${deadlinePassed ? "text-red-400" : "text-gray-600"}`}>
            {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex gap-1 pt-1">
        {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
          <button key={col.id} onClick={() => onMove(task._id, col.id)}
            className={`flex-1 text-xs py-1 rounded-lg border ${col.border} ${col.color} hover:bg-gray-800 transition-colors`}>
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────
function TaskModal({ initial, members, onClose, onSave }) {
  const [form, setForm] = useState(
    initial || { title: "", description: "", priority: "medium", assignedTo: "", deadline: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{initial ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Task title *"
          className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none"
        />

        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          rows={3}
          className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-emerald-500 outline-none resize-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Assign To</label>
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Deadline</label>
          <input type="date"
            value={form.deadline ? form.deadline.slice(0, 10) : ""}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 text-xs py-2 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 text-xs py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : initial ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Kanban Board ─────────────────────────────────────────────────
export default function KanbanBoard({ workspaceId, members = [] }) {
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${workspaceId}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [workspaceId]);

  const handleCreate = async (form) => {
    await api.post(`/workspaces/${workspaceId}/tasks`, form);
    fetchTasks();
  };

  const handleEdit = async (form) => {
    await api.put(`/workspaces/${workspaceId}/tasks/${editTarget._id}`, form);
    setEditTarget(null);
    fetchTasks();
  };

  const handleMove = async (taskId, status) => {
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status } : t));
    try {
      await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status });
    } catch {
      fetchTasks(); // revert on error
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  };

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  return (
    <div className="h-full flex flex-col bg-gray-950 font-mono">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white">Task Board</h2>
          <span className="text-xs text-gray-600">{tasks.length} tasks</span>
        </div>
        <button onClick={() => setShowModal(true)}
          className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors">
          + New Task
        </button>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col min-h-0">

              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-600 ml-auto">
                  {tasksByStatus(col.id).length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {tasksByStatus(col.id).length === 0 ? (
                  <div className={`border border-dashed ${col.border} rounded-xl p-4 text-center`}>
                    <p className="text-xs text-gray-700">No tasks</p>
                  </div>
                ) : (
                  tasksByStatus(col.id).map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      members={members}
                      onMove={handleMove}
                      onDelete={handleDelete}
                      onEdit={(t) => setEditTarget({
                        ...t,
                        assignedTo: t.assignedTo?._id || "",
                        deadline:   t.deadline ? t.deadline.slice(0, 10) : "",
                      })}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TaskModal members={members} onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <TaskModal initial={editTarget} members={members} onClose={() => setEditTarget(null)} onSave={handleEdit} />
      )}
    </div>
  );
}
