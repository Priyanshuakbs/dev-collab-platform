// backend/routes/projectRoutes.js

const express = require("express");
const router  = express.Router();
const {
  createProject,
  getMyProjects,
  getOwnedProjects,
  getSharedProjects,
  getProjectById,
  updateProject,
  deleteProject,
  leaveProject,
  removeMember,
} = require("../controllers/projectController");

const { protect }              = require("../middleware/authMiddleware");
const { requireProjectMember } = require("../middleware/requireProjectMember");

// ── Collection routes ────────────────────────────────────────────────
router.post("/",         protect, createProject);   // create project
router.get("/mine",      protect, getMyProjects);   // all projects user is in
router.get("/owned",     protect, getOwnedProjects);  // projects user owns
router.get("/shared",    protect, getSharedProjects); // shared with user

// ── Single project routes (requireProjectMember enforces membership) ─
router.get(   "/:id",                   protect, getProjectById);         // has internal membership check
router.put(   "/:id",                   protect, requireProjectMember, updateProject);
router.delete("/:id",                   protect, requireProjectMember, deleteProject);
router.post(  "/:id/leave",             protect, requireProjectMember, leaveProject);
router.delete("/:id/members/:memberId", protect, requireProjectMember, removeMember);

// NOTE: GET / (all projects) REMOVED — privacy fix.
// NOTE: POST /:id/join (open join) REMOVED — invitation-only flow.

module.exports = router;
