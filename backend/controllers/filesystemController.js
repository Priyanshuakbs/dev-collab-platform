// backend/controllers/filesystemController.js
// Real filesystem operations per workspace — with path traversal protection

const path = require("path");
const fs   = require("fs");
const { getWorkspaceDir } = require("../terminal/ptyManager");

// ── Safe path resolution ──────────────────────────────────────────────
function safePath(workspaceId, userPath = "") {
  const base    = getWorkspaceDir(workspaceId);
  const cleaned = String(userPath)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter((seg) => seg !== ".." && seg !== ".")
    .join("/");
  const resolved = path.resolve(base, cleaned);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Path traversal attempt blocked");
  }
  return resolved;
}

// ── Build recursive directory tree ────────────────────────────────────
function buildTree(dirPath, baseDir, depth = 0) {
  if (depth > 10) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .map((entry) => {
        const fullPath    = path.join(dirPath, entry.name);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          return {
            name:     entry.name,
            path:     relativePath,
            type:     "directory",
            children: buildTree(fullPath, baseDir, depth + 1),
          };
        }
        const stat = fs.statSync(fullPath);
        return {
          name:     entry.name,
          path:     relativePath,
          type:     "file",
          size:     stat.size,
          modified: stat.mtime,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  } catch {
    return [];
  }
}

// ── GET /api/fs/:workspaceId ──────────────────────────────────────────
exports.listTree = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const base = getWorkspaceDir(workspaceId);
    res.json({ tree: buildTree(base, base), workspaceId });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /api/fs/:workspaceId/read?path=src/main.py ────────────────────
exports.readFile = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const filePath = safePath(workspaceId, req.query.path || "");
    if (!fs.existsSync(filePath))       return res.status(404).json({ message: "File not found" });
    if (fs.statSync(filePath).isDirectory()) return res.status(400).json({ message: "Path is a directory" });
    const size = fs.statSync(filePath).size;
    if (size > 5 * 1024 * 1024)        return res.status(413).json({ message: "File too large (max 5 MB)" });
    res.json({ content: fs.readFileSync(filePath, "utf-8"), path: req.query.path, size });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── POST /api/fs/:workspaceId/write ──────────────────────────────────
exports.writeFile = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { path: userPath, content = "" } = req.body;
    if (!userPath) return res.status(400).json({ message: "path is required" });
    const filePath = safePath(workspaceId, userPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    res.json({ message: "Saved", path: userPath });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── POST /api/fs/:workspaceId/mkdir ──────────────────────────────────
exports.mkdir = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { path: userPath } = req.body;
    if (!userPath) return res.status(400).json({ message: "path is required" });
    fs.mkdirSync(safePath(workspaceId, userPath), { recursive: true });
    res.json({ message: "Directory created", path: userPath });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── POST /api/fs/:workspaceId/rename ─────────────────────────────────
exports.rename = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ message: "oldPath and newPath required" });
    const srcFull = safePath(workspaceId, oldPath);
    const dstFull = safePath(workspaceId, newPath);
    if (!fs.existsSync(srcFull)) return res.status(404).json({ message: "Source not found" });
    fs.mkdirSync(path.dirname(dstFull), { recursive: true });
    fs.renameSync(srcFull, dstFull);
    res.json({ message: "Renamed", oldPath, newPath });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── DELETE /api/fs/:workspaceId?path=file.js ──────────────────────────
exports.deleteItem = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userPath = req.query.path || req.body?.path;
    if (!userPath) return res.status(400).json({ message: "path is required" });
    const fullPath = safePath(workspaceId, userPath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "Not found" });
    fs.rmSync(fullPath, { recursive: true, force: true });
    res.json({ message: "Deleted", path: userPath });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── POST /api/fs/:workspaceId/move ────────────────────────────────────
exports.move = (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { srcPath, destPath } = req.body;
    if (!srcPath || !destPath) return res.status(400).json({ message: "srcPath and destPath required" });
    const srcFull  = safePath(workspaceId, srcPath);
    const destFull = safePath(workspaceId, destPath);
    if (!fs.existsSync(srcFull)) return res.status(404).json({ message: "Source not found" });
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.renameSync(srcFull, destFull);
    res.json({ message: "Moved", srcPath, destPath });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
