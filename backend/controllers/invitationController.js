// backend/controllers/invitationController.js

const Invitation = require("../models/Invitation");
const Project    = require("../models/Project");
const { createNotification } = require("./notificationController");

// ─── Send Invite ─────────────────────────────────────────────────────
exports.sendInvite = async (req, res) => {
  try {
    // ✅ FIX: accept both `receiver` and `receiverId` from frontend
    const receiver  = req.body.receiver || req.body.receiverId;
    const projectId = req.body.projectId;

    if (!receiver)  return res.status(400).json({ message: "Receiver is required" });
    if (!projectId) return res.status(400).json({ message: "Project is required" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // ✅ FIX: populate owner if it's not populated, then compare
    const ownerId = project.owner?._id
      ? project.owner._id.toString()
      : project.owner.toString();

    if (ownerId !== req.user._id.toString())
      return res.status(403).json({ message: "Only project owner can invite" });

    if (receiver === req.user._id.toString())
      return res.status(400).json({ message: "You cannot invite yourself" });

    const alreadyMember = (project.collaborators || [])
      .map((c) => c.toString()).includes(receiver);
    if (alreadyMember)
      return res.status(400).json({ message: "User is already a member" });

    const existing = await Invitation.findOne({
      project: projectId, receiver, status: "pending",
    });
    if (existing)
      return res.status(400).json({ message: "Invite already sent" });

    const invite = await Invitation.create({
      sender: req.user._id, receiver, project: projectId,
    });

    const populated = await invite.populate([
      { path: "sender",   select: "name email avatar" },
      { path: "receiver", select: "name email avatar" },
      { path: "project",  select: "title description" },
    ]);

    await createNotification({
      recipient: receiver,
      sender:    req.user._id,
      type:      "invitation_received",
      message:   `${populated.sender.name} invited you to join "${project.title}"`,
      link:      "/invitations",
      meta:      { projectId, projectTitle: project.title },
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error("sendInvite error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Get My Invitations (received) ──────────────────────────────────
exports.getInvitations = async (req, res) => {
  try {
    const invites = await Invitation.find({ receiver: req.user._id })
      .populate("sender",  "name email avatar")
      .populate("project", "title description techStack")
      .sort({ createdAt: -1 });
    res.json(invites);
  } catch (error) {
    console.error("getInvitations error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Sent Invitations ────────────────────────────────────────────
exports.getSentInvitations = async (req, res) => {
  try {
    const invites = await Invitation.find({ sender: req.user._id })
      .populate("receiver", "name email avatar")
      .populate("project",  "title")
      .sort({ createdAt: -1 });
    res.json(invites);
  } catch (error) {
    console.error("getSentInvitations error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Accept Invite ────────────────────────────────────────────────────
exports.acceptInvite = async (req, res) => {
  try {
    const invite = await Invitation.findById(req.params.id)
      .populate("sender",   "name")
      .populate("receiver", "name")
      .populate("project",  "title");

    if (!invite) return res.status(404).json({ message: "Invitation not found" });

    // ✅ FIX: use _id consistently (req.user._id)
    if (invite.receiver._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });
    if (invite.status !== "pending")
      return res.status(400).json({ message: `Invite already ${invite.status}` });

    invite.status = "accepted";
    await invite.save();

    const project = await Project.findById(invite.project._id);
    if (project) {
      const alreadyIn = (project.collaborators || [])
        .map((c) => c.toString()).includes(invite.receiver._id.toString());
      if (!alreadyIn) {
        project.collaborators.push(invite.receiver._id);
        await project.save();
      }
    }

    await createNotification({
      recipient: invite.sender._id,
      sender:    req.user._id,
      type:      "invitation_accepted",
      message:   `${invite.receiver.name} accepted your invite to "${invite.project.title}"`,
      link:      "/projects",
      meta:      { projectTitle: invite.project.title },
    });

    res.json({ message: "Invitation accepted! You have joined the project." });
  } catch (error) {
    console.error("acceptInvite error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Reject Invite ────────────────────────────────────────────────────
exports.rejectInvite = async (req, res) => {
  try {
    const invite = await Invitation.findById(req.params.id)
      .populate("sender",   "name")
      .populate("receiver", "name")
      .populate("project",  "title");

    if (!invite) return res.status(404).json({ message: "Invitation not found" });
    if (invite.receiver._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });
    if (invite.status !== "pending")
      return res.status(400).json({ message: `Invite already ${invite.status}` });

    invite.status = "rejected";
    await invite.save();

    await createNotification({
      recipient: invite.sender._id,
      sender:    req.user._id,
      type:      "invitation_rejected",
      message:   `${invite.receiver.name} declined your invite to "${invite.project.title}"`,
      link:      "/projects",
      meta:      { projectTitle: invite.project.title },
    });

    res.json({ message: "Invitation rejected" });
  } catch (error) {
    console.error("rejectInvite error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─── Cancel Invite ────────────────────────────────────────────────────
exports.cancelInvite = async (req, res) => {
  try {
    const invite = await Invitation.findById(req.params.id);
    if (!invite) return res.status(404).json({ message: "Invitation not found" });
    if (invite.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only sender can cancel" });

    await invite.deleteOne();
    res.json({ message: "Invitation cancelled" });
  } catch (error) {
    console.error("cancelInvite error:", error);
    res.status(500).json({ message: error.message });
  }
};