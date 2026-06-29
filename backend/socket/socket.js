// backend/socket/socket.js

const {
  createSession,
  writeToSession,
  resizeSession,
  killSession,
  hasSession,
  isRealPty,
} = require("../terminal/ptyManager");

const activeUsers = {};
const userSockets = {}; // { userId: socketId }

const COLORS = [
  "#5DCAA5", "#AFA9EC", "#F0997B", "#85B7EB",
  "#FAC775", "#ED93B1", "#97C459", "#5DCAA5",
];

module.exports = (io) => {
  // Export io for use in controllers
  global.io = io;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ─── Join Workspace ─────────────────────────────────────────────
    socket.on("joinWorkspace", ({ workspaceId, userId, name }) => {
      socket.join(workspaceId);
      socket.currentWorkspace = workspaceId;
      socket.currentUser      = { userId, name };
      userSockets[userId]     = socket.id;

      if (!activeUsers[workspaceId]) activeUsers[workspaceId] = {};
      const color = COLORS[Object.keys(activeUsers[workspaceId]).length % COLORS.length];
      activeUsers[workspaceId][socket.id] = { userId, name, color, status: "online" };

      io.to(workspaceId).emit("membersUpdated", Object.values(activeUsers[workspaceId]));
      socket.emit("joinedWorkspace", { workspaceId, color });
    });

    // ─── Register for direct notifications ──────────────────────────
    socket.on("registerUser", (userId) => {
      userSockets[userId] = socket.id;
      socket.userId = userId;
    });

    // ─── Chat Message ────────────────────────────────────────────────
    socket.on("sendMessage", async (data) => {
      try {
        const Message = require("../models/Message");
        const newMessage = await Message.create({
          workspace: data.workspace,
          sender:    data.userId,
          message:   data.text,
        });
        io.to(data.workspace).emit("receiveMessage", {
          workspace: data.workspace,
          userId:    data.userId,
          name:      data.name,
          text:      data.text,
          timestamp: newMessage.createdAt || new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error saving socket message:", err);
        // Fallback: emit anyway so it shows in UI even if DB fails
        io.to(data.workspace).emit("receiveMessage", {
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    });

    // ─── Live Cursor ─────────────────────────────────────────────────
    socket.on("cursorMove", ({ workspaceId, userId, name, line, column }) => {
      socket.to(workspaceId).emit("remoteCursor", { userId, name, line, column });
    });

    // ─── Code Change ─────────────────────────────────────────────────
    socket.on("codeChange", ({ workspaceId, userId, code, fileName }) => {
      socket.to(workspaceId).emit("remoteCodeChange", { userId, code, fileName });
    });

    // ─── Typing indicator ─────────────────────────────────────────────
    socket.on("typing", ({ workspaceId, userId, name, isTyping }) => {
      socket.to(workspaceId).emit("userTyping", { userId, name, isTyping });
    });

    // ─── Status Change ───────────────────────────────────────────────
    socket.on("statusChange", ({ workspaceId, userId, status }) => {
      if (activeUsers[workspaceId]?.[socket.id]) {
        activeUsers[workspaceId][socket.id].status = status;
        io.to(workspaceId).emit("membersUpdated", Object.values(activeUsers[workspaceId]));
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // PTY TERMINAL EVENTS
    // Each user gets their own private PTY session per workspace
    // ─────────────────────────────────────────────────────────────────

    // terminal:create — spawn a shell for this user in this workspace
    socket.on("terminal:create", ({ workspaceId, userId, termId = "default", cols, rows }) => {
      try {
        createSession(workspaceId, userId, termId, {
          cols: cols || 80,
          rows: rows || 24,
          onData: (data) => {
            socket.emit("terminal:output", { termId, data });
          },
          onExit: (code) => {
            socket.emit("terminal:exit", { termId, code });
          },
        });
        socket.emit("terminal:ready", { termId, workspaceId, isPty: isRealPty() });
        console.log(`PTY created for user ${userId} in workspace ${workspaceId} with termId: ${termId}`);
      } catch (err) {
        socket.emit("terminal:error", { termId, message: err.message });
      }
    });

    // terminal:input — user typed something
    socket.on("terminal:input", ({ workspaceId, userId, termId = "default", data }) => {
      writeToSession(workspaceId, userId, termId, data);
    });

    // terminal:resize — user resized the terminal window
    socket.on("terminal:resize", ({ workspaceId, userId, termId = "default", cols, rows }) => {
      resizeSession(workspaceId, userId, termId, cols, rows);
    });

    // terminal:kill — user closed the terminal
    socket.on("terminal:kill", ({ workspaceId, userId, termId = "default" }) => {
      killSession(workspaceId, userId, termId);
    });

    // ─────────────────────────────────────────────────────────────────
    // File system change notifications (broadcast to workspace members)
    // ─────────────────────────────────────────────────────────────────
    socket.on("fs:changed", ({ workspaceId, event, path }) => {
      // Broadcast to other members so their file explorers refresh
      socket.to(workspaceId).emit("fs:changed", { event, path });
    });

    // ─── Kanban Task Changes ──────────────────────────────────────────
    socket.on("task:changed", ({ workspaceId }) => {
      socket.to(workspaceId).emit("task:changed");
    });

    // ─── Global online users ──────────────────────────────────────────
    socket.on("getOnlineUsers", () => {
      const all = [];
      Object.values(activeUsers).forEach((wsUsers) => {
        Object.values(wsUsers).forEach((u) => {
          if (!all.find((x) => x.userId === u.userId)) all.push(u);
        });
      });
      socket.emit("globalOnlineUsers", all);
    });

    // ─── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { currentWorkspace, currentUser } = socket;

      if (socket.userId) delete userSockets[socket.userId];

      // Kill all user PTY sessions on disconnect
      const { killAllUserSessions } = require("../terminal/ptyManager");
      if (currentUser?.userId && currentWorkspace) {
        killAllUserSessions(currentWorkspace, currentUser.userId);
      }

      if (currentWorkspace && activeUsers[currentWorkspace]) {
        delete activeUsers[currentWorkspace][socket.id];
        if (Object.keys(activeUsers[currentWorkspace]).length === 0) {
          delete activeUsers[currentWorkspace];
        } else {
          io.to(currentWorkspace).emit(
            "membersUpdated",
            Object.values(activeUsers[currentWorkspace])
          );
        }
      }
      console.log(`${currentUser?.name || "User"} disconnected`);
    });
  });

  // Send notification to specific user
  io.sendNotificationToUser = (userId, notification) => {
    const socketId = userSockets[userId?.toString()];
    if (socketId) io.to(socketId).emit("newNotification", notification);
  };
};
