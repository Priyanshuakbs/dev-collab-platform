// backend/controllers/projectController.js

const Project = require("../models/Project");

// ─── Create Project ──────────────────────────────────────────────────
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
      collaborators: [req.user._id],
    });

    const populated = await project.populate("owner", "name email avatar");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get All Projects ────────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Projects ─────────────────────────────────────────────────
exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name")          // ✅ workspace bhi populate karo
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Single Project ──────────────────────────────────────────────
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner",         "name email avatar")
      .populate("collaborators", "name email avatar")
      .populate("workspace",     "name");         // ✅ workspace bhi

    if (!project) return res.status(404).json({ message: "Project not found" });

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

    // ✅ FIX: owner aur collaborators dono update kar sakte hain
    // (workspace link karne ke liye collaborator bhi update karega)
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = (project.collaborators || [])
      .map((c) => c.toString())
      .includes(req.user._id.toString());

    if (!isOwner && !isMember)
      return res.status(403).json({ message: "Access denied" });

    // Sirf owner hi title/description/techStack update kar sakta hai
    // Lekin workspace field koi bhi member update kar sakta hai
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
      req.params.id,
      updates,
      { new: true }
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
      return res.status(403).json({ message: "Only owner can delete" });

    await project.deleteOne();
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Join Project ────────────────────────────────────────────────────
exports.joinProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const alreadyIn = (project.collaborators || [])
      .map((c) => c.toString())
      .includes(req.user._id.toString());

    if (!alreadyIn) {
      project.collaborators.push(req.user._id);
      await project.save();
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Leave Project ───────────────────────────────────────────────────
exports.leaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.collaborators = project.collaborators.filter(
      (c) => c.toString() !== req.user._id.toString()
    );
    await project.save();

    res.json({ message: "Left project" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Remove Member ───────────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only owner can remove members" });

    project.collaborators = project.collaborators.filter(
      (c) => c.toString() !== req.params.memberId
    );
    await project.save();

    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};