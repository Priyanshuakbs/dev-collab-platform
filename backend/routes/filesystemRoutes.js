// backend/routes/filesystemRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireWorkspaceMember } = require("../middleware/requireWorkspaceMember");
const {
  listTree,
  readFile,
  writeFile,
  mkdir,
  rename,
  deleteItem,
  move,
} = require("../controllers/filesystemController");

const router = express.Router({ mergeParams: true });

// All routes require authentication + workspace membership
// :workspaceId is available via mergeParams from server.js route registration

router.get("/",        protect, requireWorkspaceMember, listTree);
router.get("/read",    protect, requireWorkspaceMember, readFile);
router.post("/write",  protect, requireWorkspaceMember, writeFile);
router.post("/mkdir",  protect, requireWorkspaceMember, mkdir);
router.post("/rename", protect, requireWorkspaceMember, rename);
router.delete("/",     protect, requireWorkspaceMember, deleteItem);
router.post("/move",   protect, requireWorkspaceMember, move);

module.exports = router;
