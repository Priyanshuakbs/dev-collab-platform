// backend/middleware/requireProjectMember.js
// Reusable guard: ensures the authenticated user is a member of the project.
// Attaches req.project and req.isProjectOwner for downstream controllers.

const Project = require("../models/Project");

const requireProjectMember = async (req, res, next) => {
  try {
    // Support projectId from URL params (/projects/:id or /projects/:projectId)
    // or from the request body (e.g., POST /invitations)
    const projectId =
      req.params.projectId ||
      req.params.id ||
      req.body.projectId;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const userId      = req.user._id.toString();
    const isOwner     = project.owner.toString() === userId;
    const isMember    = (project.collaborators || [])
      .some((c) => c.toString() === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this project.",
      });
    }

    // Attach to request for use in controllers
    req.project        = project;
    req.isProjectOwner = isOwner;
    next();
  } catch (error) {
    console.error("requireProjectMember error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { requireProjectMember };
