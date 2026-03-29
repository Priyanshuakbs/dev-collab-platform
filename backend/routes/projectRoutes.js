// backend/routes/projectRoutes.js

const express = require("express");
const router  = express.Router();
const {
  createProject,
  getProjects,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
  joinProject,
  leaveProject,
  removeMember,
} = require("../controllers/projectController");

const { protect } = require("../middleware/authMiddleware");

router.post(  "/",                       protect, createProject);
router.get(   "/",                       protect, getProjects);
router.get(   "/mine",                   protect, getMyProjects);
router.get(   "/:id",                    protect, getProjectById);
router.put(   "/:id",                    protect, updateProject);
router.delete("/:id",                    protect, deleteProject);
router.post(  "/:id/join",               protect, joinProject);
router.post(  "/:id/leave",              protect, leaveProject);
router.delete("/:id/members/:memberId",  protect, removeMember);

module.exports = router;
