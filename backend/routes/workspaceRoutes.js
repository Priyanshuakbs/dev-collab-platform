const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
} = require("../controllers/workspaceController");

// mergeParams: true — taaki nested routes mein params mile
const router = express.Router({ mergeParams: true });

router.post("/",   protect, createWorkspace);
router.get("/",    protect, getWorkspaces);
router.get("/:id", protect, getWorkspaceById);

module.exports = router;