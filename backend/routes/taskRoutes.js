// backend/routes/taskRoutes.js

const express = require("express");
const router  = express.Router({ mergeParams: true });
const {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");

// /api/workspaces/:workspaceId/tasks
router.get(   "/",                protect, getTasks);
router.post(  "/",                protect, createTask);
router.put(   "/:taskId",         protect, updateTask);
router.patch( "/:taskId/status",  protect, updateTaskStatus);
router.delete("/:taskId",         protect, deleteTask);

module.exports = router;
