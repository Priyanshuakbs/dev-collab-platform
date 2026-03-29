// frontend/src/components/NotificationBell.jsx

import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import socket from "../socket/socket";
import { AuthContext } from "../context/AuthContext";

const TYPE_ICON = {
  invitation_received: "📩",
  invitation_accepted: "✅",
  invitation_rejected: "❌",
  project_joined:      "🚀",
  task_assigned:       "📋",
  task_completed:      "🎉",
  workspace_joined:    "👥",
  file_created:        "📄",
  mention:             "💬",
};

export default function NotificationBell() {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();
  const dropRef   = useRef();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isOpen,        setIsOpen]        = useState(false);
  const [loading,       setLoading]       = useState(false);

  // ── Fetch notifications ─────────────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.read).length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // ── Real-time socket notification ───────────────────────────────────
  useEffect(() => {
    socket.on("newNotification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return () => socket.off("newNotification");
  }, []);

  // ── Close on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Mark as read ────────────────────────────────────────────────────
  const handleClick = async (notif) => {
    if (!notif.read) {
      await api.put(`/notifications/${notif._id}/read`);
      setNotifications((prev) =>
        prev.map((n) => n._id === notif._id ? { ...n, read: true } : n)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await api.delete("/notifications/clear-all");
    setNotifications([]);
    setUnreadCount(0);
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setUnreadCount((prev) => {
      const wasUnread = notifications.find((n) => n._id === id && !n.read);
      return wasUnread ? Math.max(0, prev - 1) : prev;
    });
  };

  return (
    <div className="relative" ref={dropRef}>

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-gray-950 text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 font-mono">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-emerald-800 text-emerald-300 rounded-full border border-emerald-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-xs text-gray-500 hover:text-emerald-400 transition-colors">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-xs text-gray-600">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800 transition-colors group ${
                    !notif.read ? "bg-gray-800" : ""
                  }`}
                >
                  {/* Icon */}
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICON[notif.type] || "🔔"}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${!notif.read ? "text-white" : "text-gray-400"}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Unread dot + delete */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {!notif.read && (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    )}
                    <button
                      onClick={(e) => deleteOne(e, notif._id)}
                      className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
