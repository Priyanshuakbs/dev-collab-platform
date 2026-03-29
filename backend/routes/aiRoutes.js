// backend/routes/aiRoutes.js

const express = require("express");
const router  = express.Router();
const { chat } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

router.post("/chat", protect, chat);

module.exports = router;
