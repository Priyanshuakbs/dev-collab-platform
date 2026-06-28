// frontend/src/components/ide/FileExplorer.jsx
// Full VS Code-like file explorer with context menu, drag & drop, rename, search

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── File icon map ──────────────────────────────────────────────────────
const EXT_ICON = {
  js:"🟡",jsx:"🟡",ts:"🔵",tsx:"🔵",py:"🐍",java:"☕",cpp:"🔷",cc:"🔷",
  c:"©️",cs:"🟣",html:"🟠",css:"🩵",scss:"🩵",less:"🩵",json:"📋",
  md:"📝",txt:"📄",sh:"🖥",bash:"🖥",yml:"⚙",yaml:"⚙",xml:"📰",
  svg:"🖼",png:"🖼",jpg:"🖼",jpeg:"🖼",gif:"🖼",webp:"🖼",ico:"🖼",
  pdf:"📕",zip:"📦",tar:"📦",gz:"📦",env:"🔐",lock:"🔒",
  rs:"🦀",go:"🐹",rb:"💎",php:"🐘",kt:"🔷",swift:"🔶",sql:"🗃",
  dockerfile:"🐳",makefile:"⚙",gitignore:"🙈",toml:"⚙",
};
const fileIcon  = (name) => EXT_ICON[name.split(".").pop()?.toLowerCase()] || "📄";
const langFromExt = (name) => ({
  js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",
  py:"python",java:"java",cpp:"cpp",cc:"cpp",c:"c",cs:"csharp",
  html:"html",css:"css",scss:"css",json:"json",md:"markdown",
  sh:"shell",yml:"yaml",yaml:"yaml",rs:"rust",go:"go",rb:"ruby",
  php:"php",kt:"kotlin",swift:"swift",sql:"sql",xml:"xml",txt:"plaintext",
}[name.split(".").pop()?.toLowerCase()] || "plaintext");

// ── Filter tree by search query ────────────────────────────────────────
function filterTree(nodes, q) {
  if (!q) return nodes;
  return nodes.reduce((acc, node) => {
    if (node.type === "file") {
      if (node.name.toLowerCase().includes(q)) acc.push(node);
    } else {
      const children = filterTree(node.children || [], q);
      if (children.length > 0 || node.name.toLowerCase().includes(q))
        acc.push({ ...node, children });
    }
    return acc;
  }, []);
}

// ── Inline text input (rename / create) ───────────────────────────────
function InlineInput({ defaultValue = "", placeholder = "Name…", onConfirm, onCancel, style = {} }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { const v = ref.current?.value.trim(); if (v) onConfirm(v); else onCancel(); };
  return (
    <input ref={ref} defaultValue={defaultValue} placeholder={placeholder}
      className="flex-1 min-w-0 text-xs px-1.5 rounded outline-none border"
      style={{ background: "#1e1e1e", borderColor: "#4d78cc", color: "#d4d4d4", ...style }}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancel(); }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ── Context Menu ───────────────────────────────────────────────────────
function ContextMenu({ x, y, item, isRoot, onClose, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  // Flip vertically if too close to bottom
  const isDir  = !item || item.type === "directory";
  const items  = [
    isDir  && { label: "New File",       icon: "📄", key: "newFile",    danger: false },
    isDir  && { label: "New Folder",     icon: "📁", key: "newFolder",  danger: false },
    !isRoot && { sep: true },
    !isRoot && { label: "Rename",         icon: "✏",  key: "rename",    danger: false },
    !isRoot && { label: "Delete",         icon: "🗑",  key: "delete",    danger: true },
    { sep: true },
    !isRoot && { label: "Copy",           icon: "📋",  key: "copy",     danger: false },
    !isRoot && { label: "Cut",            icon: "✂",   key: "cut",      danger: false },
    isDir  && actions.hasClipboard && { label: "Paste", icon: "📌", key: "paste", danger: false },
    !isRoot && !isDir && { label: "Duplicate", icon: "🔄", key: "duplicate", danger: false },
    { sep: true },
    !isRoot && { label: "Copy Path",      icon: "🔗",  key: "copyPath", danger: false },
  ].filter(Boolean);

  return (
    <div ref={ref} className="fixed z-[9999] py-1 rounded-xl overflow-hidden select-none"
      style={{ left: x, top: y, minWidth: 186, background: "#252526", border: "1px solid #3c3c3c", boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} style={{ borderTop: "1px solid #3c3c3c", margin: "3px 0" }} />
        ) : (
          <button key={it.key} onClick={() => { actions[it.key]?.(item); onClose(); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors"
            style={{ color: it.danger ? "#f48771" : "#cccccc" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#094771"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span className="w-4 text-center">{it.icon}</span>
            {it.label}
          </button>
        )
      )}
    </div>
  );
}

// ── Tree Node ──────────────────────────────────────────────────────────
function TreeNode({
  item, depth = 0, expanded, selected,
  renaming, newChild,
  dragState, onDragStart, onDragOver, onDrop, onDragEnd,
  onToggle, onSelect, onClick, onContextMenu,
  onRenameConfirm, onRenameCancel,
  onNewChildConfirm, onNewChildCancel,
}) {
  const isDir      = item.type === "directory";
  const isExpanded = expanded.has(item.path);
  const isSelected = selected === item.path;
  const isRenaming = renaming === item.path;
  const isDragOver = dragState.over === item.path;
  const isDragging = dragState.item?.path === item.path;

  return (
    <div>
      {/* Row */}
      <div
        className="flex items-center gap-1 group rounded-sm cursor-pointer select-none"
        style={{
          paddingLeft: `${depth * 12 + 4}px`,
          paddingRight: 4,
          paddingTop: 1,
          paddingBottom: 1,
          background: isDragOver
            ? "rgba(70,130,200,0.3)"
            : isSelected
            ? "rgba(0,120,212,0.3)"
            : "transparent",
          opacity: isDragging ? 0.4 : 1,
        }}
        onClick={() => { onSelect(item.path); if (isDir) onToggle(item.path); else onClick(item); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, item); }}
        draggable
        onDragStart={(e) => { e.stopPropagation(); onDragStart(item); }}
        onDragOver={(e)  => { e.preventDefault(); e.stopPropagation(); onDragOver(item); }}
        onDrop={(e)      => { e.preventDefault(); e.stopPropagation(); onDrop(item); }}
        onDragEnd={onDragEnd}
      >
        {/* Expand arrow (dirs) or spacer (files) */}
        {isDir ? (
          <span className="w-4 flex-shrink-0 text-[10px] text-gray-500">
            {isExpanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <span className="flex-shrink-0 text-sm leading-none">
          {isDir ? (isExpanded ? "📂" : "📁") : fileIcon(item.name)}
        </span>

        {/* Name / Rename input */}
        {isRenaming ? (
          <InlineInput
            defaultValue={item.name}
            onConfirm={(v) => onRenameConfirm(item, v)}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="flex-1 min-w-0 text-xs truncate leading-5"
            style={{ color: isSelected ? "#ffffff" : "#cccccc" }}>
            {item.name}
          </span>
        )}
      </div>

      {/* Inline new child input */}
      {newChild?.parentPath === item.path && isExpanded && (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${(depth + 1) * 12 + 4}px`, paddingRight: 4, paddingTop: 1, paddingBottom: 1 }}>
          <span className="w-4 flex-shrink-0" />
          <span className="text-sm">{newChild.type === "file" ? "📄" : "📁"}</span>
          <InlineInput
            placeholder={newChild.type === "file" ? "filename.ext" : "folder-name"}
            onConfirm={onNewChildConfirm}
            onCancel={onNewChildCancel}
          />
        </div>
      )}

      {/* Children */}
      {isDir && isExpanded && item.children?.map((child) => (
        <TreeNode key={child.path} item={child} depth={depth + 1}
          expanded={expanded} selected={selected} renaming={renaming} newChild={newChild}
          dragState={dragState}
          onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}
          onToggle={onToggle} onSelect={onSelect} onClick={onClick} onContextMenu={onContextMenu}
          onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel}
          onNewChildConfirm={onNewChildConfirm} onNewChildCancel={onNewChildCancel}
        />
      ))}
    </div>
  );
}

// ── Main FileExplorer ──────────────────────────────────────────────────
export default function FileExplorer({ workspaceId, fs, onOpenFile }) {
  const { tree, loading, refresh, createFile, createFolder, renameItem, deleteItem, moveItem } = fs;

  const [expanded,  setExpanded]  = useState(new Set());
  const [selected,  setSelected]  = useState(null);
  const [renaming,  setRenaming]  = useState(null);   // path being renamed
  const [newChild,  setNewChild]  = useState(null);   // { parentPath, type }
  const [rootNew,   setRootNew]   = useState(null);   // { type } for root-level create
  const [ctxMenu,   setCtxMenu]   = useState(null);   // { x,y,item,isRoot }
  const [clipboard, setClipboard] = useState(null);   // { op:'copy'|'cut', item }
  const [search,    setSearch]    = useState("");
  const [dragState, setDragState] = useState({ item: null, over: null });
  const [error,     setError]     = useState("");
  const containerRef = useRef(null);

  // ── Close context menu on outside click ─────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (ctxMenu && containerRef.current && !containerRef.current.contains(e.target)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ctxMenu]);

  // ── Helpers ──────────────────────────────────────────────────────
  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 4000); };
  const dirOfItem = (item) => {
    if (!item || item.type === "directory") return item?.path || "";
    return item.path.includes("/") ? item.path.split("/").slice(0, -1).join("/") : "";
  };
  const expand = (path) => setExpanded((s) => { const n = new Set(s); n.add(path); return n; });

  // ── Context menu actions ─────────────────────────────────────────
  const actions = {
    hasClipboard: !!clipboard,

    newFile: (item) => {
      const parentPath = item ? (item.type === "directory" ? item.path : dirOfItem(item)) : "";
      if (parentPath) expand(parentPath);
      setNewChild({ parentPath, type: "file" });
    },
    newFolder: (item) => {
      const parentPath = item ? (item.type === "directory" ? item.path : dirOfItem(item)) : "";
      if (parentPath) expand(parentPath);
      setNewChild({ parentPath, type: "folder" });
    },
    rename: (item) => setRenaming(item.path),
    delete: async (item) => {
      if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
      try { await deleteItem(item.path); } catch (e) { showError(e.response?.data?.message || e.message); }
    },
    copy: (item) => setClipboard({ op: "copy", item }),
    cut:  (item) => setClipboard({ op: "cut",  item }),
    paste: async (targetItem) => {
      if (!clipboard) return;
      const targetDir = targetItem?.type === "directory" ? targetItem.path : dirOfItem(targetItem);
      const destPath  = targetDir ? `${targetDir}/${clipboard.item.name}` : clipboard.item.name;
      try {
        if (clipboard.op === "copy") {
          const content = await fs.readFile(clipboard.item.path);
          await createFile(destPath, content);
        } else {
          await moveItem(clipboard.item.path, destPath);
          setClipboard(null);
        }
      } catch (e) { showError(e.response?.data?.message || e.message); }
    },
    duplicate: async (item) => {
      const dir   = dirOfItem(item);
      const parts = item.name.split(".");
      const ext   = parts.length > 1 ? "." + parts.pop() : "";
      const base  = parts.join(".");
      const dest  = dir ? `${dir}/${base}_copy${ext}` : `${base}_copy${ext}`;
      try {
        const content = await fs.readFile(item.path);
        await createFile(dest, content);
      } catch (e) { showError(e.response?.data?.message || e.message); }
    },
    copyPath: (item) => { navigator.clipboard.writeText(item.path); },
  };

  // ── New child confirm ────────────────────────────────────────────
  const handleNewChildConfirm = async (name) => {
    if (!name.trim()) { setNewChild(null); return; }
    const { parentPath, type } = newChild;
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    try {
      if (type === "file")   { await createFile(fullPath, ""); if (onOpenFile) onOpenFile({ path: fullPath, name, type: "file" }); }
      if (type === "folder") { await createFolder(fullPath); expand(fullPath); }
    } catch (e) { showError(e.response?.data?.message || e.message); }
    setNewChild(null);
  };

  // ── Root-level create ────────────────────────────────────────────
  const handleRootNewConfirm = async (name) => {
    if (!name.trim()) { setRootNew(null); return; }
    try {
      if (rootNew.type === "file")   { await createFile(name, ""); if (onOpenFile) onOpenFile({ path: name, name, type: "file" }); }
      if (rootNew.type === "folder") { await createFolder(name); expand(name); }
    } catch (e) { showError(e.response?.data?.message || e.message); }
    setRootNew(null);
  };

  // ── Rename confirm ────────────────────────────────────────────────
  const handleRenameConfirm = async (item, newName) => {
    setRenaming(null);
    if (!newName.trim() || newName === item.name) return;
    const dir     = dirOfItem(item.type === "directory" ? null : item);
    const newPath = dir ? `${dir}/${newName}` : newName;
    try { await renameItem(item.path, newPath); }
    catch (e) { showError(e.response?.data?.message || e.message); }
  };

  // ── Drag & drop ───────────────────────────────────────────────────
  const handleDragStart = (item)   => setDragState({ item, over: null });
  const handleDragOver  = (target) => setDragState((s) => ({ ...s, over: target.path }));
  const handleDragEnd   = ()       => setDragState({ item: null, over: null });
  const handleDrop      = async (target) => {
    const { item } = dragState;
    setDragState({ item: null, over: null });
    if (!item || item.path === target.path) return;
    const destDir  = target.type === "directory" ? target.path : dirOfItem(target);
    const destPath = destDir ? `${destDir}/${item.name}` : item.name;
    if (destPath === item.path) return;
    try { await moveItem(item.path, destPath); }
    catch (e) { showError(e.response?.data?.message || e.message); }
  };

  // ── Context menu open ─────────────────────────────────────────────
  const handleContextMenu = (e, item) => {
    const margin = 8;
    const menuH  = 280;
    const menuW  = 186;
    let x = e.clientX + margin;
    let y = e.clientY + margin;
    if (x + menuW > window.innerWidth)  x = e.clientX - menuW - margin;
    if (y + menuH > window.innerHeight) y = e.clientY - menuH - margin;
    setCtxMenu({ x, y, item, isRoot: false });
  };

  const filteredTree = search ? filterTree(tree, search.toLowerCase()) : tree;

  return (
    <div ref={containerRef} className="flex flex-col h-full select-none"
      style={{ background: "#1e1e1e", color: "#cccccc", fontFamily: "Consolas, 'JetBrains Mono', monospace" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b"
        style={{ borderColor: "#2d2d2d", minHeight: 34 }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#bbbbbb" }}>EXPLORER</span>
        <div className="flex items-center gap-0.5">
          <button title="New File" onClick={() => setRootNew({ type: "file" })}
            className="w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-white/10 transition-colors"
            style={{ color: "#cccccc" }}>📄</button>
          <button title="New Folder" onClick={() => setRootNew({ type: "folder" })}
            className="w-6 h-6 flex items-center justify-center rounded text-sm hover:bg-white/10 transition-colors"
            style={{ color: "#cccccc" }}>📁</button>
          <button title="Refresh" onClick={refresh}
            className="w-6 h-6 flex items-center justify-center rounded text-xs hover:bg-white/10 transition-colors"
            style={{ color: loading ? "#569cd6" : "#cccccc" }}>⟳</button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-2 py-1.5 border-b" style={{ borderColor: "#2d2d2d" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files…"
          className="w-full text-xs px-2 py-1 rounded outline-none"
          style={{ background: "#3c3c3c", border: "1px solid #555", color: "#d4d4d4" }} />
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-3 py-1.5 text-xs" style={{ background: "#5a1d1d", color: "#f88070", borderBottom: "1px solid #6e2020" }}>
            ⚠ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tree ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1"
        onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); handleContextMenu(e, null); setCtxMenu(c => c ? { ...c, isRoot: true } : null); } }}>

        {/* Root-level new item input */}
        {rootNew && (
          <div className="flex items-center gap-1 px-4 py-0.5">
            <span className="text-sm">{rootNew.type === "file" ? "📄" : "📁"}</span>
            <InlineInput placeholder={rootNew.type === "file" ? "filename.ext" : "folder-name"}
              onConfirm={handleRootNewConfirm} onCancel={() => setRootNew(null)} />
          </div>
        )}

        {loading && tree.length === 0 && (
          <div className="px-4 py-4 text-xs" style={{ color: "#858585" }}>Loading…</div>
        )}

        {!loading && filteredTree.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs mb-2" style={{ color: "#858585" }}>
              {search ? "No files match your search" : "No files yet"}
            </p>
            {!search && (
              <button onClick={() => setRootNew({ type: "file" })}
                className="text-xs px-3 py-1.5 rounded" style={{ background: "#0e639c", color: "white" }}>
                + Create File
              </button>
            )}
          </div>
        )}

        {filteredTree.map((item) => (
          <TreeNode key={item.path} item={item} depth={0}
            expanded={expanded} selected={selected}
            renaming={renaming} newChild={newChild}
            dragState={dragState}
            onDragStart={handleDragStart} onDragOver={handleDragOver}
            onDrop={handleDrop} onDragEnd={handleDragEnd}
            onToggle={(path) => setExpanded((s) => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n; })}
            onSelect={setSelected}
            onClick={(item) => { if (item.type === "file" && onOpenFile) onOpenFile(item); }}
            onContextMenu={handleContextMenu}
            onRenameConfirm={handleRenameConfirm}
            onRenameCancel={() => setRenaming(null)}
            onNewChildConfirm={handleNewChildConfirm}
            onNewChildCancel={() => setNewChild(null)}
          />
        ))}

        {/* Invisible drop zone for root */}
        <div className="h-8" onContextMenu={(e) => { e.preventDefault(); handleContextMenu(e, null); }} />
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} item={ctxMenu.item}
          isRoot={!ctxMenu.item}
          onClose={() => setCtxMenu(null)}
          actions={actions}
        />
      )}
    </div>
  );
}
