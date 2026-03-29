// frontend/src/components/GlobalSearch.jsx
// Press Ctrl+K to open global search

import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const CATEGORY_ICON = {
  user:      "👤",
  project:   "🚀",
  workspace: "🏠",
};

const CATEGORY_COLOR = {
  user:      "text-blue-400",
  project:   "text-emerald-400",
  workspace: "text-purple-400",
};

export default function GlobalSearch() {
  const { user }  = useContext(AuthContext);
  const navigate  = useNavigate();
  const inputRef  = useRef();

  const [isOpen,   setIsOpen]   = useState(false);
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(0);
  const [filter,   setFilter]   = useState("all"); // all | user | project | workspace

  // ── Ctrl+K to open ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Focus input when opened ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [isOpen]);

  // ── Search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [usersRes, projectsRes, workspacesRes] = await Promise.allSettled([
          api.get(`/users/search?q=${query}`),
          api.get(`/projects?title=${query}`),
          api.get(`/workspaces`),
        ]);

        const users = usersRes.status === "fulfilled"
          ? usersRes.value.data.map((u) => ({
              id:       u._id,
              type:     "user",
              title:    u.name,
              subtitle: u.email,
              link:     `/profile/${u._id}`,
            }))
          : [];

        const projects = projectsRes.status === "fulfilled"
          ? projectsRes.value.data
              .filter((p) => p.title?.toLowerCase().includes(query.toLowerCase()))
              .map((p) => ({
                id:       p._id,
                type:     "project",
                title:    p.title,
                subtitle: p.description || p.status,
                link:     `/projects`,
                extra:    p.techStack?.slice(0, 2).join(", "),
              }))
          : [];

        const workspaces = workspacesRes.status === "fulfilled"
          ? workspacesRes.value.data
              .filter((w) => w.name?.toLowerCase().includes(query.toLowerCase()))
              .map((w) => ({
                id:       w._id,
                type:     "workspace",
                title:    w.name,
                subtitle: `Workspace`,
                link:     `/workspace/${w._id}`,
              }))
          : [];

        let combined = [...users, ...projects, ...workspaces];

        // Apply filter
        if (filter !== "all") {
          combined = combined.filter((r) => r.type === filter);
        }

        setResults(combined.slice(0, 8));
        setSelected(0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filter]);

  // ── Keyboard navigation ───────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && results[selected]) {
      handleSelect(results[selected]);
    }
  };

  const handleSelect = (result) => {
    navigate(result.link);
    setIsOpen(false);
    setQuery("");
  };

  // ── Quick links (shown when no query) ────────────────────────────
  const quickLinks = [
    { icon: "🏠", label: "Dashboard",   link: "/dashboard"   },
    { icon: "🚀", label: "Projects",    link: "/projects"    },
    { icon: "📩", label: "Invitations", link: "/invitations" },
    { icon: "👤", label: "My Profile",  link: "/profile"     },
  ];

  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className="hidden sm:flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <span>Search...</span>
      <span className="ml-2 text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">⌘K</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden font-mono">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search users, projects, workspaces..."
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
          />
          {loading && (
            <div className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-800">
          {["all", "user", "project", "workspace"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filter === f
                  ? "bg-emerald-700 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
              }`}>
              {f === "all" ? "All" : f === "user" ? "👤 Users" : f === "project" ? "🚀 Projects" : "🏠 Workspaces"}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query && (
            <div className="p-3">
              <p className="text-xs text-gray-600 px-2 mb-2 uppercase tracking-widest">Quick Links</p>
              {quickLinks.map((l, i) => (
                <button key={i} onClick={() => { navigate(l.link); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
                  <span>{l.icon}</span>
                  <span className="text-sm text-gray-300">{l.label}</span>
                  <span className="ml-auto text-xs text-gray-600">→</span>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && !loading && (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-xs text-gray-500">No results for "{query}"</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {results.map((result, i) => (
                <button key={result.id} onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    selected === i ? "bg-gray-800" : "hover:bg-gray-800"
                  }`}>
                  <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                    {CATEGORY_ICON[result.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result.extra && (
                      <span className="text-xs text-gray-600">{result.extra}</span>
                    )}
                    <span className={`text-xs ${CATEGORY_COLOR[result.type]}`}>
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 bg-gray-950">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <kbd className="bg-gray-800 px-1 rounded">↑↓</kbd> navigate
          </span>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <kbd className="bg-gray-800 px-1 rounded">↵</kbd> select
          </span>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <kbd className="bg-gray-800 px-1 rounded">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
