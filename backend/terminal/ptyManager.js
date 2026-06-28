// backend/terminal/ptyManager.js
// Manages per-user PTY sessions backed by node-pty (real PTY) or spawn (fallback)
// Supports multiple terminals using a terminal ID (termId)

const path = require("path");
const fs   = require("fs");
const { spawn } = require("child_process");

const WORKSPACES_DIR = path.join(__dirname, "..", "workspaces");

// ── Try node-pty ──────────────────────────────────────────────────────
let nodePty = null;
try {
  nodePty = require("node-pty");
  console.log("✅ node-pty loaded — real PTY sessions active");
} catch (e) {
  console.warn("⚠️  node-pty unavailable — using spawn fallback (limited interactivity)");
}

// Active sessions: key = `${workspaceId}::${userId}::${termId}`
const sessions = {};

// ── Helpers ───────────────────────────────────────────────────────────
function getWorkspaceDir(workspaceId) {
  const dir = path.join(WORKSPACES_DIR, String(workspaceId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safePath(workspaceId, userPath = "") {
  const base     = getWorkspaceDir(workspaceId);
  const cleaned  = userPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = path.resolve(base, cleaned);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Path traversal attempt blocked");
  }
  return resolved;
}

// ── Session management ────────────────────────────────────────────────
function createSession(workspaceId, userId, termId = "default", { onData, onExit, cols = 80, rows = 24 }) {
  const key = `${workspaceId}::${userId}::${termId}`;
  const cwd = getWorkspaceDir(workspaceId);

  // Kill previous session if any with the same ID
  if (sessions[key]) {
    try { sessions[key].kill(); } catch (_) {}
    delete sessions[key];
  }

  let session = null;

  if (nodePty) {
    try {
      // ── Real PTY via node-pty ──────────────────────────────────────
      const isWin  = process.platform === "win32";
      const shell  = isWin ? "cmd.exe" : (process.env.SHELL || "bash"); // use cmd on Windows for best winpty compatibility
      const args   = [];

      const proc = nodePty.spawn(shell, args, {
        name:  "xterm-256color",
        cols,
        rows,
        cwd,
        useConpty: false, // IMPORTANT: Disables buggy Windows ConPTY to prevent AttachConsole crashes
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          FORCE_COLOR: "1",
        },
      });

      let idleTimer = null;
      const resetIdle = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => killSession(workspaceId, userId, termId), 30 * 60 * 1000);
      };
      resetIdle();

      proc.onData((data) => { resetIdle(); onData(data); });
      proc.onExit(({ exitCode }) => {
        if (idleTimer) clearTimeout(idleTimer);
        delete sessions[key];
        onExit(exitCode ?? 0);
      });

      session = {
        type: "pty",
        write:  (data)       => { resetIdle(); try { proc.write(data); } catch (_) {} },
        resize: (c, r)       => { try { proc.resize(c, r); } catch (_) {} },
        kill:   ()           => { if (idleTimer) clearTimeout(idleTimer); try { proc.kill(); } catch (_) {} },
      };
    } catch (ptyError) {
      console.warn("⚠️ node-pty spawn failed, falling back to spawn shell:", ptyError.message);
      session = null;
    }
  }

  // Fallback if node-pty is disabled or spawn fails
  if (!session) {
    // ── Spawn-based fallback ───────────────────────────────────────
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : (process.env.SHELL || "/bin/bash");
    const args  = isWin ? [] : ["-i"];

    const proc = spawn(shell, args, {
      cwd,
      env: { ...process.env, TERM: "dumb", FORCE_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Send a welcome prompt
    setTimeout(() => {
      const prompt = isWin ? `${cwd}> ` : `$ `;
      onData(`\r\nDevCollab Terminal Fallback — workspace: ${workspaceId} (${termId})\r\n${prompt}`);
    }, 150);

    proc.stdout.on("data", (d) => onData(d.toString()));
    proc.stderr.on("data", (d) => onData(d.toString()));
    proc.on("close", (code) => { delete sessions[key]; onExit(code ?? 0); });
    proc.on("error", (err) => onData(`\r\n[Error: ${err.message}]\r\n`));

    session = {
      type: "spawn",
      write:  (data) => { try { proc.stdin.write(data); } catch (_) {} },
      resize: ()     => {},
      kill:   ()     => { try { proc.kill("SIGTERM"); } catch (_) {} },
    };
  }

  sessions[key] = session;
  return key;
}

function writeToSession(workspaceId, userId, termId = "default", data) {
  const s = sessions[`${workspaceId}::${userId}::${termId}`];
  if (!s) return false;
  s.write(data);
  return true;
}

function resizeSession(workspaceId, userId, termId = "default", cols, rows) {
  const s = sessions[`${workspaceId}::${userId}::${termId}`];
  if (!s) return false;
  s.resize(cols, rows);
  return true;
}

function killSession(workspaceId, userId, termId = "default") {
  const key = `${workspaceId}::${userId}::${termId}`;
  const s   = sessions[key];
  if (!s) return;
  try { s.kill(); } catch (_) {}
  delete sessions[key];
}

function killAllUserSessions(workspaceId, userId) {
  const prefix = `${workspaceId}::${userId}::`;
  Object.keys(sessions).forEach((key) => {
    if (key.startsWith(prefix)) {
      try { sessions[key].kill(); } catch (_) {}
      delete sessions[key];
    }
  });
}

function hasSession(workspaceId, userId, termId = "default") {
  return !!sessions[`${workspaceId}::${userId}::${termId}`];
}

module.exports = {
  getWorkspaceDir,
  safePath,
  createSession,
  writeToSession,
  resizeSession,
  killSession,
  killAllUserSessions,
  hasSession,
  isRealPty: () => !!nodePty,
};
