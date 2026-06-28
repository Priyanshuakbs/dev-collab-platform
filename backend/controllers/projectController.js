// backend/controllers/projectController.js

const Project = require("../models/Project");

// ─── Helper: check if user is member ────────────────────────────────
const isMember = (project, userId) => {
  const id = userId.toString();
  return (
    project.owner.toString() === id ||
    (project.collaborators || []).some((c) => c.toString() === id)
  );
};

// ─── Create Project ──────────────────────────────────────────────────
// Owner is automatically added as the first collaborator.
exports.createProject = async (req, res) => {
  try {
    const { title, description, techStack, githubRepo, priority, deadline } = req.body;

    const project = await Project.create({
      title,
      description,
      techStack,
      githubRepo,
      priority:      priority || "medium",
      deadline:      deadline || null,
      owner:         req.user._id,
      collaborators: [req.user._id], // owner auto-joined
    });

    const populated = await project.populate("owner", "name email avatar");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Projects ──────────────────────────────────────────────────
// SECURITY: Only returns projects the authenticated user owns OR
// is a collaborator on. Never returns other users' private projects.
exports.getMyProjects = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    };
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    const projects = await Project.find(filter)
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Projects I Own ───────────────────────────────────────────────
exports.getOwnedProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Projects Shared With Me ──────────────────────────────────────
// Projects where user is a collaborator but NOT the owner.
exports.getSharedProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      collaborators: req.user._id,
      owner:         { $ne: req.user._id },
    })
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Single Project ──────────────────────────────────────────────
// SECURITY: Enforces membership check — non-members receive 403.
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name");

    if (!project) return res.status(404).json({ message: "Project not found" });

    // IDOR guard — must be owner or collaborator
    if (!isMember(project, req.user._id)) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this project.",
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update Project ──────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwner  = project.owner.toString() === req.user._id.toString();
    const isMemberCheck = (project.collaborators || [])
      .map((c) => c.toString()).includes(req.user._id.toString());

    if (!isOwner && !isMemberCheck)
      return res.status(403).json({ message: "Access denied" });

    // Only owner can change title/description/techStack etc.
    // Members can link a workspace
    const allowedFields = ["workspace"];
    if (isOwner) {
      allowedFields.push(
        "title", "description", "techStack",
        "githubRepo", "priority", "deadline", "status"
      );
    }

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Project.findByIdAndUpdate(
      req.params.id, updates, { new: true }
    )
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name");

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete Project ──────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the project owner can delete it" });

    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Leave Project ───────────────────────────────────────────────────
exports.leaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Owner cannot leave their own project" });

    project.collaborators = project.collaborators.filter(
      (c) => c.toString() !== req.user._id.toString()
    );
    await project.save();

    res.json({ message: "You have left the project" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Remove Member (owner only) ───────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the project owner can remove members" });

    project.collaborators = project.collaborators.filter(
      (c) => c.toString() !== req.params.memberId
    );
    await project.save();

    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};