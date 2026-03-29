// backend/socket/socket.js

const activeUsers = {};
const userSockets = {}; // { userId: socketId } — for direct notifications

const COLORS = [
  "#5DCAA5", "#AFA9EC", "#F0997B", "#85B7EB",
  "#FAC775", "#ED93B1", "#97C459", "#5DCAA5"
];

module.exports = (io) => {

  // ── Export io for use in controllers ──────────────────────────────
  global.io = io;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ─── Join Workspace ─────────────────────────────────────────────
    socket.on("joinWorkspace", ({ workspaceId, userId, name }) => {
      socket.join(workspaceId);
      socket.currentWorkspace = workspaceId;
      socket.currentUser      = { userId, name };

      // Track user socket for direct notifications
      userSockets[userId] = socket.id;

      if (!activeUsers[workspaceId]) activeUsers[workspaceId] = {};
      const color = COLORS[Object.keys(activeUsers[workspaceId]).length % COLORS.length];
      activeUsers[workspaceId][socket.id] = { userId, name, color, status: "online" };

      io.to(workspaceId).emit("membersUpdated", Object.values(activeUsers[workspaceId]));
      socket.emit("joinedWorkspace", { workspaceId, color });
    });

    // ─── Register user for direct notifications ──────────────────────
    socket.on("registerUser", (userId) => {
      userSockets[userId] = socket.id;
      socket.userId = userId;
    });

    // ─── Chat Message ────────────────────────────────────────────────
    socket.on("sendMessage", (data) => {
      io.to(data.workspace).emit("receiveMessage", {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    // ─── Live Cursor ─────────────────────────────────────────────────
    socket.on("cursorMove", ({ workspaceId, userId, name, line, column }) => {
      socket.to(workspaceId).emit("remoteCursor", { userId, name, line, column });
    });

    // ─── Code Change ─────────────────────────────────────────────────
    socket.on("codeChange", ({ workspaceId, userId, code, fileName }) => {
      socket.to(workspaceId).emit("remoteCodeChange", { userId, code, fileName });
    });

    // ─── Typing ──────────────────────────────────────────────────────
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

    // ─── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { currentWorkspace, currentUser } = socket;

      // Remove from userSockets
      if (socket.userId) delete userSockets[socket.userId];

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

  // ── Send notification to specific user ──────────────────────────────
  io.sendNotificationToUser = (userId, notification) => {
    const socketId = userSockets[userId?.toString()];
    if (socketId) {
      io.to(socketId).emit("newNotification", notification);
    }
  };
};
