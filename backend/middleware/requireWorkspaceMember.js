// backend/middleware/requireWorkspaceMember.js
// Reusable guard: ensures the authenticated user is a member of the workspace.
// Attaches req.workspace and req.isWorkspaceOwner for downstream controllers.

const Workspace = require("../models/Workspace");

const requireWorkspaceMember = async (req, res, next) => {
  try {
    // Support both /workspaces/:id and /workspaces/:workspaceId/...
    const workspaceId = req.params.workspaceId || req.params.id;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const userId          = req.user._id.toString();
    const isOwner         = workspace.owner.toString() === userId;
    const isMember        = (workspace.members || [])
      .some((m) => m.toString() === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    req.workspace        = workspace;
    req.isWorkspaceOwner = isOwner;
    next();
  } catch (error) {
    console.error("requireWorkspaceMember error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { requireWorkspaceMember };
