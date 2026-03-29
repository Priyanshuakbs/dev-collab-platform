const Workspace = require("../models/Workspace");

// ── Create Workspace ─────────────────────────────────────────────────
exports.createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.create({
      name:    name.trim(),
      owner:   req.user._id,
      members: [req.user._id], // owner auto-added as member
    });

    console.log(`✅ Workspace created: ${workspace._id} by user ${req.user._id}`);
    res.status(201).json(workspace);
  } catch (error) {
    console.error("createWorkspace error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Get all workspaces for current user ──────────────────────────────
exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner:   req.user._id },
        { members: req.user._id },
      ],
    }).sort({ createdAt: -1 });

    res.json(workspaces);
  } catch (error) {
    console.error("getWorkspaces error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Get single workspace by ID ───────────────────────────────────────
exports.getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate("owner",   "name email avatar")
      .populate("members", "name email avatar");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Access check
    const userIdStr = req.user._id.toString();
    const isOwner   = workspace.owner._id.toString() === userIdStr;
    const isMember  = workspace.members.some((m) => m._id.toString() === userIdStr);

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(workspace);
  } catch (error) {
    console.error("getWorkspaceById error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Add member to workspace ──────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only owner can add members
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace owner can add members" });
    }

    // Avoid duplicates
    if (workspace.members.map((m) => m.toString()).includes(userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    workspace.members.push(userId);
    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate("owner",   "name email avatar")
      .populate("members", "name email avatar");

    res.json(updated);
  } catch (error) {
    console.error("addMember error:", error);
    res.status(500).json({ message: error.message });
  }
};