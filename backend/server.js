require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const http    = require("http");
const { Server } = require("socket.io");

const connectDB     = require("./config/db");
const socketHandler = require("./socket/socket");

// ── Routes ──────────────────────────────────────────────────────────
const authRoutes         = require("./routes/authRoutes");
const userRoutes         = require("./routes/userRoutes");
const projectRoutes      = require("./routes/projectRoutes");
const workspaceRoutes    = require("./routes/workspaceRoutes");
const invitationRoutes   = require("./routes/invitationRoutes");
const messageRoutes      = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const fileRoutes         = require("./routes/fileRoutes");
const taskRoutes         = require("./routes/taskRoutes");
const aiRoutes           = require("./routes/aiRoutes");

connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── API Routes ───────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/invitations",   invitationRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai",            aiRoutes);

// ⚠️ IMPORTANT: nested routes BEFORE the base /workspaces route
app.use("/api/workspaces/:workspaceId/files", fileRoutes);
app.use("/api/workspaces/:workspaceId/tasks", taskRoutes);
app.use("/api/workspaces",    workspaceRoutes);

app.get("/", (req, res) => res.json({ message: "Dev Collab API running ✅" }));

// ── Socket.io ────────────────────────────────────────────────────────
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });
socketHandler(io);

// ── Graceful shutdown (port release on Ctrl+C) ───────────────────────
process.on("SIGINT",  () => { server.close(); process.exit(0); });
process.on("SIGTERM", () => { server.close(); process.exit(0); });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));