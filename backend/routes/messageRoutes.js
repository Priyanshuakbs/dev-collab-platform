const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  saveMessage,
  getMessages,
} = require("../controllers/messageController");

const router = express.Router();

// Save message
router.post("/", protect, saveMessage);

// Get workspace chat history
router.get("/:workspaceId", protect, getMessages);

module.exports = router;