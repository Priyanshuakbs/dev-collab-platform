// backend/controllers/messageController.js
// SECURITY: All endpoints require workspace membership check.

const Message   = require("../models/Message");
const Workspace = require("../models/Workspace");

// ─── Helper: verify workspace membership ──────────────────────────────
const checkMembership = async (workspaceId, userId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) return false;
  const id = userId.toString();
  return (
    ws.owner.toString() === id ||
    ws.members.some((m) => m.toString() === id)
  );
};

// ─── Save Message ──────────────────────────────────────────────────────
exports.saveMessage = async (req, res) => {
  try {
    const { workspaceId, message } = req.body;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId is required" });

    // SECURITY: only workspace members can send messages
    if (!(await checkMembership(workspaceId, req.user._id))) {
      return res.status(403).json({ message: "Access denied. Not a workspace member." });
    }

    const newMessage = await Message.create({
      workspace: workspaceId,
      sender:    req.user._id,
      message,
    });

    await newMessage.populate("sender", "name email avatar");
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Workspace Messages ────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // SECURITY: only workspace members can read messages
    if (!(await checkMembership(workspaceId, req.user._id))) {
      return res.status(403).json({ message: "Access denied. Not a workspace member." });
    }

    const messages = await Message.find({ workspace: workspaceId })
      .populate("sender", "name email avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};