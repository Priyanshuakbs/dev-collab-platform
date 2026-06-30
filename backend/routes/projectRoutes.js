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
  updateMemberRole,
  transferOwnership,
  generateInviteLink,
  inviteByEmail,
  cancelPendingInvite,
  acceptInviteToken,
  getProjectByWorkspace,
} = require("../controllers/projectController");

const { protect }              = require("../middleware/authMiddleware");
const { requireProjectMember } = require("../middleware/requireProjectMember");

// General accepting invite token does NOT require project membership guard (but does require auth)
router.post("/invites/accept/:token", protect, acceptInviteToken);

// Collection routes
router.post("/",         protect, createProject);   // create project
router.get("/mine",      protect, getMyProjects);   // all projects user is in
router.get("/owned",     protect, getOwnedProjects);  // projects user owns
router.get("/shared",    protect, getSharedProjects); // shared with user
router.get("/workspace/:workspaceId", protect, getProjectByWorkspace);

// Single project routes
router.get(   "/:id",                   protect, getProjectById);
router.put(   "/:id",                   protect, requireProjectMember, updateProject);
router.delete("/:id",                   protect, requireProjectMember, deleteProject);
router.post(  "/:id/leave",             protect, requireProjectMember, leaveProject);

// Member role & ownership routes
router.delete("/:id/members/:memberId",      protect, requireProjectMember, removeMember);
router.put(   "/:id/members/:memberId/role", protect, requireProjectMember, updateMemberRole);
router.post(  "/:id/transfer",               protect, requireProjectMember, transferOwnership);

// Invitation links & email invites
router.post(  "/:id/invites/link",           protect, requireProjectMember, generateInviteLink);
router.post(  "/:id/invites/email",          protect, requireProjectMember, inviteByEmail);
router.delete("/:id/invites/pending/:inviteId", protect, requireProjectMember, cancelPendingInvite);

module.exports = router;
