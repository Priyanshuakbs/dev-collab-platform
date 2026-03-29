// backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const {
  searchUsers,
  getAllUsers,
  getUserById,
  getMyProfile,
  updateProfile,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

// Public routes
router.get("/",          protect, getAllUsers);
router.get("/search",    protect, searchUsers);

// Private — apna profile
router.get("/me",        protect, getMyProfile);
router.put("/me",        protect, updateProfile);

// Public profile by ID
router.get("/:id",       protect, getUserById);

module.exports = router;
