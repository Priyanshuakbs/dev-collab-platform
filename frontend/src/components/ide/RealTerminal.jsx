// frontend/src/components/ide/RealTerminal.jsx
// xterm.js terminal with multi-instance tab support connected to backend PTY via socket.io

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon }  from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import socket from "../../socket/socket";

// VS Code Dark+ theme
const VS_THEME = {
  background:          "#1e1e1e",
  foreground:          "#d4d4d4",
  cursor:              "#aeafad",
  cursorAccent:        "#1e1e1e",
  selectionBackground: "rgba(255,255,255,0.15)",
  black:               "#1e1e1e",  brightBlack:   "#808080",
  red:                 "#f44747",  brightRed:     "#f44747",
  green:               "#6a9955",  brightGreen:   "#b5cea8",
  yellow:              "#d7ba7d",  brightYellow:  "#d7ba7d",
  blue:                "#569cd6",  brightBlue:    "#9cdcfe",
  magenta:             "#c678dd",  brightMagenta: "#c678dd",
  cyan:                "#4ec9b0",  brightCyan:    "#4ec9b0",
  white:               "#d4d4d4",  brightWhite:   "#e8e8e8",
};

const RealTerminal = forwardRef(({ workspaceId, userId, onFsChanged }, ref) => {
  const [terminals, setTerminals] = useState([{ id: "default", name: "terminal-1" }]);
  const [activeTermId, setActiveTermId] = useState("default");
  const instancesRef = useRef({}); // { [termId]: { term, fit, container, observer, status } }

  // Expose runCommand method to parent (Workspace.jsx)
  useImperativeHandle(ref, () => ({
    runCommand(cmd) {
      socket.emit("terminal:input", { workspaceId, userId, termId: activeTermId, data: cmd });
    }
  }));

  // ── Initialize a specific terminal instance ─────────────────────────
  const initTerminal = useCallback((termId, containerEl) => {
    if (instancesRef.current[termId]) {
      instancesRef.current[termId].container = containerEl;
      return;
    }

    const term = new Terminal({
      theme:           VS_THEME,
      fontFamily:      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontSize:        13,
      lineHeight:      1.4,
      cursorBlink:     true,
      cursorStyle:     "bar",
      allowTransparency: false,
      scrollback:      5000,
      convertEol:      true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerEl);

    setTimeout(() => { try { fit.fit(); } catch (_) {} }, 50);

    // Forward terminal input to backend PTY
    term.onData((data) => {
      socket.emit("terminal:input", { workspaceId, userId, termId, data });
    });

    // Handle resizing
    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
        const { cols, rows } = term;
        socket.emit("terminal:resize", { workspaceId, userId, termId, cols, rows });
      } catch (_) {}
    });
    observer.observe(containerEl);

    instancesRef.current[termId] = {
      term,
      fit,
      container: containerEl,
      observer,
      status: "connecting",
    };

    // Create session on backend
    const { cols, rows } = term;
    socket.emit("terminal:create", { workspaceId, userId, termId, cols, rows });
  }, [workspaceId, userId]);

  // ── Global socket response event routing ────────────────────────────
  useEffect(() => {
    const onOutput = ({ termId, data }) => {
      instancesRef.current[termId]?.term.write(data);
    };

    const onExit = ({ termId, code }) => {
      const inst = instancesRef.current[termId];
      if (inst) {
        inst.term.write(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`);
        inst.status = "disconnected";
      }
    };

    const onReady = ({ termId, isPty }) => {
      const inst = instancesRef.current[termId];
      if (inst) {
        inst.status = "ready";
        inst.isPty = isPty;
      }
    };

    const onError = ({ termId, message }) => {
      const inst = instancesRef.current[termId];
      if (inst) {
        inst.term.write(`\r\n\x1b[31m[Terminal error: ${message}]\x1b[0m\r\n`);
        inst.status = "disconnected";
      }
    };

    const onFsChange = () => {
      onFsChanged?.();
    };

    socket.on("terminal:output", onOutput);
    socket.on("terminal:exit",   onExit);
    socket.on("terminal:ready",  onReady);
    socket.on("terminal:error",  onError);
    socket.on("fs:changed",      onFsChange);

    return () => {
      socket.off("terminal:output", onOutput);
      socket.off("terminal:exit",   onExit);
      socket.off("terminal:ready",  onReady);
      socket.off("terminal:error",  onError);
      socket.off("fs:changed",      onFsChange);
    };
  }, [onFsChanged]);

  // ── Cleanup all terminal instances on unmount ───────────────────────
  useEffect(() => {
    return () => {
      Object.keys(instancesRef.current).forEach((termId) => {
        socket.emit("terminal:kill", { workspaceId, userId, termId });
        const inst = instancesRef.current[termId];
        inst.observer?.disconnect();
        inst.term?.dispose();
      });
      instancesRef.current = {};
    };
  }, [workspaceId, userId]);

  // ── Tab Management Actions ──────────────────────────────────────────
  const handleSelectTerminal = (termId) => {
    setActiveTermId(termId);
    setTimeout(() => {
      try { instancesRef.current[termId]?.fit.fit(); } catch (_) {}
    }, 25);
  };

  const handleAddTerminal = () => {
    const newId = `term-${Date.now()}`;
    const nextNum = terminals.length + 1;
    setTerminals((prev) => [...prev, { id: newId, name: `terminal-${nextNum}` }]);
    setActiveTermId(newId);
  };

  const handleKillTerminal = (termId) => {
    if (terminals.length <= 1) return;

    socket.emit("terminal:kill", { workspaceId, userId, termId });

    const inst = instancesRef.current[termId];
    if (inst) {
      inst.observer?.disconnect();
      inst.term?.dispose();
      delete instancesRef.current[termId];
    }

    setTerminals((prev) => {
      const idx = prev.findIndex((t) => t.id === termId);
      const nextList = prev.filter((t) => t.id !== termId);
      if (activeTermId === termId) {
        const nextActive = nextList[idx] || nextList[idx - 1] || nextList[0];
        setActiveTermId(nextActive.id);
        setTimeout(() => {
          try { instancesRef.current[nextActive.id]?.fit.fit(); } catch (_) {}
        }, 25);
      }
      return nextList;
    });
  };

  const handleRestartActive = () => {
    const termId = activeTermId;
    socket.emit("terminal:kill", { workspaceId, userId, termId });
    const inst = instancesRef.current[termId];
    if (inst) {
      inst.term.clear();
      inst.status = "connecting";
      const { cols, rows } = inst.term;
      socket.emit("terminal:create", { workspaceId, userId, termId, cols, rows });
    }
  };

  const handleClearActive = () => {
    instancesRef.current[activeTermId]?.term.clear();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
      {/* Status & Tab bar */}
      <div className="flex items-center justify-between px-3 py-1 flex-shrink-0 border-b"
        style={{ background: "#252526", borderColor: "#3c3c3c", minHeight: 28 }}>
        
        {/* Left Side: Terminals tabs */}
        <div className="flex items-center overflow-x-auto gap-1 pr-4" style={{ maxWidth: "calc(100% - 180px)" }}>
          {terminals.map((t) => {
            const isActive = t.id === activeTermId;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectTerminal(t.id)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors text-[10px] uppercase font-bold tracking-wider flex-shrink-0"
                style={{
                  background: isActive ? "#1e1e1e" : "transparent",
                  color: isActive ? "#ffffff" : "#858585",
                  border: isActive ? "1px solid #3c3c3c" : "1px solid transparent",
                }}
              >
                <span>🖥 {t.name}</span>
                {terminals.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleKillTerminal(t.id); }}
                    className="hover:bg-white/10 rounded w-3.5 h-3.5 flex items-center justify-center text-[9px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Add terminal button */}
          <button
            onClick={handleAddTerminal}
            title="New Terminal"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-xs transition-colors"
            style={{ color: "#cccccc" }}
          >
            +
          </button>
        </div>

        {/* Right Side: Options */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleRestartActive} title="Restart terminal"
            className="text-[10px] px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "#cccccc" }}>⟳ Restart</button>
          <button onClick={handleClearActive} title="Clear terminal"
            className="text-[10px] px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "#cccccc" }}>⌫ Clear</button>
        </div>
      </div>

      {/* Terminal Containers */}
      <div className="flex-1 relative overflow-hidden" style={{ padding: "4px 8px" }}>
        {terminals.map((t) => (
          <div
            key={t.id}
            ref={(el) => { if (el) initTerminal(t.id, el); }}
            className="w-full h-full"
            style={{ display: t.id === activeTermId ? "block" : "none" }}
          />
        ))}
      </div>
    </div>
  );
});

RealTerminal.displayName = "RealTerminal";

export default RealTerminal;
