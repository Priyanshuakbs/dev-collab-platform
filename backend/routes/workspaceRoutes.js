// backend/routes/workspaceRoutes.js

const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  addMember,
  removeMember,
} = require("../controllers/workspaceController");

// mergeParams: true — so nested routes can read parent params
const router = express.Router({ mergeParams: true });

router.post("/",                    protect, createWorkspace);
router.get("/",                     protect, getWorkspaces);
router.get("/:id",                  protect, getWorkspaceById);
router.post("/:id/members",         protect, addMember);
router.delete("/:id/members/:memberId", protect, removeMember);

module.exports = router;