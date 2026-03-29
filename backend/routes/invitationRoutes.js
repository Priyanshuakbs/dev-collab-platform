// backend/routes/invitationRoutes.js

const express = require("express");
const router  = express.Router();
const {
  sendInvite,
  getInvitations,
  getSentInvitations,
  acceptInvite,
  rejectInvite,
  cancelInvite,
} = require("../controllers/invitationController");

const { protect } = require("../middleware/authMiddleware");

router.post(  "/",              protect, sendInvite);          // invite bhejo
router.get(   "/",              protect, getInvitations);      // received invites
router.get(   "/sent",          protect, getSentInvitations);  // sent invites
router.put(   "/:id/accept",    protect, acceptInvite);        // accept
router.put(   "/:id/reject",    protect, rejectInvite);        // reject
router.delete("/:id",           protect, cancelInvite);        // cancel

module.exports = router;
