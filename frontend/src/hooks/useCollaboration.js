// frontend/src/hooks/useCollaboration.js

import { useState, useEffect, useCallback } from "react";
import socket from "../socket/socket";
import api from "../services/api";

// ── Socket helpers ────────────────────────────────────────────────────
const connectSocket = () => {
  if (!socket.connected) socket.connect();
};

const joinWorkspace = (workspaceId, userId, name) => {
  socket.emit("joinWorkspace", { workspaceId, userId, name });
};

const sendMessage = (workspace, userId, name, text, fileUrl = "", fileType = "", fileName = "") => {
  socket.emit("sendMessage", {
    workspace, userId, name, text, fileUrl, fileType, fileName,
    timestamp: new Date().toISOString(),
  });
};

const emitCursorMove = (workspaceId, userId, name, line, column) => {
  socket.emit("cursorMove", { workspaceId, userId, name, line, column });
};

const emitCodeChange = (workspaceId, userId, code, fileName) => {
  socket.emit("codeChange", { workspaceId, userId, code, fileName });
};

const emitTyping = (workspaceId, userId, name, isTyping) => {
  socket.emit("typing", { workspaceId, userId, name, isTyping });
};

const emitStatus = (workspaceId, userId, status) => {
  socket.emit("statusChange", { workspaceId, userId, status });
};

// ── Main Hook ─────────────────────────────────────────────────────────
export const useCollaboration = (workspaceId, currentUser) => {
  const [members,       setMembers]       = useState([]);
  const [messages,      setMessages]      = useState([]);
  const [code,          setCode]          = useState("");
  const [remoteCursors, setRemoteCursors] = useState({});
  const [typingUsers,   setTypingUsers]   = useState([]);
  const [isConnected,   setIsConnected]   = useState(false);

  useEffect(() => {
    if (!workspaceId || !currentUser) return;

    connectSocket();

    // Fetch previous messages
    api.get(`/messages/${workspaceId}`)
      .then((res) => {
        const normalized = (res.data || []).map((msg) => ({
          workspace: msg.workspace,
          userId:    msg.sender?._id || msg.sender,
          name:      msg.sender?.name || "Unknown",
          text:      msg.message,
          fileUrl:   msg.fileUrl || "",
          fileType:  msg.fileType || "",
          fileName:  msg.fileName || "",
          timestamp: msg.createdAt,
        }));
        setMessages(normalized);
      })
      .catch((err) => {
        console.error("Failed to load chat history:", err);
      });

    socket.on("connect", () => {
      setIsConnected(true);

      // Join workspace room
      joinWorkspace(workspaceId, currentUser._id, currentUser.name);

      // Register user for direct real-time notifications
      socket.emit("registerUser", currentUser._id);
    });

    // If already connected, register immediately
    if (socket.connected) {
      setIsConnected(true);
      joinWorkspace(workspaceId, currentUser._id, currentUser.name);
      socket.emit("registerUser", currentUser._id);
    }

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("membersUpdated", (updatedMembers) => {
      setMembers(updatedMembers);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("remoteCursor", ({ userId, name, line, column }) => {
      setRemoteCursors((prev) => ({ ...prev, [userId]: { name, line, column } }));
    });

    socket.on("remoteCodeChange", ({ userId, code: remoteCode }) => {
      if (userId !== currentUser._id) setCode(remoteCode);
    });

    socket.on("userTyping", ({ userId, name, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping
          ? [...new Set([...prev, name])]
          : prev.filter((n) => n !== name)
      );
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("membersUpdated");
      socket.off("receiveMessage");
      socket.off("remoteCursor");
      socket.off("remoteCodeChange");
      socket.off("userTyping");
    };
  }, [workspaceId, currentUser]);

  // ── Actions ──────────────────────────────────────────────────────────

  const sendChat = useCallback((text, fileUrl = "", fileType = "", fileName = "") => {
    sendMessage(workspaceId, currentUser._id, currentUser.name, text, fileUrl, fileType, fileName);
  }, [workspaceId, currentUser]);

  const updateCode = useCallback((newCode, fileName = "main.js") => {
    setCode(newCode);
    emitCodeChange(workspaceId, currentUser._id, newCode, fileName);
    emitStatus(workspaceId, currentUser._id, "editing");
  }, [workspaceId, currentUser]);

  const moveCursor = useCallback((line, column) => {
    emitCursorMove(workspaceId, currentUser._id, currentUser.name, line, column);
  }, [workspaceId, currentUser]);

  const setTyping = useCallback((isTyping) => {
    emitTyping(workspaceId, currentUser._id, currentUser.name, isTyping);
  }, [workspaceId, currentUser]);

  return {
    isConnected,
    members,
    messages,
    code,
    remoteCursors,
    typingUsers,
    sendChat,
    updateCode,
    moveCursor,
    setTyping,
  };
};
