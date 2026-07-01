// frontend/src/components/KanbanBoard.jsx

import { useState, useEffect } from "react";
import api from "../services/api";
import socket from "../socket/socket";

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
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 space-y-2 group transition-all duration-200 cursor-grab active:cursor-grabbing transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
    >

      {/* Priority + actions */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)}
            className="text-[10px] text-gray-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-800 transition-colors">
            edit
          </button>
          <button onClick={() => onDelete(task._id)}
            className="text-[10px] text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800/80 transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Title */}
      <p className="text-xs text-white font-semibold leading-snug">{task.title}</p>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-gray-800/60">
        {/* Assigned user */}
        {task.assignedTo ? (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-800 flex items-center justify-center text-[9px] font-bold text-emerald-200" title={`Assigned to ${task.assignedTo.name}`}>
              {task.assignedTo.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{task.assignedTo.name}</span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-700">Unassigned</span>
        )}

        {/* Deadline */}
        {task.deadline && (
          <span className={`text-[10px] ${deadlinePassed ? "text-red-400 font-semibold animate-pulse" : "text-gray-600"}`}>
            {new Date(task.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Move buttons (optional/fallback) */}
      <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
          <button key={col.id} onClick={(e) => { e.stopPropagation(); onMove(task._id, col.id); }}
            className={`flex-1 text-[9px] py-0.5 rounded border ${col.border} ${col.color} hover:bg-gray-800 transition-colors`}>
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-5 space-y-4">
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
            <label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold tracking-wider">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full bg-gray-800 text-sm text-gray-200 px-3 py-2 rounded-lg border border-gray-700 outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold tracking-wider">Assign To</label>
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
          <label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold tracking-wider">Deadline</label>
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
  const [dragOverCol, setDragOverCol] = useState(null);

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

  useEffect(() => {
    fetchTasks();
    socket.on("task:changed", fetchTasks);
    return () => {
      socket.off("task:changed", fetchTasks);
    };
  }, [workspaceId]);

  const handleCreate = async (form) => {
    await api.post(`/workspaces/${workspaceId}/tasks`, form);
    socket.emit("task:changed", { workspaceId });
    fetchTasks();
  };

  const handleEdit = async (form) => {
    await api.put(`/workspaces/${workspaceId}/tasks/${editTarget._id}`, form);
    socket.emit("task:changed", { workspaceId });
    setEditTarget(null);
    fetchTasks();
  };

  const handleMove = async (taskId, status) => {
    setTasks((prev) => prev.map((t) => t._id === taskId ? { ...t, status } : t));
    try {
      await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}/status`, { status });
      socket.emit("task:changed", { workspaceId });
    } catch (err) {
      fetchTasks(); // revert on error
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
    socket.emit("task:changed", { workspaceId });
  };

  const tasksByStatus = (status) => tasks.filter((t) => t.status === status);

  // Completion calculation
  const totalTasks = tasks.length;
  const doneTasks = tasksByStatus("done").length;
  const todoTasks = tasksByStatus("todo").length;
  const progressTasks = tasksByStatus("progress").length;
  const completionPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-gray-950 font-mono">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold text-white">Task Board</h2>
          <span className="text-[10px] bg-gray-900 border border-gray-850 px-2 py-0.5 rounded-full text-gray-500">{totalTasks} tasks</span>
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
        <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden min-h-[300px]">
          {COLUMNS.map((col) => (
            <div 
              key={col.id} 
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragOverCol(col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) handleMove(taskId, col.id);
                setDragOverCol(null);
              }}
              style={{
                background: dragOverCol === col.id ? "rgba(16, 185, 129, 0.03)" : "transparent",
                border: dragOverCol === col.id ? "1px dashed rgba(16, 185, 129, 0.3)" : "1px solid transparent",
                borderRadius: "16px",
                transition: "all 0.2s"
              }}
              className="flex flex-col min-h-0 p-2"
            >

              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-600 ml-auto">
                  {tasksByStatus(col.id).length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {tasksByStatus(col.id).length === 0 ? (
                  <div className={`border border-dashed ${col.border} rounded-xl p-4 text-center opacity-60`}>
                    <p className="text-[10px] text-gray-700">No tasks</p>
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

      {/* Completion Graph / Stacked Bar Section */}
      <div className="mx-4 mb-4 mt-2 flex justify-start">
        <div className="w-60 h-60 bg-gray-900/40 border border-gray-850 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Task Progress</span>
            <span className="text-[10px] text-gray-500">{doneTasks}/{totalTasks} Done</span>
          </div>

          {/* Centered Circular Gauge */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="5" fill="transparent" />
              <circle 
                cx="48" 
                cy="48" 
                r="40" 
                stroke="url(#squareProgressGradient)" 
                strokeWidth="5" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - completionPercentage / 100)}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="squareProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-white leading-none">{completionPercentage}%</span>
              <span className="text-[7px] text-gray-500 uppercase tracking-widest font-bold mt-1">Complete</span>
            </div>
          </div>

          {/* Breakdown lists inside the square card */}
          <div className="space-y-1 pt-2 border-t border-gray-800/80">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span className="text-gray-500">To Do</span>
              </div>
              <span className="font-bold text-gray-300">{todoTasks}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span className="text-gray-500">In Progress</span>
              </div>
              <span className="font-bold text-yellow-500">{progressTasks}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Done</span>
              </div>
              <span className="font-bold text-emerald-400">{doneTasks}</span>
            </div>
          </div>
        </div>
      </div>

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
